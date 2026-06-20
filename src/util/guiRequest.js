/**
 * guiRequest.js
 * Lightweight HTTP helper for talking to the local gui-server.
 *
 * Usage:
 *   const { guiGet } = require('../util/guiRequest');
 *   const data = await guiGet('/api/status/full');   // returns parsed JSON or null
 */

const http  = require('http');
const https = require('https');
const { URL } = require('url');

const DEFAULT_TIMEOUT_MS = 4000;

/**
 * Returns the gui-server base URL from the environment.
 * Falls back to http://localhost:8080 when GUI_SERVER_URL is not set.
 */
function baseUrl() {
    return (process.env.GUI_SERVER_URL || 'http://localhost:8080').replace(/\/$/, '');
}

/**
 * Perform a GET request against the gui-server.
 *
 * @param {string} path   - Absolute path, e.g. '/api/status/full'
 * @param {number} [timeout] - Request timeout in ms (default 4 000)
 * @returns {Promise<object|null>} Parsed JSON body, or null on any error
 */
function guiGet(path, timeout = DEFAULT_TIMEOUT_MS) {
    return new Promise((resolve) => {
        const raw = `${baseUrl()}${path}`;
        let parsed;
        try { parsed = new URL(raw); } catch { return resolve(null); }

        const lib = parsed.protocol === 'https:' ? https : http;
        const req = lib.get(raw, { timeout }, (res) => {
            const chunks = [];
            res.on('data', c => chunks.push(c));
            res.on('end', () => {
                try {
                    resolve(JSON.parse(Buffer.concat(chunks).toString()));
                } catch {
                    resolve(null);
                }
            });
        });
        req.on('error',   () => resolve(null));
        req.on('timeout', () => { req.destroy(); resolve(null); });
    });
}

/**
 * Perform a POST request with a JSON body against the gui-server.
 *
 * @param {string} path
 * @param {object} [body]
 * @param {number} [timeout]
 * @returns {Promise<object|null>}
 */
function guiPost(path, body = {}, timeout = DEFAULT_TIMEOUT_MS) {
    return new Promise((resolve) => {
        const raw = `${baseUrl()}${path}`;
        let parsed;
        try { parsed = new URL(raw); } catch { return resolve(null); }

        const payload = JSON.stringify(body);
        const options = {
            hostname: parsed.hostname,
            port:     parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
            path:     parsed.pathname + parsed.search,
            method:   'POST',
            headers:  {
                'Content-Type':   'application/json',
                'Content-Length': Buffer.byteLength(payload),
            },
            timeout,
        };

        const lib = parsed.protocol === 'https:' ? https : http;
        const req = lib.request(options, (res) => {
            const chunks = [];
            res.on('data', c => chunks.push(c));
            res.on('end', () => {
                try {
                    resolve(JSON.parse(Buffer.concat(chunks).toString()));
                } catch {
                    resolve(null);
                }
            });
        });
        req.on('error',   () => resolve(null));
        req.on('timeout', () => { req.destroy(); resolve(null); });
        req.write(payload);
        req.end();
    });
}

module.exports = { guiGet, guiPost, baseUrl };
