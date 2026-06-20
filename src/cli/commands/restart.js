'use strict';

/**
 * src/cli/commands/restart.js
 * Handler for:  sigil restart [--force]
 *
 * Sends POST /api/control/restart to gui-server.
 * Requires CONTROL_SECRET env var on both sides.
 *
 * Flags:
 *   --force   Skip the confirmation prompt
 *   --json    Output machine-readable JSON instead of ANSI text
 */

const http  = require('http');
const readline = require('readline');

const C = {
    reset:  '\x1b[0m',
    bold:   '\x1b[1m',
    dim:    '\x1b[2m',
    red:    '\x1b[31m',
    green:  '\x1b[32m',
    yellow: '\x1b[33m',
    cyan:   '\x1b[36m',
};

function postJson(baseUrl, path, body, secret) {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify(body);
        const url     = new URL(path, baseUrl);
        const options = {
            method:   'POST',
            hostname: url.hostname,
            port:     url.port || 80,
            path:     url.pathname,
            headers:  {
                'Content-Type':   'application/json',
                'Content-Length': Buffer.byteLength(payload),
                ...(secret ? { 'x-control-secret': secret } : {}),
            },
        };
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', c => { data += c; });
            res.on('end', () => {
                try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
                catch { resolve({ status: res.statusCode, body: { ok: false, error: 'Non-JSON response.' } }); }
            });
        });
        req.setTimeout(8000, () => { req.destroy(); reject(new Error('Request timed out')); });
        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}

function prompt(question) {
    return new Promise((resolve) => {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        rl.question(question, (answer) => { rl.close(); resolve(answer.trim().toLowerCase()); });
    });
}

module.exports = async function restartCommand({ flags }) {
    const baseUrl = process.env.GUI_SERVER_URL || 'http://localhost:8080';
    const secret  = process.env.CONTROL_SECRET || '';
    const asJson  = !!flags.json;
    const force   = !!flags.force || !!flags.f;

    if (!asJson && !force) {
        const answer = await prompt(
            `  ${C.yellow}${C.bold}⚠  Restart Sigil bot process?${C.reset} ${C.dim}(yes/no)${C.reset} › `
        );
        if (answer !== 'yes' && answer !== 'y') {
            if (asJson) { console.log(JSON.stringify({ ok: false, cancelled: true })); }
            else        { console.log(`\n  ${C.dim}Cancelled.${C.reset}\n`); }
            return;
        }
    }

    if (!asJson) {
        process.stdout.write(`\n  ${C.cyan}Sending restart signal…${C.reset}`);
    }

    let result;
    try {
        result = await postJson(baseUrl, '/api/control/restart', { restart: true }, secret);
    } catch (err) {
        if (asJson) {
            console.log(JSON.stringify({ ok: false, error: err.message }));
        } else {
            console.log(`\n\n  ${C.red}${C.bold}✗ Could not reach gui-server${C.reset}`);
            console.log(`  ${C.dim}${err.message}${C.reset}`);
            console.log(`  ${C.dim}Is gui-server running at ${baseUrl}?${C.reset}\n`);
        }
        process.exit(1);
    }

    if (asJson) {
        console.log(JSON.stringify(result.body));
        return;
    }

    if (result.body?.ok) {
        console.log(`  ${C.green}${C.bold}✓${C.reset}\n`);
        console.log(`  ${C.green}Restart signal accepted.${C.reset}`);
        console.log(`  ${C.dim}PM2/process-manager will restart the bot momentarily.${C.reset}\n`);
    } else {
        console.log(`  ${C.red}${C.bold}✗${C.reset}\n`);
        console.log(`  ${C.red}Restart rejected:${C.reset} ${result.body?.error || 'Unknown error'}\n`);
        if (result.status === 401) {
            console.log(`  ${C.dim}Set CONTROL_SECRET env var to match the server's CONTROL_SECRET.${C.reset}\n`);
        }
        process.exit(1);
    }
};
