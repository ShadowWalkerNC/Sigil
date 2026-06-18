// gui-server.js — Sigil GUI bridge server
// Run with: node gui/gui-server.js
// Requires: express, canvas (same deps as the bot)

const express = require('express');
const path    = require('path');
const fs      = require('fs');
const { renderKit, registerAllFonts } = require('../src/utils/canvas.js');
const { geminiRequest, geminiImageRequest, extractJson } = require('../src/utils/gemini.js');
require('dotenv').config();

registerAllFonts();

const app  = express();
const PORT = Number(process.env.PORT) || 8080;

app.use(express.json({ limit: '2mb' }));

// Serve the GUI HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'sigil-gui-builder.html'));
});

// Health check
app.get('/health', (req, res) => {
    res.json({ ok: true, version: '1.3.0' });
});

// ── POST /preview ─────────────────────────────────────────────────────────
// Fast canvas-only render (no Gemini). Returns base64 PNGs.
app.post('/preview', async (req, res) => {
    try {
        const {
            text       = 'SIGIL',
            background = 'gradient-purple',
            border     = 'none',
            primary    = '#ffffff',
            secondary  = '#aaaaaa',
            font       = 'Another Danger',
            glow       = 0,
            opacity    = 1.0,
            palette    = [],
        } = req.body;

        const { iconBuf, bannerBuf, paletteBuf } = await renderKit({
            text, background, border, primary, secondary, font,
            glow: Number(glow), opacity: Number(opacity), palette,
        });

        res.json({
            icon_b64:    iconBuf.toString('base64'),
            banner_b64:  bannerBuf.toString('base64'),
            palette_b64: paletteBuf.toString('base64'),
        });
    } catch (err) {
        console.error('[/preview]', err);
        res.status(500).json({ error: err.message });
    }
});

// ── POST /generate ────────────────────────────────────────────────────────
// Full brand kit generation: Gemini text + canvas + optional AI image.
app.post('/generate', async (req, res) => {
    try {
        const {
            description  = '',
            image_prompt = '',
            gemini_key   = '',
        } = req.body;

        if (!gemini_key && !process.env.GEMINI_API_KEY) {
            return res.status(400).json({ error: 'Gemini API key required.' });
        }

        // Temporarily override env key if provided by GUI
        const originalKey = process.env.GEMINI_API_KEY;
        if (gemini_key) process.env.GEMINI_API_KEY = gemini_key;

        const prompt = `
You are a professional brand designer. Based on this server description, design a complete Discord server brand kit.

Description: "${description}"

Respond with ONLY valid JSON (no markdown, no explanation):
{
  "name": "<short brand name>",
  "tagline": "<catchy tagline under 60 chars>",
  "primary_color": "<hex>",
  "secondary_color": "<hex>",
  "background": "<one of: gradient-purple, gradient-blue, gradient-red, gradient-green, gradient-gold, gradient-teal, gradient-pink, gradient-orange, solid-black, solid-dark, noise-dark, grid-dark, dots-dark, radial-purple, radial-blue, bg-image-1, bg-image-2>",
  "border": "<one of: none, solid, glow, gradient, double, dashed>",
  "font": "<one of: Another Danger, Bebas Neue, Oswald, Playfair Display, Source Code Pro, Dancing Script>",
  "glow": <number 0-25>,
  "palette": ["<hex1>", "<hex2>", "<hex3>", "<hex4>", "<hex5>"],
  "image_prompt": "<concise visual prompt for an icon/logo image>"
}
`.trim();

        let brand;
        try {
            const raw = await geminiRequest(prompt);
            brand = extractJson(raw);
        } catch (err) {
            if (gemini_key) process.env.GEMINI_API_KEY = originalKey;
            return res.status(500).json({ error: 'Gemini returned unexpected response: ' + err.message });
        }

        const { name, tagline, primary_color, secondary_color, background, border, font, glow, palette, image_prompt: aiPrompt } = brand;

        const { iconBuf, bannerBuf, paletteBuf } = await renderKit({
            text: name, subtitle: tagline,
            background, border,
            primary: primary_color, secondary: secondary_color,
            font, glow: Number(glow), palette,
        });

        // Try AI image
        const finalPrompt = image_prompt || aiPrompt || `Minimalist logo for: ${name}`;
        let ai_image_b64 = null;
        try {
            ai_image_b64 = await geminiImageRequest(finalPrompt);
        } catch {}

        if (gemini_key) process.env.GEMINI_API_KEY = originalKey;

        res.json({
            brand,
            icon_b64:    iconBuf.toString('base64'),
            banner_b64:  bannerBuf.toString('base64'),
            palette_b64: paletteBuf.toString('base64'),
            ai_image_b64,
        });
    } catch (err) {
        console.error('[/generate]', err);
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`[GUI] Sigil GUI server running on http://localhost:${PORT}`);
});
