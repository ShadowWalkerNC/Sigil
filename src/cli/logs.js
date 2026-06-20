'use strict';

/**
 * src/cli/logs.js
 * `sigil logs` — tail gui-server.js log output in real time via WebSocket.
 *
 * Usage:
 *   sigil logs                  # live stream
 *   sigil logs --tail 50        # show last 50 lines then stream
 *   sigil logs --level error    # filter to error lines
 *   sigil logs --no-stream      # snapshot only, no live follow
 */

const http = require('http');
const { URL } = require('url');

const LEVEL_COLORS = {
    info:  '\x1b[37m',   // white
    warn:  '\x1b[33m',   // yellow
    error: '\x1b[31m',   // red
};
const RESET = '\x1b[0m';
const DIM   = '\x1b[90m';

function formatLine(entry) {
    const d    = new Date(entry.ts);
    const time = d.toTimeString().slice(0, 8);
    const col  = LEVEL_COLORS[entry.level] || '';
    const tag  = entry.level.toUpperCase().padEnd(5);
    return `${DIM}[${time}]${RESET} ${col}${tag}${RESET}  ${entry.text}`;
}

async function httpGet(urlStr) {
    return new Promise((resolve, reject) => {
        const u = new URL(urlStr);
        http.get({ hostname: u.hostname, port: u.port, path: u.pathname + u.search }, (res) => {
            let d = '';
            res.on('data', c => { d += c; });
            res.on('end', () => {
                try { resolve(JSON.parse(d)); } catch { resolve({}); }
            });
        }).on('error', reject);
    });
}

async function run(argv) {
    // Parse flags
    let tail     = 50;
    let level    = null;
    let stream   = true;

    for (let i = 0; i < argv.length; i++) {
        if (argv[i] === '--tail'   && argv[i+1]) { tail  = parseInt(argv[++i], 10); }
        if (argv[i] === '--level'  && argv[i+1]) { level = argv[++i]; }
        if (argv[i] === '--no-stream')            { stream = false; }
    }

    const base  = (process.env.GUI_SERVER_URL || 'http://localhost:8080').replace(/\/$/, '');
    const query = `?tail=${tail}${level ? `&level=${level}` : ''}`;

    // ── Snapshot ──────────────────────────────────────────────────────────────
    let snapshot;
    try {
        snapshot = await httpGet(`${base}/api/logs${query}`);
    } catch {
        console.error(`\x1b[31m[sigil logs] Cannot reach gui-server at ${base}\x1b[0m`);
        console.error(`  Make sure gui-server.js is running (node gui/gui-server.js)`);
        process.exit(1);
    }

    if (!snapshot.ok) {
        console.error(`\x1b[31m[sigil logs] Server error: ${snapshot.error}\x1b[0m`);
        process.exit(1);
    }

    const lines = snapshot.lines || [];
    if (lines.length) {
        console.log(`\x1b[90m── last ${lines.length} line(s) ──────────────────────────\x1b[0m`);
        for (const l of lines) console.log(formatLine(l));
        console.log(`\x1b[90m────────────────────────────────────────────\x1b[0m`);
    } else {
        console.log(`\x1b[90m[sigil logs] Buffer is empty.\x1b[0m`);
    }

    if (!stream) return;

    // ── Live stream via WebSocket ─────────────────────────────────────────────
    const wsUrl = base.replace(/^http/, 'ws') + '/ws/logs' + (level ? `?level=${level}` : '');
    console.log(`\x1b[36m[sigil logs] Live stream started. Ctrl+C to exit.\x1b[0m`);

    let ws;
    try {
        const { WebSocket } = require('ws');
        ws = new WebSocket(wsUrl);
    } catch {
        console.error(`\x1b[31m[sigil logs] ws package not found. Run: npm install ws\x1b[0m`);
        process.exit(1);
    }

    ws.on('message', (data) => {
        try {
            const entry = JSON.parse(data.toString());
            if (!level || entry.level === level) console.log(formatLine(entry));
        } catch {}
    });
    ws.on('error', (err) => {
        console.error(`\x1b[31m[sigil logs] WebSocket error: ${err.message}\x1b[0m`);
    });
    ws.on('close', () => {
        console.log(`\x1b[90m[sigil logs] Connection closed.\x1b[0m`);
        process.exit(0);
    });

    process.on('SIGINT', () => {
        console.log(`\n\x1b[90m[sigil logs] Disconnecting...\x1b[0m`);
        ws.close();
        process.exit(0);
    });
}

module.exports = { run };
