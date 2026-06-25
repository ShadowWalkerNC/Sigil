// mcp-server.js — Sigil Model Context Protocol (MCP) Server
// Communicates over stdin/stdout using JSON-RPC 2.0.

'use strict';

// ── REDIRECT STDOUT LOGGING TO STDERR ───────────────────────────────────────────
// This is critical. Any raw text printed to stdout will corrupt the JSON-RPC stream.
const originalLog = console.log;
console.log = function(...args) {
    console.error('[LOG]', ...args);
};

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { renderKit } = require('../src/utils/canvas.js');
const { enablePackage, disablePackage, getAllPackageStates } = require('../src/utils/packages.js');

const DB_PATH = path.join(__dirname, '..', 'data', 'sigil.db');
const BOT_STALE_MS = 90_000;

// Helper: Open SQLite DB
function getDb() {
    if (!fs.existsSync(DB_PATH)) {
        return null;
    }
    try {
        return new Database(DB_PATH, { readonly: true, fileMustExist: true });
    } catch {
        return null;
    }
}

// Handler functions for the tools
function getStatus() {
    const db = getDb();
    if (!db) {
        return {
            ok: false,
            bot: { ok: false, reachable: false, reason: 'db_unavailable' },
            services: [],
        };
    }

    let heartbeat = null;
    try {
        heartbeat = db.prepare('SELECT * FROM bot_heartbeat WHERE id = 1').get() ?? null;
    } catch (err) {
        console.error('[MCP Error] Failed to read heartbeat:', err.message);
    }

    let services = [];
    try {
        const rows = db.prepare('SELECT * FROM service_registry').all();
        services = rows.map(row => ({
            name: row.name,
            status: row.status,
            lastHeartbeat: row.last_heartbeat,
            lastError: row.last_error,
            errorCount: row.error_count,
        }));
    } catch (err) {
        console.error('[MCP Error] Failed to read services:', err.message);
    }

    const botOnline = heartbeat && (Date.now() - heartbeat.ts) < BOT_STALE_MS;

    return {
        ok: true,
        bot: {
            online: !!botOnline,
            tag: heartbeat?.tag ?? null,
            latency: heartbeat?.latency ?? null,
            guilds: heartbeat?.guilds ?? 0,
            lastSeenMs: heartbeat ? Date.now() - heartbeat.ts : null,
        },
        services,
    };
}

function getLogs(args) {
    const db = getDb();
    if (!db) {
        return { ok: false, error: 'Database unavailable' };
    }

    const tail = Math.max(1, Math.min(500, Number(args.tail || 50)));
    const level = ['info', 'warn', 'error'].includes(args.level) ? args.level : null;

    try {
        let rows;
        if (level) {
            rows = db.prepare(
                'SELECT ts, level, text FROM log_buffer WHERE level = ? ORDER BY id DESC LIMIT ?'
            ).all(level, tail).reverse();
        } else {
            rows = db.prepare(
                'SELECT ts, level, text FROM log_buffer ORDER BY id DESC LIMIT ?'
            ).all(tail).reverse();
        }
        return { ok: true, lines: rows };
    } catch (err) {
        return { ok: false, error: err.message };
    }
}

async function renderBrandKit(args) {
    try {
        const text = String(args.icon_text || 'SIGIL').toUpperCase().slice(0, 8);
        const bannerText = String(args.banner_text || text).slice(0, 64);
        const primary = String(args.primary_color || '#8B0000');
        const secondary = String(args.secondary_color || '#4B0082');
        const background = String(args.background || 'midnight-gradient');
        const border = String(args.border || 'none');
        const font = String(args.font || 'Arial Black');
        const glow = Math.max(0, Math.min(25, Number(args.glow ?? 10)));

        const kit = await renderKit({
            text,
            bannerText,
            background,
            border,
            primary,
            secondary,
            font,
            glow,
            opacity: 1,
            shape: 'circle',
            palette: [primary, secondary],
            width: 512,
            height: 512,
        });

        return {
            ok: true,
            icon_b64: kit.iconBuf.toString('base64'),
            banner_b64: kit.bannerBuf.toString('base64'),
            palette_b64: kit.paletteBuf.toString('base64'),
        };
    } catch (err) {
        return { ok: false, error: err.message };
    }
}

function togglePackage(args) {
    try {
        const guildId = String(args.guild_id || '').trim();
        const pkgKey = String(args.package || '').trim();
        const enabled = Boolean(args.enabled);

        if (!guildId || !/^\d{17,20}$/.test(guildId)) {
            return { ok: false, error: 'Invalid or missing guild_id.' };
        }
        if (!pkgKey) {
            return { ok: false, error: 'Missing package key.' };
        }

        const result = enabled ? enablePackage(guildId, pkgKey) : disablePackage(guildId, pkgKey);
        if (result === 'unknown') {
            return { ok: false, error: `Unknown package: "${pkgKey}"` };
        }

        return { ok: true, package: pkgKey, enabled, result };
    } catch (err) {
        return { ok: false, error: err.message };
    }
}

// ── JSON-RPC stream parser ───────────────────────────────────────────────────────
let buffer = '';

process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
    buffer += chunk;
    parseBuffer();
});

function parseBuffer() {
    let lineEnd;
    while ((lineEnd = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, lineEnd).trim();
        buffer = buffer.slice(lineEnd + 1);

        if (line) {
            try {
                const request = JSON.parse(line);
                handleRequest(request);
            } catch (err) {
                sendError(null, -32700, `Parse error: ${err.message}`);
            }
        }
    }
}

function sendResponse(id, result) {
    const response = {
        jsonrpc: '2.0',
        id,
        result,
    };
    process.stdout.write(JSON.stringify(response) + '\n');
}

function sendError(id, code, message) {
    const response = {
        jsonrpc: '2.0',
        id,
        error: { code, message },
    };
    process.stdout.write(JSON.stringify(response) + '\n');
}

async function handleRequest(req) {
    if (req.jsonrpc !== '2.0') {
        return sendError(req.id || null, -32600, 'Invalid Request (not JSON-RPC 2.0)');
    }

    const { method, params, id } = req;

    // Handle initialization protocol
    if (method === 'initialize') {
        return sendResponse(id, {
            protocolVersion: '2024-11-05',
            capabilities: {},
            serverInfo: {
                name: 'sigil-mcp-server',
                version: '1.0.0',
            },
        });
    }

    if (method === 'initialized') {
        // No-op for standard initialization flow
        return;
    }

    // List tools method
    if (method === 'tools/list') {
        return sendResponse(id, {
            tools: [
                {
                    name: 'sigil_get_status',
                    description: 'Retrieve the current health, bot connection status, and service heartbeats from the database.',
                    inputSchema: { type: 'object', properties: {} },
                },
                {
                    name: 'sigil_get_logs',
                    description: 'Fetch the latest system log entries from the SQLite log ring buffer.',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            tail: { type: 'number', description: 'Number of log lines to tail (default 50, max 500)' },
                            level: { type: 'string', enum: ['info', 'warn', 'error'], description: 'Filter by log level' },
                        },
                    },
                },
                {
                    name: 'sigil_toggle_package',
                    description: 'Toggle a feature package (like community, moderation, faith, or leveling) for a specific Discord guild.',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            guild_id: { type: 'string', description: 'Discord guild ID snowflake' },
                            package: { type: 'string', description: 'Package key' },
                            enabled: { type: 'boolean', description: 'Enable or disable status' },
                        },
                        required: ['guild_id', 'package', 'enabled'],
                    },
                },
                {
                    name: 'sigil_render_brand_kit',
                    description: 'Render a Sigil brand kit (icon, banner, palette) server-side and return the base64-encoded PNG strings.',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            icon_text: { type: 'string', description: 'Main text overlay for the icon (max 8 chars)' },
                            banner_text: { type: 'string', description: 'Banner title override' },
                            primary_color: { type: 'string', description: 'Primary hex color (e.g. #FF4444)' },
                            secondary_color: { type: 'string', description: 'Secondary hex color' },
                            background: { type: 'string', description: 'Background preset ID' },
                            border: { type: 'string', description: 'Border preset ID' },
                            font: { type: 'string', description: 'Font family name' },
                            glow: { type: 'number', description: 'Glow factor (0-25)' },
                        },
                        required: ['icon_text'],
                    },
                },
            ],
        });
    }

    // Call tool method
    if (method === 'tools/call') {
        const { name, arguments: args } = params || {};
        try {
            let resultData;
            switch (name) {
                case 'sigil_get_status':
                    resultData = getStatus();
                    break;
                case 'sigil_get_logs':
                    resultData = getLogs(args || {});
                    break;
                case 'sigil_toggle_package':
                    resultData = togglePackage(args || {});
                    break;
                case 'sigil_render_brand_kit':
                    resultData = await renderBrandKit(args || {});
                    break;
                default:
                    return sendError(id, -32601, `Method not found: tool ${name}`);
            }

            return sendResponse(id, {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify(resultData, null, 2),
                    },
                ],
            });
        } catch (err) {
            return sendResponse(id, {
                content: [{ type: 'text', text: `Error calling tool ${name}: ${err.message}` }],
                isError: true,
            });
        }
    }

    // Unhandled method
    return sendError(id, -32601, `Method not found: ${method}`);
}
