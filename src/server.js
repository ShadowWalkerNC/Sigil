'use strict';
/**
 * src/server.js
 * Sigil GUI REST API server.
 *
 * Reads/writes the shared SQLite DB so the web dashboard can:
 *   - View bot health, logs, and service status
 *   - Read and update per-guild config
 *   - Enable/disable feature packages
 *   - Dispatch webhook events to the bot via webhook_queue
 *   - Write setup wizard config consumed by the bot on restart
 *
 * Start standalone:  node src/server.js
 * PORT defaults to process.env.GUI_PORT || 8080
 *
 * Auth: every request must include header
 *   Authorization: Bearer <GUI_SECRET>
 * Set GUI_SECRET in your Railway environment variables.
 * If GUI_SECRET is not set the server starts but warns loudly.
 */

const http    = require('http');
const url     = require('url');
const crypto  = require('crypto');
const path    = require('path');
require('dotenv').config();

const Database = require('better-sqlite3');

const PORT       = parseInt(process.env.GUI_PORT  || '8080', 10);
const SECRET     = process.env.GUI_SECRET || null;
const DB_PATH    = path.join(__dirname, '..', 'data', 'sigil.db');

if (!SECRET) {
    console.warn('[server] WARNING: GUI_SECRET is not set. All API endpoints are unprotected!');
}

// ── DB connection (WAL so bot + server can coexist) ───────────────────────────
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Ensure setup_wizard table exists (bot may not have created it yet)
db.exec(`
    CREATE TABLE IF NOT EXISTS setup_wizard (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
    );
`);

// ── Prepared statements ───────────────────────────────────────────────────────
const stmts = {
    heartbeat:       db.prepare('SELECT * FROM bot_heartbeat WHERE id = 1'),
    services:        db.prepare('SELECT * FROM service_registry ORDER BY name'),
    logs:            db.prepare('SELECT * FROM log_buffer ORDER BY id DESC LIMIT ?'),
    logsByLevel:     db.prepare('SELECT * FROM log_buffer WHERE level = ? ORDER BY id DESC LIMIT ?'),
    getConfig:       db.prepare('SELECT * FROM guild_config WHERE guild_id = ?'),
    allConfigs:      db.prepare('SELECT guild_id, packages_disabled FROM guild_config'),
    upsertConfig:    db.prepare(`
        INSERT INTO guild_config (guild_id, packages_disabled)
        VALUES (@guild_id, @packages_disabled)
        ON CONFLICT(guild_id) DO UPDATE SET
            packages_disabled = excluded.packages_disabled
    `),
    queueWebhook:    db.prepare(`
        INSERT INTO webhook_queue (type, guild_id, payload)
        VALUES (@type, @guild_id, @payload)
    `),
    queueStatus:     db.prepare('SELECT COUNT(*) as pending FROM webhook_queue WHERE processed = 0'),
    wizardGet:       db.prepare('SELECT key, value FROM setup_wizard'),
    wizardSet:       db.prepare(`
        INSERT INTO setup_wizard (key, value) VALUES (@key, @value)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `),
    wizardClear:     db.prepare('DELETE FROM setup_wizard'),
    giveaways:       db.prepare('SELECT * FROM giveaways WHERE guild_id = ? ORDER BY ends_at DESC LIMIT 20'),
    reminders:       db.prepare('SELECT * FROM reminders WHERE guild_id = ? AND done = 0 ORDER BY remind_at ASC LIMIT 50'),
    autoroles:       db.prepare('SELECT role_id FROM autorole WHERE guild_id = ?'),
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function json(res, status, data) {
    const body = JSON.stringify(data);
    res.writeHead(status, {
        'Content-Type':                'application/json',
        'Content-Length':              Buffer.byteLength(body),
        'Access-Control-Allow-Origin': process.env.GUI_URL || '*',
        'Access-Control-Allow-Headers':'Authorization, Content-Type',
        'Access-Control-Allow-Methods':'GET, POST, PUT, DELETE, OPTIONS',
    });
    res.end(body);
}

function readBody(req) {
    return new Promise((resolve, reject) => {
        let data = '';
        req.on('data', c => { data += c; if (data.length > 1_000_000) req.destroy(); });
        req.on('end',  () => {
            try { resolve(data ? JSON.parse(data) : {}); }
            catch { reject(new Error('Invalid JSON')); }
        });
        req.on('error', reject);
    });
}

function auth(req, res) {
    if (!SECRET) return true; // No secret set — allow all (warns on startup)
    const header = req.headers['authorization'] || '';
    const token  = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!crypto.timingSafeEqual(Buffer.from(token), Buffer.from(SECRET))) {
        json(res, 401, { error: 'Unauthorized' });
        return false;
    }
    return true;
}

// ── Router ────────────────────────────────────────────────────────────────────
async function router(req, res) {
    const { pathname, query } = url.parse(req.url, true);
    const method = req.method.toUpperCase();

    // CORS preflight
    if (method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Origin':  process.env.GUI_URL || '*',
            'Access-Control-Allow-Headers': 'Authorization, Content-Type',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        });
        return res.end();
    }

    // Health check — no auth required
    if (method === 'GET' && pathname === '/health') {
        return json(res, 200, { ok: true, ts: Date.now() });
    }

    if (!auth(req, res)) return;

    try {
        // ── GET /api/status ─────────────────────────────────────────────────
        if (method === 'GET' && pathname === '/api/status') {
            const heartbeat = stmts.heartbeat.get() ?? null;
            const services  = stmts.services.all().map(s => ({
                ...s,
                meta:    JSON.parse(s.meta    || '{}'),
                options: JSON.parse(s.options || '{}'),
            }));
            const pending = stmts.queueStatus.get().pending;
            return json(res, 200, { heartbeat, services, webhookQueuePending: pending });
        }

        // ── GET /api/logs?limit=100&level=error ─────────────────────────────
        if (method === 'GET' && pathname === '/api/logs') {
            const limit = Math.min(parseInt(query.limit || '100', 10), 500);
            const level = query.level || null;
            const rows  = level
                ? stmts.logsByLevel.all(level, limit)
                : stmts.logs.all(limit);
            return json(res, 200, { logs: rows });
        }

        // ── GET /api/config/:guildId ─────────────────────────────────────────
        const configMatch = pathname.match(/^\/api\/config\/([^/]+)$/);
        if (method === 'GET' && configMatch) {
            const guildId = configMatch[1];
            const row = stmts.getConfig.get(guildId);
            if (!row) return json(res, 404, { error: 'Guild not found' });
            return json(res, 200, {
                ...row,
                packages_disabled: JSON.parse(row.packages_disabled || '[]'),
            });
        }

        // ── PUT /api/config/:guildId ─────────────────────────────────────────
        if (method === 'PUT' && configMatch) {
            const guildId = configMatch[1];
            const body    = await readBody(req);
            const current = stmts.getConfig.get(guildId) || { packages_disabled: '[]' };
            const disabled = body.packages_disabled ?? JSON.parse(current.packages_disabled || '[]');
            stmts.upsertConfig.run({
                guild_id:           guildId,
                packages_disabled:  JSON.stringify(disabled),
            });
            return json(res, 200, { ok: true, guild_id: guildId, packages_disabled: disabled });
        }

        // ── GET /api/configs — all guilds ────────────────────────────────────
        if (method === 'GET' && pathname === '/api/configs') {
            const rows = stmts.allConfigs.all().map(r => ({
                ...r,
                packages_disabled: JSON.parse(r.packages_disabled || '[]'),
            }));
            return json(res, 200, { guilds: rows });
        }

        // ── POST /api/packages/:guildId ──────────────────────────────────────
        // Body: { action: 'enable'|'disable', package: 'faith' }
        const pkgMatch = pathname.match(/^\/api\/packages\/([^/]+)$/);
        if (method === 'POST' && pkgMatch) {
            const guildId = pkgMatch[1];
            const body    = await readBody(req);
            const { action, package: pkg } = body;
            if (!action || !pkg) return json(res, 400, { error: 'action and package are required' });
            if (!['enable','disable'].includes(action)) return json(res, 400, { error: 'action must be enable or disable' });

            const row      = stmts.getConfig.get(guildId) || { packages_disabled: '[]' };
            let   disabled = JSON.parse(row.packages_disabled || '[]');

            if (action === 'disable' && !disabled.includes(pkg)) disabled.push(pkg);
            if (action === 'enable')  disabled = disabled.filter(k => k !== pkg);

            stmts.upsertConfig.run({ guild_id: guildId, packages_disabled: JSON.stringify(disabled) });
            return json(res, 200, { ok: true, guild_id: guildId, action, package: pkg, packages_disabled: disabled });
        }

        // ── POST /api/webhook ────────────────────────────────────────────────
        // Body: { type: 'twitch.live'|'youtube.upload'|'github.push', guild_id, payload: {} }
        if (method === 'POST' && pathname === '/api/webhook') {
            const body = await readBody(req);
            const { type, guild_id, payload } = body;
            if (!type || !guild_id) return json(res, 400, { error: 'type and guild_id are required' });
            const id = stmts.queueWebhook.run({
                type,
                guild_id,
                payload: JSON.stringify(payload || {}),
            }).lastInsertRowid;
            return json(res, 202, { ok: true, queued: id });
        }

        // ── GET /api/setup ───────────────────────────────────────────────────
        if (method === 'GET' && pathname === '/api/setup') {
            const rows = stmts.wizardGet.all();
            const data = Object.fromEntries(rows.map(r => [r.key, JSON.parse(r.value)]));
            return json(res, 200, { setup: data });
        }

        // ── POST /api/setup ──────────────────────────────────────────────────
        // Body: { packages: ['faith','xp'], channels: { welcome: '123', mod: '456' } }
        if (method === 'POST' && pathname === '/api/setup') {
            const body = await readBody(req);
            const upsert = db.transaction((entries) => {
                for (const [key, value] of entries) {
                    stmts.wizardSet.run({ key, value: JSON.stringify(value) });
                }
            });
            upsert(Object.entries(body));
            return json(res, 200, { ok: true, saved: Object.keys(body) });
        }

        // ── DELETE /api/setup ────────────────────────────────────────────────
        if (method === 'DELETE' && pathname === '/api/setup') {
            stmts.wizardClear.run();
            return json(res, 200, { ok: true });
        }

        // ── GET /api/guild/:guildId/giveaways ────────────────────────────────
        const gaMatch = pathname.match(/^\/api\/guild\/([^/]+)\/giveaways$/);
        if (method === 'GET' && gaMatch) {
            const rows = stmts.giveaways.all(gaMatch[1]);
            return json(res, 200, { giveaways: rows });
        }

        // ── GET /api/guild/:guildId/reminders ────────────────────────────────
        const rmMatch = pathname.match(/^\/api\/guild\/([^/]+)\/reminders$/);
        if (method === 'GET' && rmMatch) {
            const rows = stmts.reminders.all(rmMatch[1]);
            return json(res, 200, { reminders: rows });
        }

        // ── GET /api/guild/:guildId/autoroles ────────────────────────────────
        const arMatch = pathname.match(/^\/api\/guild\/([^/]+)\/autoroles$/);
        if (method === 'GET' && arMatch) {
            const rows = stmts.autoroles.all(arMatch[1]);
            return json(res, 200, { autoroles: rows.map(r => r.role_id) });
        }

        return json(res, 404, { error: 'Not found' });

    } catch (err) {
        console.error('[server] Error:', err.message);
        return json(res, 500, { error: err.message });
    }
}

// ── Start ─────────────────────────────────────────────────────────────────────
const server = http.createServer(router);
server.listen(PORT, () => {
    console.log(`[server] Sigil GUI API listening on port ${PORT}`);
    if (!SECRET) console.warn('[server] Set GUI_SECRET to protect your API endpoints.');
});

module.exports = server;
