// gui-server.js — Sigil GUI bridge server v2.2
// Run with: node gui/gui-server.js

const express    = require('express');
const path       = require('path');
const http       = require('http');
const rateLimit  = require('express-rate-limit');
const { createCanvas, loadImage } = require('canvas');
const { renderKit, registerAllFonts } = require('../src/utils/canvas.js');
const { getBackgroundById } = require('../src/utils/backgrounds.js');
const { getConfig }  = require('../src/utils/db.js');
const { verifyHmac } = require('../src/utils/hmac.js');
const { handleTwitchLive, handleYouTubeUpload, handleGitHubPush } = require('../src/automation/webhookHandler.js');
const { enablePackage, disablePackage, getAllPackageStates } = require('../src/utils/packages.js');
require('dotenv').config();

registerAllFonts();

const app  = express();
const PORT = Number(process.env.PORT) || 8080;

// ── ASCILINE stream_server.py base URL (co-hosted, local only) ───────────────
// Set STREAM_SERVER_URL in .env to override (e.g. for a different port).
const STREAM_URL = (process.env.STREAM_SERVER_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');

// AI generation is disabled until further notice
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

app.use(express.json({ limit: '4mb' }));

// ── Rate limiting ────────────────────────────────────────────────────────────
const renderLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { ok: false, error: '⏳ Too many requests — slow down and try again in a minute.' },
});
const webhookLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { ok: false, error: 'Rate limit exceeded.' },
});
const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false,
    message: { ok: false, error: 'Rate limit exceeded.' },
});
const mediaLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { ok: false, error: 'Media rate limit exceeded.' },
});

// ── Static pages ─────────────────────────────────────────────────────────────
app.get('/',            (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/brand',       (req, res) => res.sendFile(path.join(__dirname, 'sigil-gui-builder.html')));
app.get('/community',   (req, res) => res.sendFile(path.join(__dirname, 'sigil-community.html')));
app.get('/developers',  (req, res) => res.sendFile(path.join(__dirname, 'developers.html')));
app.get('/packages',    (req, res) => res.sendFile(path.join(__dirname, 'packages.html')));
app.get('/setup',       (req, res) => res.sendFile(path.join(__dirname, '..', 'setup.html')));
app.get('/health',      (req, res) => res.json({ ok: true, version: '2.2.0', ai_enabled: AI_ENABLED }));

// ── GET /api/packages?guild_id=... ───────────────────────────────────────────
app.get('/api/packages', apiLimiter, (req, res) => {
    try {
        const guildId = String(req.query.guild_id || '').trim();
        if (!guildId || !/^\d{17,20}$/.test(guildId)) {
            return res.status(400).json({ ok: false, error: 'Invalid or missing guild_id.' });
        }
        const packages = getAllPackageStates(guildId);
        const disabled = packages.filter(p => !p.enabled).map(p => p.key);
        res.json({ ok: true, guild_id: guildId, disabled, packages });
    } catch (err) {
        console.error('[GET /api/packages]', err);
        res.status(500).json({ ok: false, error: 'Internal error.' });
    }
});

// ── POST /api/packages ────────────────────────────────────────────────────────
app.post('/api/packages', apiLimiter, (req, res) => {
    try {
        const { guild_id, package: pkgKey, enabled } = req.body || {};
        if (!guild_id || !/^\d{17,20}$/.test(String(guild_id))) {
            return res.status(400).json({ ok: false, error: 'Invalid or missing guild_id.' });
        }
        if (!pkgKey || typeof pkgKey !== 'string') {
            return res.status(400).json({ ok: false, error: 'Missing package key.' });
        }
        if (typeof enabled !== 'boolean') {
            return res.status(400).json({ ok: false, error: '"enabled" must be a boolean.' });
        }
        const result = enabled
            ? enablePackage(String(guild_id), pkgKey)
            : disablePackage(String(guild_id), pkgKey);
        if (result === 'unknown') {
            return res.status(400).json({ ok: false, error: `Unknown package: "${pkgKey}".` });
        }
        res.json({ ok: true, package: pkgKey, enabled, result });
    } catch (err) {
        console.error('[POST /api/packages]', err);
        res.status(500).json({ ok: false, error: 'Internal error.' });
    }
});

// ╔══════════════════════════════════════════════════════════════════╗
// ║                  MEDIA PACKAGE — /api/media/*                   ║
// ║  Proxy namespace that forwards commands to stream_server.py.    ║
// ║  stream_server.py runs locally on STREAM_URL (default :8000).  ║
// ╚══════════════════════════════════════════════════════════════════╝

/**
 * Thin proxy helper — forwards a JSON body to stream_server.py
 * and pipes the response back. Times out after 8 s.
 */
function proxyToStream(streamPath, body) {
    return new Promise((resolve, reject) => {
        const payload = JSON.stringify(body);
        const url     = new URL(streamPath, STREAM_URL);
        const options = {
            method:   'POST',
            hostname: url.hostname,
            port:     url.port || 8000,
            path:     url.pathname,
            headers:  { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) },
        };
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
                catch { resolve({ status: res.statusCode, body: { ok: false, error: 'Non-JSON response from stream server.' } }); }
            });
        });
        req.setTimeout(8000, () => { req.destroy(); reject(new Error('Stream server timeout')); });
        req.on('error', reject);
        req.write(payload);
        req.end();
    });
}

function proxyGetToStream(streamPath) {
    return new Promise((resolve, reject) => {
        const url     = new URL(streamPath, STREAM_URL);
        const options = {
            method:   'GET',
            hostname: url.hostname,
            port:     url.port || 8000,
            path:     url.pathname + (url.search || ''),
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
        req.end();
    });
}

/**
 * POST /api/media/enqueue
 * Body: { url: string, mode?: 1-5, cols?: number, vol?: 0-5, pixel?: boolean, loop?: boolean }
 * Enqueues a video URL (or local path) into stream_server.py.
 */
app.post('/api/media/enqueue', mediaLimiter, async (req, res) => {
    try {
        const { url, mode = 1, cols, vol = 1, pixel = false, loop = false } = req.body || {};
        if (!url || typeof url !== 'string' || !url.trim()) {
            return res.status(400).json({ ok: false, error: 'Missing or invalid "url".' });
        }
        const result = await proxyToStream('/api/enqueue', { url: url.trim(), mode, cols, vol, pixel, loop });
        res.status(result.status).json(result.body);
    } catch (err) {
        console.error('[POST /api/media/enqueue]', err);
        res.status(503).json({ ok: false, error: 'Stream server unreachable. Is ASCILINE running?' });
    }
});

/**
 * POST /api/media/skip
 * Skips to the next video in the queue.
 */
app.post('/api/media/skip', mediaLimiter, async (req, res) => {
    try {
        const result = await proxyToStream('/api/skip', {});
        res.status(result.status).json(result.body);
    } catch (err) {
        console.error('[POST /api/media/skip]', err);
        res.status(503).json({ ok: false, error: 'Stream server unreachable.' });
    }
});

/**
 * POST /api/media/stop
 * Stops playback and clears the queue.
 */
app.post('/api/media/stop', mediaLimiter, async (req, res) => {
    try {
        const result = await proxyToStream('/api/stop', {});
        res.status(result.status).json(result.body);
    } catch (err) {
        console.error('[POST /api/media/stop]', err);
        res.status(503).json({ ok: false, error: 'Stream server unreachable.' });
    }
});

/**
 * POST /api/media/seek
 * Body: { time: number }  — seconds to seek to
 */
app.post('/api/media/seek', mediaLimiter, async (req, res) => {
    try {
        const time = Number(req.body?.time ?? -1);
        if (time < 0) return res.status(400).json({ ok: false, error: '"time" must be >= 0.' });
        const result = await proxyToStream('/api/seek', { time });
        res.status(result.status).json(result.body);
    } catch (err) {
        console.error('[POST /api/media/seek]', err);
        res.status(503).json({ ok: false, error: 'Stream server unreachable.' });
    }
});

/**
 * POST /api/media/volume
 * Body: { vol: 0-5 }
 */
app.post('/api/media/volume', mediaLimiter, async (req, res) => {
    try {
        const vol = Number(req.body?.vol ?? -1);
        if (vol < 0 || vol > 5) return res.status(400).json({ ok: false, error: '"vol" must be 0-5.' });
        const result = await proxyToStream('/api/volume', { vol });
        res.status(result.status).json(result.body);
    } catch (err) {
        console.error('[POST /api/media/volume]', err);
        res.status(503).json({ ok: false, error: 'Stream server unreachable.' });
    }
});

/**
 * POST /api/media/loop
 * Body: { enabled: boolean }
 */
app.post('/api/media/loop', mediaLimiter, async (req, res) => {
    try {
        const enabled = req.body?.enabled;
        if (typeof enabled !== 'boolean') return res.status(400).json({ ok: false, error: '"enabled" must be a boolean.' });
        const result = await proxyToStream('/api/loop', { enabled });
        res.status(result.status).json(result.body);
    } catch (err) {
        console.error('[POST /api/media/loop]', err);
        res.status(503).json({ ok: false, error: 'Stream server unreachable.' });
    }
});

/**
 * GET /api/media/status
 * Returns now-playing info: current video, queue length, fps, mode, etc.
 */
app.get('/api/media/status', mediaLimiter, async (req, res) => {
    try {
        const result = await proxyGetToStream('/api/status');
        res.status(result.status).json(result.body);
    } catch (err) {
        console.error('[GET /api/media/status]', err);
        res.status(503).json({ ok: false, error: 'Stream server unreachable. Is ASCILINE running?' });
    }
});

/**
 * GET /api/media/queue
 * Returns the full current queue.
 */
app.get('/api/media/queue', mediaLimiter, async (req, res) => {
    try {
        const result = await proxyGetToStream('/api/queue');
        res.status(result.status).json(result.body);
    } catch (err) {
        console.error('[GET /api/media/queue]', err);
        res.status(503).json({ ok: false, error: 'Stream server unreachable.' });
    }
});

// ── POST /webhook/trigger ─────────────────────────────────────────────────────
app.post('/webhook/trigger', webhookLimiter, async (req, res) => {
    try {
        const guildId   = req.headers['x-sigil-guild-id'];
        const signature = req.headers['x-sigil-signature'];
        if (!guildId) return res.status(400).json({ ok: false, error: 'Missing x-sigil-guild-id header.' });
        const config = getConfig(guildId);
        if (config.webhook_secret) {
            if (!verifyHmac(req.rawBody, config.webhook_secret, signature || '')) {
                return res.status(401).json({ ok: false, error: 'Invalid signature.' });
            }
        }
        if (!config.webhook_channel) {
            return res.status(400).json({ ok: false, error: 'No webhook channel configured for this guild. Use /sigilconfig webhook.' });
        }
        const { type, ...payload } = req.body;
        payload.guildId = guildId;
        payload.client  = global.sigilClient;
        if (!payload.client) {
            return res.status(503).json({ ok: false, error: 'Bot client not ready yet.' });
        }
        switch (type) {
            case 'twitch.live':      await handleTwitchLive(payload);    break;
            case 'youtube.upload':   await handleYouTubeUpload(payload); break;
            case 'github.push':      await handleGitHubPush(payload);    break;
            default:
                return res.status(400).json({ ok: false, error: `Unknown event type: ${type}` });
        }
        res.json({ ok: true, type });
    } catch (err) {
        console.error('[/webhook/trigger]', err);
        res.status(500).json({ ok: false, error: 'Internal error.' });
    }
});

// ── POST /preview ─────────────────────────────────────────────────────────────
app.post('/preview', renderLimiter, async (req, res) => {
    try {
        const b = req.body || {};
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
        if (b.member_count) {
            ctx.font = `13px Arial`; ctx.fillStyle = primary + 'cc';
            ctx.fillText(String(b.member_count), TX, H * 0.30 + 106);
        }
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
        ctx.fillText(`\uD83D\uDE80 Level ${boost_level} • ${boost_count} Boosts`, 24, 82);
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

app.listen(PORT, '0.0.0.0', () => console.log(`[GUI] Sigil GUI server v2.2.0 on http://localhost:${PORT}`));
