// gui-server.js — Sigil GUI bridge server v2.7
// Run with: node gui/gui-server.js

const express    = require('express');
const path       = require('path');
const http       = require('http');
const { spawn }  = require('child_process');
const crypto     = require('crypto');
const rateLimit  = require('express-rate-limit');
const { WebSocketServer } = require('ws');
const { createCanvas, loadImage } = require('canvas');
const { renderKit, registerAllFonts } = require('../src/utils/canvas.js');
const { getBackgroundById } = require('../src/utils/backgrounds.js');
const { getConfig }  = require('../src/utils/db.js');
const { verifyHmac } = require('../src/utils/hmac.js');
const { handleTwitchLive, handleYouTubeUpload, handleGitHubPush } = require('../src/automation/webhookHandler.js');
const { enablePackage, disablePackage, getAllPackageStates } = require('../src/utils/packages.js');
const { guiAuthMiddleware } = require('../src/utils/guiAuth.js');
const { assertSafeUrl }    = require('../src/utils/ssrfGuard.js');
const { enqueueWebhook }   = require('../src/utils/webhookQueue.js');
const logBuffer  = require('../src/util/logBuffer.js');
const Database   = require('better-sqlite3');
require('dotenv').config();

// Patch console so all gui-server output flows through the in-process ring buffer
logBuffer.patch();

registerAllFonts();

const app       = express();
const server    = http.createServer(app);
const PORT      = Number(process.env.PORT) || 8080;
const START_TS  = Date.now();
const VERSION   = '2.7.0';

// ── SQLite IPC bridge (read-only, single shared connection) ───────────────────
const DB_PATH = path.join(__dirname, '..', 'data', 'sigil.db');

// Single persistent read-only connection — avoids opening/closing per request
let _ipcDb = null;
function getIpcDb() {
    if (_ipcDb) return _ipcDb;
    try {
        _ipcDb = new Database(DB_PATH, { readonly: true, fileMustExist: true });
        return _ipcDb;
    } catch {
        return null;
    }
}

function readBotHeartbeat() {
    const ipc = getIpcDb();
    if (!ipc) return null;
    try { return ipc.prepare('SELECT * FROM bot_heartbeat WHERE id = 1').get() ?? null; }
    catch (err) { console.warn('[IPC] readBotHeartbeat:', err.message); return null; }
}

function readServiceRegistry() {
    const ipc = getIpcDb();
    if (!ipc) return [];
    try {
        return ipc.prepare('SELECT * FROM service_registry').all().map(row => ({
            name:          row.name,
            status:        row.status,
            lastHeartbeat: row.last_heartbeat,
            lastError:     row.last_error,
            errorCount:    row.error_count,
            meta:          JSON.parse(row.meta    || '{}'),
            options:       JSON.parse(row.options || '{}'),
        }));
    } catch (err) { console.warn('[IPC] readServiceRegistry:', err.message); return []; }
}

function readLogBuffer(n = 50, level = null) {
    const ipc = getIpcDb();
    if (!ipc) return [];
    try {
        const safeN = Math.max(1, Math.min(500, n));
        if (level) {
            return ipc.prepare(
                'SELECT ts, level, text FROM log_buffer WHERE level = ? ORDER BY id DESC LIMIT ?'
            ).all(level, safeN).reverse();
        }
        return ipc.prepare(
            'SELECT ts, level, text FROM log_buffer ORDER BY id DESC LIMIT ?'
        ).all(safeN).reverse();
    } catch (err) { console.warn('[IPC] readLogBuffer:', err.message); return []; }
}

const BOT_STALE_MS = 90_000;

const STREAM_URL = (process.env.STREAM_SERVER_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
const AI_ENABLED = false;

// ── Raw body capture BEFORE json middleware (needed for HMAC) ────────────────
app.use((req, res, next) => {
    if (req.path === '/webhook/trigger') {
        let data = [];
        req.on('data', chunk => data.push(chunk));
        req.on('end', () => {
            req.rawBody = Buffer.concat(data);
            try { req.body = JSON.parse(req.rawBody.toString()); }
            catch { req.body = {}; }
            next();
        });
    } else {
        next();
    }
});

// Apply a smaller body limit to non-render endpoints
app.use((req, res, next) => {
    const isRenderPath = ['/preview', '/preview/welcome', '/preview/rankcard', '/preview/serverstats'].includes(req.path);
    express.json({ limit: isRenderPath ? '4mb' : '32kb' })(req, res, next);
});

// ── Rate limiting ────────────────────────────────────────────────────────────
const renderLimiter  = rateLimit({ windowMs: 60_000, max: 20, standardHeaders: true, legacyHeaders: false, message: { ok: false, error: 'Too many requests.' } });
const webhookLimiter = rateLimit({ windowMs: 60_000, max: 60, standardHeaders: true, legacyHeaders: false, message: { ok: false, error: 'Rate limit exceeded.' } });
const apiLimiter     = rateLimit({ windowMs: 60_000, max: 60, standardHeaders: true, legacyHeaders: false, message: { ok: false, error: 'Rate limit exceeded.' } });
const mediaLimiter   = rateLimit({ windowMs: 60_000, max: 30, standardHeaders: true, legacyHeaders: false, message: { ok: false, error: 'Media rate limit exceeded.' } });
const controlLimiter = rateLimit({ windowMs: 60_000, max: 5,  standardHeaders: true, legacyHeaders: false, message: { ok: false, error: 'Rate limit exceeded.' } });
const setupLimiter   = rateLimit({ windowMs: 60_000, max: 10, standardHeaders: true, legacyHeaders: false, message: { ok: false, error: 'Too many setup requests.' } });
const authLimiter    = rateLimit({ windowMs: 60_000, max: 10, standardHeaders: true, legacyHeaders: false, message: { ok: false, error: 'Too many auth attempts.' } });

// ── Static pages (no auth required) ──────────────────────────────────────────
app.get('/',           (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/brand',      (req, res) => res.sendFile(path.join(__dirname, 'sigil-gui-builder.html')));
app.get('/community',  (req, res) => res.sendFile(path.join(__dirname, 'sigil-community.html')));
app.get('/developers', (req, res) => res.sendFile(path.join(__dirname, 'developers.html')));
app.get('/packages',   (req, res) => res.sendFile(path.join(__dirname, 'packages.html')));
app.get('/status',     (req, res) => res.sendFile(path.join(__dirname, 'status.html')));
app.get('/setup',      (req, res) => res.sendFile(path.join(__dirname, 'setup.html')));
app.get('/login',      (req, res) => res.sendFile(path.join(__dirname, 'login.html')));

// Serve auth helper — no auth required (bootstraps the session itself)
app.get('/auth.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    res.sendFile(path.join(__dirname, 'auth.js'));
});

// ── POST /auth/token — validate a GUI token (used by login.html) ──────────────
app.post('/auth/token', authLimiter, (req, res) => {
    const provided  = String(req.body?.token || '').trim();
    const guiSecret = process.env.GUI_AUTH_TOKEN || '';
    if (!guiSecret)
        return res.status(503).json({ ok: false, error: 'GUI_AUTH_TOKEN is not configured on this server.' });
    if (!provided || provided.length < 8)
        return res.status(400).json({ ok: false, error: 'Token is too short.' });
    let valid = false;
    try {
        const a = Buffer.from(provided);
        const b = Buffer.from(guiSecret);
        if (a.length === b.length) valid = crypto.timingSafeEqual(a, b);
    } catch { valid = false; }
    if (!valid)
        return res.status(401).json({ ok: false, error: 'Invalid token.' });
    res.json({ ok: true });
});

// ── GET /auth/discord — redirect to Discord OAuth ─────────────────────────────
app.get('/auth/discord', (req, res) => {
    const oauthUrl = process.env.DISCORD_OAUTH_URL || '';
    const returnTo = String(req.query.return || '/').replace(/[^a-zA-Z0-9/_-]/g, '');
    if (oauthUrl) {
        const url = new URL(oauthUrl);
        url.searchParams.set('state', returnTo);
        return res.redirect(302, url.toString());
    }
    // No OAuth configured — send to token login page
    res.redirect(302, `/login?return=${encodeURIComponent(returnTo)}`);
});

// ── GET /auth/discord/callback — exchange OAuth code for token ────────────────
app.get('/auth/discord/callback', authLimiter, async (req, res) => {
    const code     = String(req.query.code     || '').trim();
    const returnTo = String(req.query.state    || '/').replace(/[^a-zA-Z0-9/_-]/g, '') || '/';

    const clientId     = process.env.DISCORD_CLIENT_ID     || '';
    const clientSecret = process.env.DISCORD_CLIENT_SECRET || '';
    const redirectUri  = process.env.DISCORD_REDIRECT_URI  || `http://localhost:${PORT}/auth/discord/callback`;
    const guiSecret    = process.env.GUI_AUTH_TOKEN         || '';

    if (!code)
        return res.redirect(302, `/login?return=${encodeURIComponent(returnTo)}&error=missing_code`);
    if (!clientId || !clientSecret)
        return res.redirect(302, `/login?return=${encodeURIComponent(returnTo)}&error=oauth_not_configured`);

    try {
        // Exchange code for Discord access token
        const tokenRes = await fetch('https://discord.com/api/v10/oauth2/token', {
            method:  'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body:    new URLSearchParams({
                client_id:     clientId,
                client_secret: clientSecret,
                grant_type:    'authorization_code',
                code,
                redirect_uri:  redirectUri,
            }),
        });

        if (!tokenRes.ok) {
            console.warn('[OAuth] Discord token exchange failed:', tokenRes.status);
            return res.redirect(302, `/login?return=${encodeURIComponent(returnTo)}&error=oauth_failed`);
        }

        // Verify the Discord user is in the allowed guild (optional — uses DISCORD_GUILD_ID env)
        const { access_token } = await tokenRes.json();
        const userRes = await fetch('https://discord.com/api/v10/users/@me', {
            headers: { Authorization: `Bearer ${access_token}` },
        });
        if (!userRes.ok) {
            console.warn('[OAuth] Discord user fetch failed:', userRes.status);
            return res.redirect(302, `/login?return=${encodeURIComponent(returnTo)}&error=user_fetch_failed`);
        }
        const user = await userRes.json();
        console.log(`[OAuth] Authenticated: ${user.username} (${user.id})`);

        // Use GUI_AUTH_TOKEN as the session token (passed back to the client via ?token=)
        // This keeps the auth model simple — all GUI access = same shared token.
        if (!guiSecret) {
            console.warn('[OAuth] GUI_AUTH_TOKEN not set — cannot issue session token.');
            return res.redirect(302, `/login?return=${encodeURIComponent(returnTo)}&error=no_gui_token`);
        }

        // Redirect to the return path with the session token in the URL
        // auth.js will strip this from the URL and store it in sessionStorage.
        const dest = new URL(returnTo, `http://localhost:${PORT}`);
        dest.searchParams.set('token', guiSecret);
        return res.redirect(302, dest.pathname + dest.search);

    } catch (err) {
        console.error('[OAuth] Callback error:', err.message);
        return res.redirect(302, `/login?return=${encodeURIComponent(returnTo)}&error=server_error`);
    }
});

app.get('/health',     (req, res) => {
    // Unauthenticated — used by Railway health checks
    const botReady = typeof global.sigilClient !== 'undefined' && global.sigilClient?.isReady?.();
    res.json({ ok: true, version: VERSION, ai_enabled: AI_ENABLED, bot_ready: botReady });
});

// ── Auth middleware applied to ALL /api/* routes ──────────────────────────────
// Render endpoints (/preview/*) also require auth since they're resource-heavy.
app.use('/api',     guiAuthMiddleware);
app.use('/preview', guiAuthMiddleware);

// ── GET /api/packages ────────────────────────────────────────────────────────
app.get('/api/packages', apiLimiter, (req, res) => {
    try {
        const guildId = String(req.query.guild_id || '').trim();
        if (!guildId || !/^\d{17,20}$/.test(guildId))
            return res.status(400).json({ ok: false, error: 'Invalid or missing guild_id.' });
        const packages = getAllPackageStates(guildId);
        const disabled = packages.filter(p => !p.enabled).map(p => p.key);
        res.json({ ok: true, guild_id: guildId, disabled, packages });
    } catch (err) { console.error('[GET /api/packages]', err); res.status(500).json({ ok: false, error: 'Internal error.' }); }
});

// ── POST /api/packages ───────────────────────────────────────────────────────
app.post('/api/packages', apiLimiter, (req, res) => {
    try {
        const { guild_id, package: pkgKey, enabled } = req.body || {};
        if (!guild_id || !/^\d{17,20}$/.test(String(guild_id)))
            return res.status(400).json({ ok: false, error: 'Invalid or missing guild_id.' });
        if (!pkgKey || typeof pkgKey !== 'string')
            return res.status(400).json({ ok: false, error: 'Missing package key.' });
        if (typeof enabled !== 'boolean')
            return res.status(400).json({ ok: false, error: '"enabled" must be a boolean.' });
        const result = enabled ? enablePackage(String(guild_id), pkgKey) : disablePackage(String(guild_id), pkgKey);
        if (result === 'unknown') return res.status(400).json({ ok: false, error: `Unknown package: "${pkgKey}".` });
        res.json({ ok: true, package: pkgKey, enabled, result });
    } catch (err) { console.error('[POST /api/packages]', err); res.status(500).json({ ok: false, error: 'Internal error.' }); }
});

// ╔══════════════════════════════════════════════════════════════════╗
// ║            SETUP WIZARD — /api/setup/*                          ║
// ╚══════════════════════════════════════════════════════════════════╝

app.post('/api/setup/validate-token', setupLimiter, async (req, res) => {
    const { token, clientId } = req.body || {};

    if (!token || typeof token !== 'string' || token.trim().length < 20)
        return res.status(400).json({ ok: false, error: 'Missing or invalid token.' });
    if (!clientId || !/^\d{17,20}$/.test(String(clientId).trim()))
        return res.status(400).json({ ok: false, error: 'Missing or invalid clientId.' });

    try {
        const discordRes = await fetch('https://discord.com/api/v10/users/@me', {
            headers: { Authorization: `Bot ${token.trim()}` },
        });

        if (discordRes.status === 401)
            return res.json({ ok: false, error: 'Invalid token — Discord rejected it.' });
        if (!discordRes.ok)
            return res.json({ ok: false, error: `Discord returned HTTP ${discordRes.status}.` });

        const user = await discordRes.json();
        if (user.id && String(user.id) !== String(clientId).trim()) {
            return res.json({
                ok: false,
                error: `Token is valid but belongs to application ${user.id}, not ${clientId}. Check your Client ID.`,
            });
        }

        const tag = user.username + (user.discriminator && user.discriminator !== '0' ? `#${user.discriminator}` : '');
        console.log(`[setup] Token validated for ${tag} (${user.id})`);
        res.json({ ok: true, tag, id: user.id });
    } catch (err) {
        console.error('[POST /api/setup/validate-token]', err.message);
        res.status(500).json({ ok: false, error: 'Could not reach Discord API.' });
    }
});

app.post('/api/setup/save-config', setupLimiter, (req, res) => {
    try {
        const { packages = [], channels = {} } = req.body || {};

        const VALID_PKGS = new Set(['brand','moderation','community','xp','scheduler','integrations','faith','culinaryos']);
        const safePkgs   = (Array.isArray(packages) ? packages : []).filter(p => VALID_PKGS.has(p));

        const safeChannels = {};
        for (const [key, val] of Object.entries(channels)) {
            const v = String(val || '').trim();
            if (v && /^\d{17,20}$/.test(v)) safeChannels[key] = v;
        }

        const db = new Database(DB_PATH);
        db.prepare(`
            CREATE TABLE IF NOT EXISTS setup_wizard (
                key   TEXT PRIMARY KEY,
                value TEXT NOT NULL,
                ts    INTEGER NOT NULL DEFAULT (unixepoch())
            )
        `).run();

        const upsert = db.prepare(`
            INSERT INTO setup_wizard (key, value, ts)
            VALUES (?, ?, unixepoch())
            ON CONFLICT(key) DO UPDATE SET value = excluded.value, ts = excluded.ts
        `);
        upsert.run('packages', JSON.stringify(safePkgs));
        upsert.run('channels', JSON.stringify(safeChannels));
        db.close();

        console.log(`[setup] Config saved — packages: [${safePkgs.join(', ')}], channels: ${Object.keys(safeChannels).length} entries`);
        res.json({ ok: true, packages: safePkgs, channels: safeChannels });
    } catch (err) {
        console.error('[POST /api/setup/save-config]', err);
        res.status(500).json({ ok: false, error: 'Failed to save config.' });
    }
});

// ╔══════════════════════════════════════════════════════════════════╗
// ║                  MEDIA PACKAGE — /api/media/*                   ║
// ╚══════════════════════════════════════════════════════════════════╝

function proxyToStream(streamPath, body) {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify(body);
        const url     = new URL(streamPath, STREAM_URL);
        const options = {
            method: 'POST', hostname: url.hostname, port: url.port || 8000, path: url.pathname,
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
        };
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
                catch { resolve({ status: res.statusCode, body: { ok: false, error: 'Non-JSON response.' } }); }
            });
        });
        req.setTimeout(8000, () => { req.destroy(); reject(new Error('Stream server timeout')); });
        req.on('error', reject);
        req.write(payload); req.end();
    });
}

function proxyGetToStream(streamPath) {
    return new Promise((resolve, reject) => {
        const url     = new URL(streamPath, STREAM_URL);
        const options = {
            method: 'GET', hostname: url.hostname, port: url.port || 8000,
            path: url.pathname + (url.search || ''),
        };
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
                catch { resolve({ status: res.statusCode, body: { ok: false, error: 'Non-JSON response.' } }); }
            });
        });
        req.setTimeout(8000, () => { req.destroy(); reject(new Error('Stream server timeout')); });
        req.on('error', reject); req.end();
    });
}

app.post('/api/media/enqueue', mediaLimiter, async (req, res) => {
    try {
        const { url, mode = 1, cols, vol = 1, pixel = false, loop = false } = req.body || {};
        if (!url || typeof url !== 'string' || !url.trim())
            return res.status(400).json({ ok: false, error: 'Missing or invalid "url".' });
        try { await assertSafeUrl(url.trim()); }
        catch (ssrfErr) { return res.status(400).json({ ok: false, error: ssrfErr.message }); }
        const result = await proxyToStream('/api/enqueue', { url: url.trim(), mode, cols, vol, pixel, loop });
        res.status(result.status).json(result.body);
    } catch (err) { console.error('[POST /api/media/enqueue]', err); res.status(503).json({ ok: false, error: 'Stream server unreachable. Is ASCILINE running?' }); }
});

app.post('/api/media/skip', mediaLimiter, async (req, res) => {
    try { const r = await proxyToStream('/api/skip', {}); res.status(r.status).json(r.body); }
    catch (err) { console.error('[POST /api/media/skip]', err); res.status(503).json({ ok: false, error: 'Stream server unreachable.' }); }
});

app.post('/api/media/stop', mediaLimiter, async (req, res) => {
    try { const r = await proxyToStream('/api/stop', {}); res.status(r.status).json(r.body); }
    catch (err) { console.error('[POST /api/media/stop]', err); res.status(503).json({ ok: false, error: 'Stream server unreachable.' }); }
});

app.post('/api/media/seek', mediaLimiter, async (req, res) => {
    try {
        const time = Number(req.body?.time ?? -1);
        if (time < 0) return res.status(400).json({ ok: false, error: '"time" must be >= 0.' });
        const r = await proxyToStream('/api/seek', { time }); res.status(r.status).json(r.body);
    } catch (err) { console.error('[POST /api/media/seek]', err); res.status(503).json({ ok: false, error: 'Stream server unreachable.' }); }
});

app.post('/api/media/volume', mediaLimiter, async (req, res) => {
    try {
        const vol = Number(req.body?.vol ?? -1);
        if (vol < 0 || vol > 5) return res.status(400).json({ ok: false, error: '"vol" must be 0-5.' });
        const r = await proxyToStream('/api/volume', { vol }); res.status(r.status).json(r.body);
    } catch (err) { console.error('[POST /api/media/volume]', err); res.status(503).json({ ok: false, error: 'Stream server unreachable.' }); }
});

app.post('/api/media/loop', mediaLimiter, async (req, res) => {
    try {
        const enabled = req.body?.enabled;
        if (typeof enabled !== 'boolean') return res.status(400).json({ ok: false, error: '"enabled" must be a boolean.' });
        const r = await proxyToStream('/api/loop', { enabled }); res.status(r.status).json(r.body);
    } catch (err) { console.error('[POST /api/media/loop]', err); res.status(503).json({ ok: false, error: 'Stream server unreachable.' }); }
});

app.post('/api/media/mode', mediaLimiter, async (req, res) => {
    try {
        const mode = Number(req.body?.mode ?? 0);
        if (!mode || mode < 1 || mode > 5) return res.status(400).json({ ok: false, error: '"mode" must be 1-5.' });
        const r = await proxyToStream('/api/mode', { mode }); res.status(r.status).json(r.body);
    } catch (err) { console.error('[POST /api/media/mode]', err); res.status(503).json({ ok: false, error: 'Stream server unreachable.' }); }
});

app.post('/api/media/cols', mediaLimiter, async (req, res) => {
    try {
        const cols = Number(req.body?.cols ?? 0);
        if (!cols || cols < 40 || cols > 500) return res.status(400).json({ ok: false, error: '"cols" must be 40-500.' });
        const r = await proxyToStream('/api/cols', { cols }); res.status(r.status).json(r.body);
    } catch (err) { console.error('[POST /api/media/cols]', err); res.status(503).json({ ok: false, error: 'Stream server unreachable.' }); }
});

app.get('/api/media/status', mediaLimiter, async (req, res) => {
    try { const r = await proxyGetToStream('/api/status'); res.status(r.status).json(r.body); }
    catch (err) { console.error('[GET /api/media/status]', err); res.status(503).json({ ok: false, error: 'Stream server unreachable. Is ASCILINE running?' }); }
});

app.get('/api/media/queue', mediaLimiter, async (req, res) => {
    try { const r = await proxyGetToStream('/api/queue'); res.status(r.status).json(r.body); }
    catch (err) { console.error('[GET /api/media/queue]', err); res.status(503).json({ ok: false, error: 'Stream server unreachable.' }); }
});

// ╔══════════════════════════════════════════════════════════════════╗
// ║              LOGS — /api/logs + WebSocket /ws/logs              ║
// ╚══════════════════════════════════════════════════════════════════╝

app.get('/api/logs', apiLimiter, (req, res) => {
    const n     = Math.max(1, Math.min(500, parseInt(req.query.tail || '50', 10)));
    const level = ['info', 'warn', 'error'].includes(req.query.level) ? req.query.level : null;
    const guiLines = logBuffer.tail(n, level);
    const botLines = readLogBuffer(n, level);
    const seen = new Set();
    const merged = [...guiLines, ...botLines]
        .filter(l => { const k = `${l.ts}|${l.text}`; if (seen.has(k)) return false; seen.add(k); return true; })
        .sort((a, b) => a.ts - b.ts)
        .slice(-n);
    res.json({ ok: true, lines: merged });
});

// WebSocket logs — auth via ?token= query param
const wssLogs = new WebSocketServer({ noServer: true });

wssLogs.on('connection', (ws, req) => {
    const params   = new URLSearchParams((req.url || '').replace(/^\/ws\/logs/, '').replace(/^\?/, ''));
    const level    = ['info', 'warn', 'error'].includes(params.get('level')) ? params.get('level') : null;
    const listener = (entry) => {
        if (level && entry.level !== level) return;
        if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(entry));
    };
    logBuffer.subscribe(listener);
    ws.on('close', () => logBuffer.unsubscribe(listener));
    ws.on('error', () => logBuffer.unsubscribe(listener));
});

server.on('upgrade', (req, socket, head) => {
    if (req.url.startsWith('/ws/logs')) {
        const guiSecret = process.env.GUI_AUTH_TOKEN || '';
        const params    = new URLSearchParams((req.url || '').split('?')[1] || '');
        const provided  = String(params.get('token') || '').trim();
        if (!guiSecret || !provided) {
            socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
            socket.destroy();
            return;
        }
        let valid = false;
        try {
            const a = Buffer.from(provided);
            const b = Buffer.from(guiSecret);
            if (a.length === b.length) valid = crypto.timingSafeEqual(a, b);
        } catch { valid = false; }
        if (!valid) {
            socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
            socket.destroy();
            return;
        }
        wssLogs.handleUpgrade(req, socket, head, (ws) => wssLogs.emit('connection', ws, req));
    } else {
        socket.destroy();
    }
});

// ╔══════════════════════════════════════════════════════════════════╗
// ║              STATUS — GET /api/status/full                      ║
// ╚══════════════════════════════════════════════════════════════════╝

app.get('/api/status/full', apiLimiter, async (req, res) => {
    const result = { ok: true };
    result.gui = { ok: true, reachable: true, version: VERSION, uptime_ms: Date.now() - START_TS };
    const hb = readBotHeartbeat();
    if (hb && (Date.now() - hb.ts) < BOT_STALE_MS) {
        result.bot = { ok: true, reachable: true, guilds: hb.guilds, latency: hb.latency, tag: hb.tag };
    } else {
        result.bot = { ok: false, reachable: false, last_seen_ms: hb ? Date.now() - hb.ts : null };
    }
    try {
        const { body } = await proxyGetToStream('/api/status');
        result.asciline = { ok: true, reachable: true, playing: !!(body.current || body.playing), mode: body.mode ?? null, cols: body.cols ?? null, queue_len: body.queue_length ?? body.queue?.length ?? 0 };
    } catch { result.asciline = { ok: false, reachable: false }; }
    result.services    = readServiceRegistry();
    result.services_ok = result.services.filter(s => s.status !== 'ok' && s.status !== 'starting').length === 0;
    const lastErrors   = readLogBuffer(1, 'error');
    result.last_error  = lastErrors.length ? lastErrors[0] : null;
    result.ok          = result.bot.ok && result.services_ok;
    res.json(result);
});

// ╔══════════════════════════════════════════════════════════════════╗
// ║          CONTROL — POST /api/control/*                          ║
// ╚══════════════════════════════════════════════════════════════════╝

function requireControlSecret(req, res) {
    const secret   = process.env.CONTROL_SECRET || '';
    const provided = String(req.headers['x-control-secret'] || '').trim();
    if (!secret)
        return res.status(503).json({ ok: false, error: 'CONTROL_SECRET is not configured — endpoint disabled.' });
    if (!provided) {
        res.status(401).json({ ok: false, error: 'Missing x-control-secret header.' });
        return false;
    }
    let valid = false;
    try {
        const a = Buffer.from(provided);
        const b = Buffer.from(secret);
        if (a.length === b.length) valid = crypto.timingSafeEqual(a, b);
    } catch { valid = false; }
    if (!valid) {
        res.status(401).json({ ok: false, error: 'Invalid x-control-secret.' });
        return false;
    }
    return null;
}

app.post('/api/control/restart', controlLimiter, (req, res) => {
    const fail = requireControlSecret(req, res);
    if (fail !== null) return;
    res.json({ ok: true, message: 'Restart signal accepted. Process exiting now.' });
    res.on('finish', () => {
        console.log('[GUI] Restart requested via /api/control/restart — exiting.');
        gracefulShutdown('restart');
    });
});

app.post('/api/control/deploy-commands', controlLimiter, (req, res) => {
    const fail = requireControlSecret(req, res);
    if (fail !== null) return;

    const deployScript = path.join(__dirname, '..', 'src', 'deploy-commands.js');

    res.setHeader('Content-Type', 'application/x-ndjson');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('Cache-Control', 'no-cache');
    res.flushHeaders();

    const sendLine = (level, text) => {
        try { res.write(JSON.stringify({ level, text }) + '\n'); } catch (_) {}
    };

    sendLine('info', '▸ Spawning deploy-commands.js…');

    let child;
    try {
        child = spawn(process.execPath, [deployScript], {
            env:   { ...process.env },
            stdio: ['ignore', 'pipe', 'pipe'],
        });
    } catch (err) {
        sendLine('err', `✗ Failed to spawn: ${err.message}`);
        res.end();
        return;
    }

    child.stdout.on('data', chunk => {
        chunk.toString().split('\n').filter(Boolean).forEach(line => sendLine('info', line));
    });
    child.stderr.on('data', chunk => {
        chunk.toString().split('\n').filter(Boolean).forEach(line => sendLine('warn', line));
    });

    child.on('close', (code) => {
        if (code === 0) {
            sendLine('ok', '✓ deploy-commands.js exited successfully.');
        } else {
            sendLine('err', `✗ deploy-commands.js exited with code ${code}.`);
        }
        res.end();
    });

    child.on('error', (err) => {
        sendLine('err', `✗ Child process error: ${err.message}`);
        res.end();
    });

    req.on('close', () => { if (child && !child.killed) child.kill('SIGTERM'); });
});

// ── POST /webhook/trigger ─────────────────────────────────────────────────────
app.post('/webhook/trigger', webhookLimiter, async (req, res) => {
    try {
        const guildId   = req.headers['x-sigil-guild-id'];
        const signature = req.headers['x-sigil-signature'];
        if (!guildId) return res.status(400).json({ ok: false, error: 'Missing x-sigil-guild-id header.' });
        const config = getConfig(guildId);

        if (!config.webhook_secret) {
            return res.status(400).json({
                ok: false,
                error: 'Webhook secret not configured for this guild. Use /sigilconfig webhook to set one.',
            });
        }
        if (!verifyHmac(req.rawBody, config.webhook_secret, signature || '')) {
            return res.status(401).json({ ok: false, error: 'Invalid signature.' });
        }

        if (!config.webhook_channel)
            return res.status(400).json({ ok: false, error: 'No webhook channel configured. Use /sigilconfig webhook.' });

        const { type, ...payload } = req.body;
        const VALID_TYPES = new Set(['twitch.live', 'youtube.upload', 'github.push']);
        if (!VALID_TYPES.has(type))
            return res.status(400).json({ ok: false, error: `Unknown event type: ${type}` });

        enqueueWebhook(type, guildId, payload);
        res.json({ ok: true, type, queued: true });
    } catch (err) { console.error('[/webhook/trigger]', err); res.status(500).json({ ok: false, error: 'Internal error.' }); }
});

// ── POST /preview ─────────────────────────────────────────────────────────────
app.post('/preview', renderLimiter, async (req, res) => {
    try {
        const b          = req.body || {};
        const text       = safeText(b.icon_text    || b.text   || 'SIGIL', 8).toUpperCase();
        const bannerText = safeText(b.banner_text  || b.text   || text, 64);
        const primary    = safeHex(b.primary_color   || b.primary,   '#8B0000');
        const secondary  = safeHex(b.secondary_color || b.secondary, '#4B0082');
        const background = String(b.background || 'midnight-gradient');
        const border     = String(b.border     || 'none');
        const font       = String(b.font       || 'Arial Black');
        const glow       = clamp(b.glow, 0, 25);
        const opacity    = clamp(b.opacity, 0, 1);
        const shape      = safeShape(b.shape);
        const palette    = Array.isArray(b.palette) ? b.palette.map(h => safeHex(h, primary)) : [];
        const { width, height } = parseDimensions(b);
        const { iconBuf, bannerBuf, paletteBuf } = await renderKit({ text, bannerText, background, border, primary, secondary, font, glow, opacity, shape, palette, width, height });
        res.json({ ok: true, icon_b64: iconBuf.toString('base64'), banner_b64: bannerBuf.toString('base64'), palette_b64: paletteBuf.toString('base64') });
    } catch (err) { console.error('[/preview]', err); res.status(500).json({ ok: false, error: classifyError(err) }); }
});

// ── POST /preview/welcome ─────────────────────────────────────────────────────
app.post('/preview/welcome', renderLimiter, async (req, res) => {
    try {
        const b = req.body || {};
        const W = 900, H = 300;
        const username = safeText(b.username || 'NewMember', 32);
        const message  = safeText(b.message  || 'Welcome to the server!', 128);
        const primary  = safeHex(b.primary_color, '#39FF14');
        const bg       = String(b.background || 'gradient-purple');
        const font     = String(b.font || 'Arial');
        const canvas = createCanvas(W, H);
        const ctx    = canvas.getContext('2d');
        try { getBackgroundById(bg).draw(ctx, W, H); } catch { ctx.fillStyle = '#1a1a2e'; ctx.fillRect(0, 0, W, H); }
        ctx.fillStyle = '#00000055'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = primary; ctx.fillRect(0, 0, 6, H);
        const AR = 90, AX = 36, AY = H / 2;
        ctx.save(); ctx.beginPath(); ctx.arc(AX + AR, AY, AR, 0, Math.PI * 2);
        ctx.fillStyle = primary + '33'; ctx.fill(); ctx.restore();
        ctx.font = `bold 48px "${font}"`; ctx.fillStyle = primary;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(username.slice(0, 2).toUpperCase(), AX + AR, AY);
        ctx.beginPath(); ctx.arc(AX + AR, AY, AR + 4, 0, Math.PI * 2);
        ctx.strokeStyle = primary; ctx.lineWidth = 3; ctx.stroke();
        const TX = AX + AR * 2 + 36;
        ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
        ctx.font = `bold 13px Arial`; ctx.fillStyle = primary; ctx.fillText('W E L C O M E', TX, H * 0.30);
        ctx.font = `bold 42px "${font}"`; ctx.fillStyle = '#ffffff';
        ctx.shadowColor = primary; ctx.shadowBlur = 8;
        ctx.fillText(username, TX, H * 0.30 + 48); ctx.shadowBlur = 0;
        ctx.font = `18px "${font}"`; ctx.fillStyle = '#cccccc'; ctx.fillText(message, TX, H * 0.30 + 80);
        if (b.member_count) { ctx.font = `13px Arial`; ctx.fillStyle = primary + 'cc'; ctx.fillText(String(b.member_count), TX, H * 0.30 + 106); }
        ctx.font = '12px Arial'; ctx.fillStyle = '#ffffff18'; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
        ctx.fillText('made with Sigil', W - 12, H - 8);
        res.json({ ok: true, image_b64: canvas.toBuffer('image/png').toString('base64') });
    } catch (err) { console.error('[/preview/welcome]', err); res.status(500).json({ ok: false, error: classifyError(err) }); }
});

// ── POST /preview/rankcard ────────────────────────────────────────────────────
app.post('/preview/rankcard', renderLimiter, async (req, res) => {
    try {
        const b = req.body || {};
        const W = 800, H = 200;
        const username    = safeText(b.username    || 'Player', 32);
        const level       = clamp(b.level,       1, 9999);
        const rank        = clamp(b.rank,        1, 9999);
        const current_xp  = clamp(b.current_xp,  0, 9999999);
        const required_xp = clamp(b.required_xp, 1, 9999999);
        const primary     = safeHex(b.primary_color, '#5865F2');
        const bg          = String(b.background || 'solid-dark');
        const font        = String(b.font || 'Arial');
        const progress    = Math.min(1, current_xp / required_xp);
        const canvas = createCanvas(W, H);
        const ctx    = canvas.getContext('2d');
        try { getBackgroundById(bg).draw(ctx, W, H); } catch { ctx.fillStyle = '#1e1f22'; ctx.fillRect(0, 0, W, H); }
        ctx.fillStyle = '#00000066'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = primary; ctx.fillRect(0, 0, 6, H);
        const AR = 60, AX = 24, AY = H / 2;
        ctx.save(); ctx.beginPath(); ctx.arc(AX + AR, AY, AR, 0, Math.PI * 2);
        ctx.fillStyle = primary + '33'; ctx.fill(); ctx.restore();
        ctx.font = `bold 28px "${font}"`; ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(username.slice(0, 2).toUpperCase(), AX + AR, AY);
        ctx.beginPath(); ctx.arc(AX + AR, AY, AR + 3, 0, Math.PI * 2);
        ctx.strokeStyle = primary; ctx.lineWidth = 2.5; ctx.stroke();
        const TX = AX + AR * 2 + 28;
        ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
        ctx.font = `bold 26px "${font}"`; ctx.fillStyle = '#ffffff';
        ctx.fillText(username, TX, H * 0.36);
        ctx.font = `bold 14px Arial`; ctx.fillStyle = primary;
        ctx.fillText(`RANK #${rank}  •  LEVEL ${level}`, TX, H * 0.36 + 26);
        const BAR_X = TX, BAR_Y = H * 0.68, BAR_W = W - TX - 24, BAR_H = 16;
        ctx.fillStyle = '#ffffff22'; ctx.beginPath(); ctx.roundRect(BAR_X, BAR_Y, BAR_W, BAR_H, 8); ctx.fill();
        if (progress > 0) {
            const grad = ctx.createLinearGradient(BAR_X, 0, BAR_X + BAR_W * progress, 0);
            grad.addColorStop(0, primary); grad.addColorStop(1, primary + 'aa');
            ctx.fillStyle = grad;
            ctx.beginPath(); ctx.roundRect(BAR_X, BAR_Y, BAR_W * progress, BAR_H, 8); ctx.fill();
        }
        ctx.font = `bold 12px Arial`; ctx.fillStyle = '#aaaaaa'; ctx.textAlign = 'right'; ctx.textBaseline = 'top';
        ctx.fillText(`${current_xp.toLocaleString()} / ${required_xp.toLocaleString()} XP`, W - 24, BAR_Y + BAR_H + 4);
        ctx.font = '12px Arial'; ctx.fillStyle = '#ffffff18'; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
        ctx.fillText('made with Sigil', W - 12, H - 8);
        res.json({ ok: true, image_b64: canvas.toBuffer('image/png').toString('base64') });
    } catch (err) { console.error('[/preview/rankcard]', err); res.status(500).json({ ok: false, error: classifyError(err) }); }
});

// ── POST /preview/serverstats ─────────────────────────────────────────────────
app.post('/preview/serverstats', renderLimiter, async (req, res) => {
    try {
        const b = req.body || {};
        const W = 860, H = 480;
        const server_name  = safeText(b.server_name  || 'My Server', 48);
        const member_count = clamp(b.member_count,  0, 9999999);
        const channel_count= clamp(b.channel_count, 0, 9999);
        const role_count   = clamp(b.role_count,    0, 9999);
        const emoji_count  = clamp(b.emoji_count,   0, 9999);
        const boost_level  = clamp(b.boost_level,   0, 3);
        const boost_count  = clamp(b.boost_count,   0, 9999);
        const age_days     = clamp(b.age_days,       0, 9999);
        const accent       = safeHex(b.accent_color, '#5865F2');
        const canvas = createCanvas(W, H);
        const ctx    = canvas.getContext('2d');
        ctx.fillStyle = '#1e1f22'; ctx.fillRect(0, 0, W, H);
        const bgGrad = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, W * 0.6);
        bgGrad.addColorStop(0, accent + '18'); bgGrad.addColorStop(1, '#1e1f22');
        ctx.fillStyle = bgGrad; ctx.fillRect(0, 0, W, H);
        const topGrad = ctx.createLinearGradient(0, 0, W, 0);
        topGrad.addColorStop(0, accent); topGrad.addColorStop(1, accent + '00');
        ctx.fillStyle = topGrad; ctx.fillRect(0, 0, W, 5);
        ctx.font = `bold 28px Arial`; ctx.fillStyle = '#ffffff'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
        ctx.fillText(server_name, 24, 58);
        ctx.font = `bold 13px Arial`; ctx.fillStyle = '#ff73fa';
        ctx.fillText(`\uD83D\uDE80 Level ${boost_level} \u2022 ${boost_count} Boosts`, 24, 82);
        ctx.fillStyle = '#ffffff22'; ctx.fillRect(24, 100, W - 48, 1);
        const stats = [
            { label: 'MEMBERS',  value: member_count.toLocaleString(), icon: '\uD83D\uDC65' },
            { label: 'CHANNELS', value: channel_count.toString(),       icon: '\uD83D\uDCAC' },
            { label: 'ROLES',    value: role_count.toString(),          icon: '\uD83C\uDFF7\uFE0F' },
            { label: 'EMOJI',    value: emoji_count.toString(),         icon: '\uD83D\uDE04' },
            { label: 'BOOSTS',   value: boost_count.toString(),         icon: '\uD83D\uDE80' },
            { label: 'AGE',      value: `${age_days}d`,                 icon: '\uD83D\uDCC5' },
        ];
        const CARD_W = (W - 48 - 40) / 3, CARD_H = 110;
        stats.forEach((s, i) => {
            const col = i % 3, row = Math.floor(i / 3);
            const cx = 24 + col * (CARD_W + 20), cy = 118 + row * (CARD_H + 16);
            ctx.fillStyle = '#2b2d31'; ctx.beginPath(); ctx.roundRect(cx, cy, CARD_W, CARD_H, 10); ctx.fill();
            ctx.strokeStyle = accent + '44'; ctx.lineWidth = 1.5; ctx.stroke();
            ctx.font = `22px Arial`; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
            ctx.fillText(s.icon, cx + CARD_W / 2, cy + 34);
            ctx.font = `bold 26px Arial`; ctx.fillStyle = '#ffffff';
            ctx.shadowColor = accent; ctx.shadowBlur = 5;
            ctx.fillText(s.value, cx + CARD_W / 2, cy + 70); ctx.shadowBlur = 0;
            ctx.font = `bold 11px Arial`; ctx.fillStyle = '#b5bac1';
            ctx.fillText(s.label, cx + CARD_W / 2, cy + 92);
        });
        ctx.fillStyle = topGrad; ctx.fillRect(0, H - 5, W, 5);
        ctx.font = '12px Arial'; ctx.fillStyle = '#ffffff18'; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
        ctx.fillText('made with Sigil', W - 12, H - 8);
        res.json({ ok: true, image_b64: canvas.toBuffer('image/png').toString('base64') });
    } catch (err) { console.error('[/preview/serverstats]', err); res.status(500).json({ ok: false, error: classifyError(err) }); }
});

// ── POST /generate (disabled) ─────────────────────────────────────────────────
app.post('/generate', (req, res) => {
    res.status(503).json({ ok: false, coming_soon: true, error: '✨ AI Generate is coming soon. Stay tuned!' });
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function clamp(n, min, max) { const v = Number(n); return isNaN(v) ? min : Math.min(max, Math.max(min, v)); }
function safeHex(hex, fallback = '#ffffff') {
    return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(String(hex || '').trim()) ? String(hex).trim() : fallback;
}
function parseDimensions(b) { return { width: clamp(b.width, 64, 3840) || undefined, height: clamp(b.height, 64, 2160) || undefined }; }
const VALID_SHAPES = new Set(['circle', 'rounded', 'hexagon', 'diamond', 'square']);
function safeShape(s) { const v = String(s || 'square').toLowerCase().trim(); return VALID_SHAPES.has(v) ? v : 'square'; }
function safeText(str, maxLen = 128) {
    return String(str || '').replace(/[\x00-\x1F\x7F]/g, '').trim().slice(0, maxLen);
}
function classifyError(err) {
    const msg = String(err?.message || err);
    if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) return '⚠️ Quota exceeded. Wait a moment and try again.';
    if (msg.includes('fetch') || msg.includes('ENOTFOUND')) return '⚠️ Network error — check your connection.';
    return '⚠️ ' + msg.split('\n')[0].slice(0, 120);
}

// ── 404 Catch-all ─────────────────────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, '404.html'));
});

// ╔══════════════════════════════════════════════════════════════════╗
// ║            GRACEFUL SHUTDOWN — SIGTERM / SIGINT                 ║
// ╚══════════════════════════════════════════════════════════════════╝

let shuttingDown = false;

function gracefulShutdown(reason = 'signal') {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[GUI] Graceful shutdown initiated (reason: ${reason}).`);
    wssLogs.clients.forEach(ws => ws.terminate());
    server.close((err) => {
        if (err) console.error('[GUI] server.close error:', err);
        console.log('[GUI] HTTP server closed. Exiting.');
        process.exit(0);
    });
    setTimeout(() => {
        console.warn('[GUI] Shutdown timed out — forcing exit.');
        process.exit(1);
    }, 8000).unref();
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT',  () => gracefulShutdown('SIGINT'));

server.listen(PORT, '0.0.0.0', () => console.log(`[GUI] Sigil GUI server v${VERSION} on http://localhost:${PORT}`));
