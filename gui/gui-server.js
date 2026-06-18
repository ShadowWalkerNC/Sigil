// gui-server.js — Sigil GUI bridge server
// Run with: node gui/gui-server.js

const express = require('express');
const path    = require('path');
const { renderKit, registerAllFonts } = require('../src/utils/canvas.js');
const { geminiRequest, geminiImageRequest, extractJson } = require('../src/utils/gemini.js');
require('dotenv').config();

registerAllFonts();

const app  = express();
const PORT = Number(process.env.PORT) || 8080;

app.use(express.json({ limit: '2mb' }));

// ── Helpers ───────────────────────────────────────────────────────────────

/** Serve the GUI HTML */
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'sigil-gui-builder.html'));
});

/** Health check */
app.get('/health', (req, res) => {
    res.json({ ok: true, version: '1.4.0' });
});

/** Clamp a number to [min, max] */
function clamp(n, min, max) {
    const v = Number(n);
    return isNaN(v) ? min : Math.min(max, Math.max(min, v));
}

/** Basic hex validation — returns fallback if invalid */
function safeHex(hex, fallback = '#ffffff') {
    return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(String(hex).trim()) ? String(hex).trim() : fallback;
}

/** Turn raw errors into short user-friendly strings */
function classifyError(err) {
    const msg = String(err?.message || err);
    if (msg.includes('429') || msg.includes('Too Many Requests') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('Quota exceeded'))
        return '\u26a0\ufe0f Gemini free-tier quota exceeded. Wait a few minutes and try again, or add a paid API key.';
    if (msg.includes('API_KEY_INVALID') || (msg.includes('400') && msg.includes('key')))
        return '\u26a0\ufe0f Invalid Gemini API key. Double-check the key in Step 4.';
    if (msg.includes('403') || msg.includes('PERMISSION_DENIED'))
        return '\u26a0\ufe0f Gemini API key does not have permission. Check your key at aistudio.google.com.';
    if (msg.includes('503') || msg.includes('unavailable') || msg.includes('UNAVAILABLE'))
        return '\u26a0\ufe0f Gemini is temporarily unavailable. Try again in a moment.';
    if (msg.includes('fetch') || msg.includes('ENOTFOUND') || msg.includes('ECONNREFUSED'))
        return '\u26a0\ufe0f Network error — could not reach Gemini. Check your connection.';
    if (msg.includes('JSON') || msg.includes('Unexpected token') || msg.includes('extractJson'))
        return '\u26a0\ufe0f Gemini returned an unreadable response. Try again.';
    return '\u26a0\ufe0f ' + msg.split('\n')[0].slice(0, 120);
}

// ── POST /preview ─────────────────────────────────────────────────────────
// Fast canvas-only render. GUI sends visuals object — field names normalised here.
app.post('/preview', async (req, res) => {
    try {
        const b = req.body || {};

        // Accept both GUI field names (icon_text, primary_color) and legacy names (text, primary)
        const text       = String(b.icon_text    || b.text       || 'SIGIL').slice(0, 8).toUpperCase();
        const bannerText = String(b.banner_text  || b.text       || text);
        const primary    = safeHex(b.primary_color   || b.primary,   '#8B0000');
        const secondary  = safeHex(b.secondary_color || b.secondary, '#4B0082');
        const background = String(b.background || 'midnight-gradient');
        const border     = String(b.border     || 'none');
        const font       = String(b.font       || 'Arial Black');
        const glow       = clamp(b.glow,    0,  25);
        const opacity    = clamp(b.opacity,  0,   1);
        const palette    = Array.isArray(b.palette) ? b.palette.map(h => safeHex(h, primary)) : [];

        const { iconBuf, bannerBuf, paletteBuf } = await renderKit({
            text, bannerText, background, border, primary, secondary,
            font, glow, opacity, palette,
        });

        res.json({
            ok: true,
            icon_b64:    iconBuf.toString('base64'),
            banner_b64:  bannerBuf.toString('base64'),
            palette_b64: paletteBuf.toString('base64'),
        });
    } catch (err) {
        console.error('[/preview]', err);
        res.status(500).json({ ok: false, error: classifyError(err) });
    }
});

// ── POST /generate ────────────────────────────────────────────────────────
// Full AI brand kit: Gemini text + canvas render + optional AI image.
app.post('/generate', async (req, res) => {
    const b = req.body || {};
    const gemini_key   = String(b.gemini_key   || '').trim();
    const description  = String(b.description  || '').trim();
    const image_prompt = String(b.image_prompt || '').trim();
    const model        = String(b.model || 'gemini-2.0-flash').trim();
    const temperature  = clamp(b.temperature, 0, 2);

    if (!gemini_key && !process.env.GEMINI_API_KEY) {
        return res.status(400).json({ ok: false, error: '\u26a0\ufe0f Enter your Gemini API key in Step 4 first.' });
    }

    // Swap in the GUI-supplied key for this request, restore in a finally block
    const originalKey = process.env.GEMINI_API_KEY;
    if (gemini_key) process.env.GEMINI_API_KEY = gemini_key;

    try {
        const prompt = `
You are a professional brand designer. Based on this server description, design a complete Discord server brand kit.

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
  "glow": <number 0-25>,
  "palette": ["<hex1>", "<hex2>", "<hex3>", "<hex4>", "<hex5>"],
  "image_prompt": "<concise visual prompt for an icon/logo image>"
}
`.trim();

        let brand;
        try {
            const raw = await geminiRequest(prompt, { model, temperature });
            brand = extractJson(raw);
        } catch (err) {
            return res.status(500).json({ ok: false, error: classifyError(err) });
        }

        // Sanitise AI-returned values before passing to canvas
        const primary    = safeHex(brand.primary_color,   '#8B0000');
        const secondary  = safeHex(brand.secondary_color, '#4B0082');
        const glow       = clamp(brand.glow, 0, 25);
        const palette    = Array.isArray(brand.palette) ? brand.palette.map(h => safeHex(h, primary)) : [];
        const background = String(brand.background || 'midnight-gradient');
        const border     = String(brand.border     || 'none');
        const font       = String(brand.font       || 'Arial Black');

        const { iconBuf, bannerBuf, paletteBuf } = await renderKit({
            text:       brand.name     || 'SIGIL',
            bannerText: brand.name     || 'SIGIL',
            subtitle:   brand.tagline  || '',
            background, border, primary, secondary,
            font, glow, palette,
        });

        // AI image — silent fail, never blocks the response
        const finalPrompt = image_prompt || brand.image_prompt || `Minimalist logo for: ${brand.name}`;
        let ai_image_b64 = null;
        try {
            ai_image_b64 = await geminiImageRequest(finalPrompt);
        } catch { /* intentionally silent */ }

        res.json({
            ok: true,
            brand: { ...brand, primary_color: primary, secondary_color: secondary, glow, palette },
            icon_b64:    iconBuf.toString('base64'),
            banner_b64:  bannerBuf.toString('base64'),
            palette_b64: paletteBuf.toString('base64'),
            ai_image_b64,
        });
    } catch (err) {
        console.error('[/generate]', err);
        res.status(500).json({ ok: false, error: classifyError(err) });
    } finally {
        // Always restore the original key — even on crash
        if (gemini_key) process.env.GEMINI_API_KEY = originalKey;
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`[GUI] Sigil GUI server v1.4.0 on http://localhost:${PORT}`);
});
