// gui-server.js — Sigil GUI bridge server v2.0
// Run with: node gui/gui-server.js

const express = require('express');
const path    = require('path');
const { createCanvas, loadImage } = require('canvas');
const { renderKit, registerAllFonts } = require('../src/utils/canvas.js');
const { geminiRequest, geminiImageRequest, extractJson } = require('../src/utils/gemini.js');
const { getBackgroundById } = require('../src/utils/backgrounds.js');
require('dotenv').config();

registerAllFonts();

const app  = express();
const PORT = Number(process.env.PORT) || 8080;

app.use(express.json({ limit: '4mb' }));

// ── Helpers ───────────────────────────────────────────────────────────────

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'sigil-gui-builder.html')));
app.get('/health', (req, res) => res.json({ ok: true, version: '2.0.0' }));

function clamp(n, min, max) { const v = Number(n); return isNaN(v) ? min : Math.min(max, Math.max(min, v)); }
function safeHex(hex, fallback = '#ffffff') {
    return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(String(hex || '').trim()) ? String(hex).trim() : fallback;
}
function parseDimensions(b) { return { width: clamp(b.width, 64, 3840) || undefined, height: clamp(b.height, 64, 2160) || undefined }; }
const VALID_SHAPES = new Set(['circle', 'rounded', 'hexagon', 'diamond', 'square']);
function safeShape(s) { const v = String(s || 'square').toLowerCase().trim(); return VALID_SHAPES.has(v) ? v : 'square'; }

function classifyError(err) {
    const msg = String(err?.message || err);
    if (msg.includes('429') || msg.includes('RESOURCE_EXHAUSTED')) return '⚠️ Gemini quota exceeded. Wait a minute and try again.';
    if (msg.includes('API_KEY_INVALID') || (msg.includes('400') && msg.includes('key'))) return '⚠️ Invalid Gemini API key.';
    if (msg.includes('403') || msg.includes('PERMISSION_DENIED')) return '⚠️ Gemini key lacks permission.';
    if (msg.includes('503') || msg.includes('UNAVAILABLE')) return '⚠️ Gemini temporarily unavailable.';
    if (msg.includes('fetch') || msg.includes('ENOTFOUND')) return '⚠️ Network error — check your connection.';
    return '⚠️ ' + msg.split('\n')[0].slice(0, 120);
}

// ── POST /preview — Brand kit (icon + banner + palette) ───────────────────
app.post('/preview', async (req, res) => {
    try {
        const b = req.body || {};
        const text       = String(b.icon_text    || b.text   || 'SIGIL').slice(0, 8).toUpperCase();
        const bannerText = String(b.banner_text  || b.text   || text);
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

// ── POST /preview/welcome — Welcome card preview ──────────────────────────
app.post('/preview/welcome', async (req, res) => {
    try {
        const b = req.body || {};
        const W = 900, H = 300;
        const username = String(b.username || 'NewMember').slice(0, 32);
        const message  = String(b.message  || 'Welcome to the server!');
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
        ctx.font = '12px Arial'; ctx.fillStyle = '#ffffff18'; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
        ctx.fillText('made with Sigil', W - 12, H - 8);

        res.json({ ok: true, image_b64: canvas.toBuffer('image/png').toString('base64') });
    } catch (err) { console.error('[/preview/welcome]', err); res.status(500).json({ ok: false, error: classifyError(err) }); }
});

// ── POST /preview/rankcard ─────────────────────────────────────────────────
app.post('/preview/rankcard', async (req, res) => {
    try {
        const b = req.body || {};
        const W = 800, H = 200;
        const username    = String(b.username    || 'Player').slice(0, 32);
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

// ── POST /preview/serverstats ──────────────────────────────────────────────
app.post('/preview/serverstats', async (req, res) => {
    try {
        const b = req.body || {};
        const W = 860, H = 480;
        const server_name  = String(b.server_name  || 'My Server').slice(0, 48);
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
        const bl = `🚀 Level ${boost_level} • ${boost_count} Boosts`;
        ctx.fillText(bl, 24, 82);
        ctx.fillStyle = '#ffffff22'; ctx.fillRect(24, 100, W - 48, 1);

        const stats = [
            { label: 'MEMBERS',  value: member_count.toLocaleString(),  icon: '👥' },
            { label: 'CHANNELS', value: channel_count.toString(),        icon: '💬' },
            { label: 'ROLES',    value: role_count.toString(),           icon: '🏷️' },
            { label: 'EMOJI',    value: emoji_count.toString(),          icon: '😄' },
            { label: 'BOOSTS',   value: boost_count.toString(),          icon: '🚀' },
            { label: 'AGE',      value: `${age_days}d`,                  icon: '📅' },
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

// ── POST /generate — AI brand kit ─────────────────────────────────────────
app.post('/generate', async (req, res) => {
    const b = req.body || {};
    const gemini_key   = String(b.gemini_key   || '').trim();
    const description  = String(b.description  || '').trim();
    const image_prompt = String(b.image_prompt || '').trim();
    const model        = String(b.model || 'gemini-2.0-flash').trim();
    const temperature  = clamp(b.temperature, 0, 2);
    const { width, height } = parseDimensions(b);

    if (!gemini_key && !process.env.GEMINI_API_KEY)
        return res.status(400).json({ ok: false, error: '⚠️ Enter your Gemini API key in Step 4 first.' });

    const originalKey = process.env.GEMINI_API_KEY;
    if (gemini_key) process.env.GEMINI_API_KEY = gemini_key;

    try {
        const prompt = `You are a professional brand designer. Based on this server description, design a complete Discord server brand kit.

Description: "${description}"

Respond with ONLY valid JSON (no markdown, no explanation):
{
  "name": "<short brand name>",
  "tagline": "<catchy tagline under 60 chars>",
  "primary_color": "<hex>",
  "secondary_color": "<hex>",
  "background": "<one of: midnight-gradient, deep-space, inferno, ocean-depth, twilight, aurora, storm, void, neon-city, sunset-fade, forest-night, polar>",
  "border": "<one of: none, solid, glow, gradient, double, dashed>",
  "font": "<one of: Arial Black, Impact, Bebas Neue, Oswald, Playfair Display, Source Code Pro, Dancing Script>",
  "shape": "<one of: circle, rounded, square, hexagon, diamond>",
  "glow": <number 0-25>,
  "palette": ["<hex1>", "<hex2>", "<hex3>", "<hex4>", "<hex5>"],
  "image_prompt": "<concise visual prompt for an icon/logo image>"
}`;

        let brand;
        try { const raw = await geminiRequest(prompt, { model, temperature }); brand = extractJson(raw); }
        catch (err) { return res.status(500).json({ ok: false, error: classifyError(err) }); }

        const primary    = safeHex(brand.primary_color,   '#8B0000');
        const secondary  = safeHex(brand.secondary_color, '#4B0082');
        const glow       = clamp(brand.glow, 0, 25);
        const shape      = safeShape(brand.shape);
        const palette    = Array.isArray(brand.palette) ? brand.palette.map(h => safeHex(h, primary)) : [];
        const background = String(brand.background || 'midnight-gradient');
        const border     = String(brand.border     || 'none');
        const font       = String(brand.font       || 'Arial Black');

        const { iconBuf, bannerBuf, paletteBuf } = await renderKit({
            text: brand.name || 'SIGIL', bannerText: brand.name || 'SIGIL',
            subtitle: brand.tagline || '', background, border, primary, secondary,
            font, glow, shape, palette, width, height,
        });

        const finalPrompt = image_prompt || brand.image_prompt || `Minimalist logo for: ${brand.name}`;
        let ai_image_b64 = null;
        try { ai_image_b64 = await geminiImageRequest(finalPrompt); } catch { /* silent */ }

        res.json({
            ok: true,
            brand: { ...brand, primary_color: primary, secondary_color: secondary, glow, shape, palette },
            icon_b64:    iconBuf.toString('base64'),
            banner_b64:  bannerBuf.toString('base64'),
            palette_b64: paletteBuf.toString('base64'),
            ai_image_b64,
        });
    } catch (err) { console.error('[/generate]', err); res.status(500).json({ ok: false, error: classifyError(err) }); }
    finally { if (gemini_key) process.env.GEMINI_API_KEY = originalKey; }
});

app.listen(PORT, '0.0.0.0', () => console.log(`[GUI] Sigil GUI server v2.0.0 on http://localhost:${PORT}`));
