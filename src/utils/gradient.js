/**
 * createTextGradient
 *
 * Returns a CanvasGradient spanning the rendered text when color2 is
 * provided, or the plain color string when it is not. The gradient is
 * always horizontal (left-to-right) and sized to the measured text
 * width so the full colour range is always visible regardless of
 * canvas size or font size.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} color  - Start hex color (also used as solid fallback)
 * @param {string|null} color2 - End hex color; null = solid fill
 * @param {string} text   - The string about to be drawn
 * @param {number} x      - The x draw-origin (respects textAlign)
 * @param {number} canvasWidth - Full canvas width (used when text is wider)
 * @returns {string|CanvasGradient}
 */
function createTextGradient(ctx, color, color2, text, x, canvasWidth) {
    if (!color2) return color;

    const metrics = ctx.measureText(text);
    const halfWidth = metrics.width / 2;

    // Anchor gradient to the visible text span regardless of alignment
    const align = ctx.textAlign;
    let x0, x1;
    if (align === 'left') {
        x0 = x;
        x1 = x + metrics.width;
    } else if (align === 'right') {
        x0 = x - metrics.width;
        x1 = x;
    } else {
        x0 = x - halfWidth;
        x1 = x + halfWidth;
    }

    const gradient = ctx.createLinearGradient(x0, 0, x1, 0);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, color2);
    return gradient;
}

module.exports = { createTextGradient };
