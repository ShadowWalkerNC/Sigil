'use strict';

/**
 * src/cli/status.js
 * `sigil status` — print a health snapshot of the full Sigil + ASCILINE stack.
 *
 * Usage:
 *   sigil status
 *   sigil status --json
 */

const http = require('http');
const { URL } = require('url');

const C = {
    green:  '\x1b[32m',
    yellow: '\x1b[33m',
    red:    '\x1b[31m',
    gray:   '\x1b[90m',
    bold:   '\x1b[1m',
    reset:  '\x1b[0m',
};

function dot(reachable, ok) {
    if (!reachable)            return C.red    + '●' + C.reset;
    if (ok === false)          return C.yellow + '●' + C.reset;
    return C.green + '●' + C.reset;
}

function fmtUptime(ms) {
    if (!ms) return 'unknown';
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60)  % 60;
    const h = Math.floor(s / 3600) % 24;
    const d = Math.floor(s / 86400);
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m ${s % 60}s`;
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
    const json = argv.includes('--json');
    const base = (process.env.GUI_SERVER_URL || 'http://localhost:8080').replace(/\/$/, '');

    let data;
    try {
        data = await httpGet(`${base}/api/status/full`);
    } catch {
        if (json) { console.log(JSON.stringify({ error: 'gui-server unreachable' })); return; }
        console.error(`${C.red}[sigil status] Cannot reach gui-server at ${base}${C.reset}`);
        console.error(`  Make sure gui-server.js is running (node gui/gui-server.js)`);
        process.exit(1);
    }

    if (json) { console.log(JSON.stringify(data, null, 2)); return; }

    const { bot, gui, asciline, last_error } = data;

    console.log();
    console.log(`  ${C.bold}Sigil Stack Status${C.reset}  ${C.gray}${new Date().toLocaleTimeString()}${C.reset}`);
    console.log(`  ${C.gray}${'─'.repeat(42)}${C.reset}`);

    // Bot
    const botOk = bot?.reachable;
    console.log(`  ${dot(botOk, bot?.ok)}  ${C.bold}bot${C.reset}           ` +
        (botOk
            ? `${C.green}online${C.reset}  ${C.gray}${bot.guilds ?? '?'} guild(s)  latency ${bot.latency ?? '?'}ms${C.reset}`
            : `${C.red}unreachable${C.reset}`));

    // GUI server
    const guiOk = gui?.reachable;
    console.log(`  ${dot(guiOk, gui?.ok)}  ${C.bold}gui-server${C.reset}    ` +
        (guiOk
            ? `${C.green}v${gui.version}${C.reset}  ${C.gray}up ${fmtUptime(gui.uptime_ms)}${C.reset}`
            : `${C.red}unreachable${C.reset}`));

    // ASCILINE
    const ascOk = asciline?.reachable;
    const ascDesc = ascOk
        ? (asciline.playing
            ? `${C.green}playing${C.reset}  ${C.gray}mode=${asciline.mode}  cols=${asciline.cols}${C.reset}`
            : `${C.yellow}idle${C.reset}`)
        : `${C.red}unreachable${C.reset}  ${C.gray}(stream_server.py offline?)${C.reset}`;
    console.log(`  ${dot(ascOk, ascOk)}  ${C.bold}asciline${C.reset}      ${ascDesc}`);

    // Last error
    if (last_error) {
        const t = new Date(last_error.ts).toTimeString().slice(0, 8);
        console.log();
        console.log(`  ${C.red}✘  last error${C.reset}  ${C.gray}[${t}]${C.reset}  ${last_error.text.slice(0, 120)}`);
    } else {
        console.log();
        console.log(`  ${C.gray}✔  no recent errors${C.reset}`);
    }

    console.log();
}

module.exports = { run };
