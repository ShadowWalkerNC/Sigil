// canvas.js — shared render utilities for Sigil
const { createCanvas } = require('canvas');
const { getBackgroundById } = require('./backgrounds.js');
const { getBorderById } = require('./borders.js');
const { registerAllFonts: _regFonts, getAllFontFamilies } = require('./fonts.js');

// Default dimensions (used as fallbacks)
const ICON_SIZE_DEFAULT   = 512;
const BANNER_W_DEFAULT    = 1200;
const BANNER_H_DEFAULT    = 400;
const PALETTE_W   = 600;
const PALETTE_H   = 100;

let _fontsRegistered = false;
function registerAllFonts() {
    if (_fontsRegistered) return;
    _regFonts();
    _fontsRegistered = true;
}

function autoFontSize(ctx, text, maxWidth, startSize) {
    let size = startSize;
    ctx.font = `bold ${size}px "${ctx.__fontFamily ?? 'Arial'}"`;
    while (ctx.measureText(text).width > maxWidth && size > 12) {
        size -= 2;
        ctx.font = `bold ${size}px "${ctx.__fontFamily ?? 'Arial'}"`;
    }
    return size;
}

/**
 * Render a square (or custom-size) icon and return a PNG Buffer.
 */
async function renderIcon(opts = {}) {
    const {
        text       = 'SIGIL',
        background = 'gradient-purple',
        border     = 'none',
        primary    = '#ffffff',
        secondary  = '#aaaaaa',
        font       = getAllFontFamilies()[0] ?? 'Arial',
        glow       = 0,
        opacity    = 1.0,
        width,
        height,
    } = opts;

    // If a preset is square or smaller than banner, treat it as an icon canvas.
    // Fall back to default 512×512 if not supplied.
    const W = Number(width)  || ICON_SIZE_DEFAULT;
    const H = Number(height) || ICON_SIZE_DEFAULT;

    const canvas = createCanvas(W, H);
    const ctx    = canvas.getContext('2d');
    ctx.__fontFamily = font;

    ctx.globalAlpha = opacity;
    try { getBackgroundById(background).draw(ctx, W, H); } catch { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); }
    ctx.globalAlpha = 1.0;

    if (glow > 0) { ctx.shadowColor = primary; ctx.shadowBlur = glow * 2; }

    const fontSize = autoFontSize(ctx, text, W * 0.85, Math.round(W * 0.23));
    ctx.font = `bold ${fontSize}px "${font}"`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    const grad = ctx.createLinearGradient(0, H * 0.3, 0, H * 0.7);
    grad.addColorStop(0, primary);
    grad.addColorStop(1, secondary);
    ctx.fillStyle = grad;
    ctx.fillText(text, W / 2, H / 2);
    ctx.shadowBlur = 0;

    try { getBorderById(border).draw(ctx, W, H, primary, secondary, glow); } catch {}

    return canvas.toBuffer('image/png');
}

/**
 * Render a banner at the requested dimensions and return a PNG Buffer.
 */
async function renderBanner(opts = {}) {
    const {
        text       = 'SIGIL',
        subtitle   = '',
        background = 'gradient-purple',
        border     = 'none',
        primary    = '#ffffff',
        secondary  = '#aaaaaa',
        font       = getAllFontFamilies()[0] ?? 'Arial',
        align      = 'center',
        glow       = 0,
        opacity    = 1.0,
        width,
        height,
    } = opts;

    // Use preset dimensions when available; fall back to classic 1200×400.
    const W = Number(width)  || BANNER_W_DEFAULT;
    const H = Number(height) || BANNER_H_DEFAULT;

    const canvas = createCanvas(W, H);
    const ctx    = canvas.getContext('2d');
    ctx.__fontFamily = font;

    ctx.globalAlpha = opacity;
    try { getBackgroundById(background).draw(ctx, W, H); } catch { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); }
    ctx.globalAlpha = 1.0;

    if (glow > 0) { ctx.shadowColor = primary; ctx.shadowBlur = glow * 2; }

    const fontSize = autoFontSize(ctx, text, W * 0.85, Math.round(H * 0.25));
    ctx.font = `bold ${fontSize}px "${font}"`;
    ctx.textAlign    = align;
    ctx.textBaseline = 'middle';
    const x = align === 'center' ? W / 2 : align === 'left' ? 60 : W - 60;
    const grad = ctx.createLinearGradient(0, H * 0.3, 0, H * 0.7);
    grad.addColorStop(0, primary);
    grad.addColorStop(1, secondary);
    ctx.fillStyle = grad;
    ctx.fillText(text, x, subtitle ? H * 0.42 : H / 2);
    ctx.shadowBlur = 0;

    if (subtitle) {
        const subSize = Math.max(18, Math.floor(fontSize * 0.38));
        ctx.font = `${subSize}px "${font}"`;
        ctx.fillStyle = secondary;
        ctx.fillText(subtitle, x, H * 0.65);
    }

    try { getBorderById(border).draw(ctx, W, H, primary, secondary, glow); } catch {}

    return canvas.toBuffer('image/png');
}

/**
 * Render a color palette strip and return a PNG Buffer.
 */
async function renderPalette(colors = []) {
    const palette = colors.length ? colors : ['#6a0dad', '#0057e7', '#cc0000', '#ffd700', '#00cccc'];
    const canvas = createCanvas(PALETTE_W, PALETTE_H);
    const ctx    = canvas.getContext('2d');
    const sw     = PALETTE_W / palette.length;
    palette.forEach((color, i) => {
        ctx.fillStyle = color;
        ctx.fillRect(i * sw, 0, sw, PALETTE_H);
        ctx.fillStyle = '#ffffff88';
        ctx.font = '13px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(color, i * sw + sw / 2, PALETTE_H - 10);
    });
    return canvas.toBuffer('image/png');
}

/**
 * Convenience: render icon + banner + palette in parallel.
 * opts.width / opts.height are forwarded to both renderIcon and renderBanner.
 */
async function renderKit(opts = {}) {
    const [iconBuf, bannerBuf, paletteBuf] = await Promise.all([
        renderIcon(opts),
        renderBanner(opts),
        renderPalette(opts.palette),
    ]);
    return { iconBuf, bannerBuf, paletteBuf };
}

module.exports = { registerAllFonts, getAllFontFamilies, autoFontSize, renderIcon, renderBanner, renderPalette, renderKit };
