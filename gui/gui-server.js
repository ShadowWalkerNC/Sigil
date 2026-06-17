/**
 * Sigil GUI Bridge Server
 * =======================
 * Lightweight Node HTTP server. Receives config JSON from the HTML GUI
 * (gui/sigil-gui-builder.html) and routes it into Sigil's pipeline.
 *
 * Endpoints:
 *   GET  /              — serve sigil-gui-builder.html
 *   GET  /health        — uptime + version ping
 *   POST /generate      — full brand kit: Gemini text + canvas PNG renders
 *   POST /preview       — fast canvas-only render (no Gemini call)
 *   POST /webhook-register — save a Discord webhook URL for asset callbacks
 *
 * Usage:
 *   node gui/gui-server.js
 *   PORT=4000 node gui/gui-server.js
 */

'use strict';

const http = require('http');
const path = require('path');
const fs   = require('fs');

const { geminiRequest, geminiImageRequest, extractJson } = require('../src/utils/gemini');
const { renderKit }                                       = require('../src/utils/canvas');

const PORT    = Number(process.env.GUI_PORT) || 3420;
const VERSION = '1.2.0';
const START   = Date.now();

// In-memory webhook store (keyed by Discord channel ID)
const webhooks = {};

// ── Helpers ────────────────────────────────────────────────────────────────

function cors(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function json(res, status, data) {
    cors(res);
    const body = JSON.stringify(data);
    res.writeHead(status, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) });
    res.end(body);
}

function readBody(req) {
    return new Promise((resolve, reject) => {
        let raw = '';
        req.on('data', c => { raw += c; if (raw.length > 1_000_000) req.destroy(); });
        req.on('end',  () => { try { resolve(JSON.parse(raw)); } catch { reject(new Error('Invalid JSON body')); } });
        req.on('error', reject);
    });
}

/** Map GUI config visuals → renderKit() options */
function configToRenderKitOpts(cfg) {
    const b = cfg.brand   || {};
    const v = cfg.visuals || {};
    // GUI preset name → backgrounds.js key
    // All 10 real keys pass through directly; GUI-only presets map to the
    // closest real background (no more plain-black catch-alls).
    const BG_MAP = {
        // GUI preset names
        'midnight-gradient': 'midnight-gradient',
        'deep-space':        'starfield',
        'inferno':           'sunset',
        'ocean-depth':       'cyberpunk-grid',
        'forest-night':      'forest',
        'twilight':          'midnight-gradient',
        'aurora':            'bg-image-1',
        'storm':             'carbon-fiber',
        'sunset-fade':       'sunset',
        'void':              'plain-black',
        'neon-city':         'cyberpunk-grid',
        'polar':             'bg-image-2',
        // Pass-through: raw backgrounds.js keys sent directly from GUI
        'plain-black':       'plain-black',
        'plain-white':       'plain-white',
        'sunset':            'sunset',
        'forest':            'forest',
        'cyberpunk-grid':    'cyberpunk-grid',
        'starfield':         'starfield',
        'carbon-fiber':      'carbon-fiber',
        'bg-image-1':        'bg-image-1',
        'bg-image-2':        'bg-image-2',
    };
    return {
        name:       (b.banner_text || b.name || 'Sigil').slice(0, 30),
        initials:   (b.icon_text  || b.name || 'SG').slice(0, 4).toUpperCase(),
        color:      v.primary_color   || '#8B0000',
        color2:     v.secondary_color || null,
        background: BG_MAP[v.background] || 'midnight-gradient',
        border:     v.border            || 'none',
        glow:       String(v.glow ?? 10),
        tagline:    b.tagline           || null,
        fontKey:    v.font              || 'another-danger',
    };
}

/** Build Gemini brand prompt from GUI config */
function buildBrandPrompt(cfg) {
    const v = cfg.visuals || {};
    const b = cfg.brand   || {};
    return [
        `Generate a brand identity JSON for a Discord server named "${b.name || 'Untitled'}".`,
        `Description: ${b.description || b.tagline || 'No description provided'}.`,
        `Primary color: ${v.primary_color || '#8B0000'}, Secondary: ${v.secondary_color || '#4B0082'}.`,
        `Return ONLY a JSON object with keys: name, tagline, palette (array of 3-6 hex strings),`,
        `icon_prompt (image gen prompt for a 400x400 icon), banner_prompt (1024x320 banner prompt),`,
        `description (1-2 sentence brand description).`,
    ].join(' ');
}

/** Post generated assets back to a registered Discord webhook */
async function notifyWebhook(channelId, payload) {
    const url = webhooks[channelId];
    if (!url) return;
    const body = JSON.stringify({
        username: 'Sigil GUI',
        embeds: [{
            title:       `✦ Brand Kit — ${payload.name || 'Generated'}`,
            description: payload.description || payload.tagline || '',
            color:       parseInt((payload.palette?.[0] || '#8B0000').replace('#', ''), 16),
            fields: [
                { name: 'Palette',  value: (payload.palette || []).join('  '), inline: false },
                { name: 'Tagline',  value: payload.tagline || '—',             inline: false },
            ],
            footer: { text: 'Generated via Sigil GUI Builder' },
        }],
    });
    try {
        await new Promise((resolve, reject) => {
            const u   = new URL(url);
            const req = http.request(
                { hostname: u.hostname, port: u.port || 443, path: u.pathname + u.search, method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } },
                res => { res.resume(); resolve(res.statusCode); }
            );
            req.on('error', reject);
            req.write(body); req.end();
        });
    } catch (e) { console.warn('[webhook] Failed to notify:', e.message); }
}

// ── Request router ─────────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
    cors(res);
    if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

    const url = req.url.split('?')[0];

    // GET / — serve the HTML GUI
    if (req.method === 'GET' && url === '/') {
        const htmlPath = path.join(__dirname, 'sigil-gui-builder.html');
        try {
            const html = fs.readFileSync(htmlPath);
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            return res.end(html);
        } catch {
            return json(res, 500, { error: 'GUI HTML not found — check gui/sigil-gui-builder.html exists.' });
        }
    }

    // GET /health — uptime ping
    if (req.method === 'GET' && url === '/health') {
        return json(res, 200, { ok: true, version: VERSION, uptime: Math.floor((Date.now() - START) / 1000) });
    }

    // POST /webhook-register
    if (req.method === 'POST' && url === '/webhook-register') {
        try {
            const { channelId, webhookUrl } = await readBody(req);
            if (!channelId || !webhookUrl) return json(res, 400, { error: 'channelId and webhookUrl required' });
            webhooks[channelId] = webhookUrl;
            console.log(`[webhook] Registered channel ${channelId}`);
            return json(res, 200, { ok: true });
        } catch (e) { return json(res, 400, { error: e.message }); }
    }

    // POST /preview — fast canvas-only render
    if (req.method === 'POST' && url === '/preview') {
        try {
            const cfg  = await readBody(req);
            const opts = configToRenderKitOpts(cfg);
            const kit  = await renderKit(opts);
            return json(res, 200, {
                ok:         true,
                icon_b64:   kit.icon?.toString('base64')   || null,
                banner_b64: kit.banner?.toString('base64') || null,
            });
        } catch (e) {
            console.error('[/preview]', e);
            return json(res, 500, { error: e.message });
        }
    }

    // POST /generate — full Gemini + canvas pipeline
    if (req.method === 'POST' && url === '/generate') {
        try {
            const cfg        = await readBody(req);
            const apiKey     = cfg.gemini_api_key || process.env.GEMINI_API_KEY;
            if (!apiKey) return json(res, 400, { error: 'Gemini API key required — add it in the GUI or set GEMINI_API_KEY env var.' });

            process.env.GEMINI_API_KEY = apiKey;

            // 1. Gemini brand text
            const prompt  = buildBrandPrompt(cfg);
            const rawText = await geminiRequest(prompt, { temperature: 0.9, maxOutputTokens: 400 });
            const brand   = extractJson(rawText);

            // 2. Canvas renders
            const opts = {
                ...configToRenderKitOpts(cfg),
                name:    brand.name    || opts?.name,
                tagline: brand.tagline || opts?.tagline,
            };
            const kit = await renderKit(opts);

            // 3. Optional AI image
            let ai_image_b64 = null;
            const imgPrompt = brand.icon_prompt || cfg.brand?.ai_prompt;
            if (imgPrompt) {
                try {
                    const imgBuf   = await geminiImageRequest(imgPrompt);
                    ai_image_b64   = imgBuf?.toString('base64') || null;
                } catch (imgErr) {
                    console.warn('[/generate] AI image skipped:', imgErr.message);
                }
            }

            // 4. Notify webhook if registered
            const channelId = cfg.discord?.channel_id;
            if (channelId) notifyWebhook(channelId, { ...brand, palette: brand.palette }).catch(() => {});

            return json(res, 200, {
                ok:          true,
                brand,
                icon_b64:    kit.icon?.toString('base64')    || null,
                banner_b64:  kit.banner?.toString('base64')  || null,
                palette_b64: kit.palette?.toString('base64') || null,
                ai_image_b64,
            });
        } catch (e) {
            console.error('[/generate]', e);
            return json(res, 500, { error: e.message });
        }
    }

    json(res, 404, { error: `No route for ${req.method} ${url}` });
});

server.listen(PORT, '127.0.0.1', () => {
    console.log(`\n  ✦ Sigil GUI Server v${VERSION}`);
    console.log(`  → http://127.0.0.1:${PORT}\n`);
});
