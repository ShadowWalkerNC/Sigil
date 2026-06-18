// canvas.js — shared render utilities for Sigil
const { createCanvas } = require('canvas');
const { getBackgroundById } = require('./backgrounds.js');
const { getBorderById } = require('./borders.js');
const { registerAllFonts: _regFonts, getAllFontFamilies } = require('./fonts.js');

const ICON_SIZE   = 512;
const BANNER_W    = 1200;
const BANNER_H    = 400;
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
 * Render a square icon and return a PNG Buffer.
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
    } = opts;

    const canvas = createCanvas(ICON_SIZE, ICON_SIZE);
    const ctx    = canvas.getContext('2d');
    ctx.__fontFamily = font;

    // Background
    ctx.globalAlpha = opacity;
    try { getBackgroundById(background).draw(ctx, ICON_SIZE, ICON_SIZE); } catch { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, ICON_SIZE, ICON_SIZE); }
    ctx.globalAlpha = 1.0;

    // Glow text shadow
    if (glow > 0) { ctx.shadowColor = primary; ctx.shadowBlur = glow * 2; }

    // Text
    const fontSize = autoFontSize(ctx, text, ICON_SIZE * 0.85, 120);
    ctx.font = `bold ${fontSize}px "${font}"`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    const grad = ctx.createLinearGradient(0, ICON_SIZE * 0.3, 0, ICON_SIZE * 0.7);
    grad.addColorStop(0, primary);
    grad.addColorStop(1, secondary);
    ctx.fillStyle = grad;
    ctx.fillText(text, ICON_SIZE / 2, ICON_SIZE / 2);
    ctx.shadowBlur = 0;

    // Border
    try { getBorderById(border).draw(ctx, ICON_SIZE, ICON_SIZE, primary, secondary, glow); } catch {}

    return canvas.toBuffer('image/png');
}

/**
 * Render a wide banner and return a PNG Buffer.
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
    } = opts;

    const canvas = createCanvas(BANNER_W, BANNER_H);
    const ctx    = canvas.getContext('2d');
    ctx.__fontFamily = font;

    ctx.globalAlpha = opacity;
    try { getBackgroundById(background).draw(ctx, BANNER_W, BANNER_H); } catch { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, BANNER_W, BANNER_H); }
    ctx.globalAlpha = 1.0;

    if (glow > 0) { ctx.shadowColor = primary; ctx.shadowBlur = glow * 2; }

    const fontSize = autoFontSize(ctx, text, BANNER_W * 0.85, 100);
    ctx.font = `bold ${fontSize}px "${font}"`;
    ctx.textAlign    = align;
    ctx.textBaseline = 'middle';
    const x = align === 'center' ? BANNER_W / 2 : align === 'left' ? 60 : BANNER_W - 60;
    const grad = ctx.createLinearGradient(0, BANNER_H * 0.3, 0, BANNER_H * 0.7);
    grad.addColorStop(0, primary);
    grad.addColorStop(1, secondary);
    ctx.fillStyle = grad;
    ctx.fillText(text, x, subtitle ? BANNER_H * 0.42 : BANNER_H / 2);
    ctx.shadowBlur = 0;

    if (subtitle) {
        const subSize = Math.max(18, Math.floor(fontSize * 0.38));
        ctx.font = `${subSize}px "${font}"`;
        ctx.fillStyle = secondary;
        ctx.fillText(subtitle, x, BANNER_H * 0.65);
    }

    try { getBorderById(border).draw(ctx, BANNER_W, BANNER_H, primary, secondary, glow); } catch {}

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
