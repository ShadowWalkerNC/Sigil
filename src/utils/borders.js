// borders.js — all border style definitions for Sigil
// Border draw() functions receive shape so the stroke follows the icon outline.

/**
 * Build a border path matching the given shape.
 * Call ctx.beginPath() before this, then ctx.stroke() after.
 */
function buildBorderPath(ctx, w, h, shape, inset = 4) {
    const i = inset;
    switch (shape) {
        case 'circle': {
            const r = Math.min(w, h) / 2 - i;
            ctx.arc(w / 2, h / 2, r, 0, Math.PI * 2);
            break;
        }
        case 'rounded': {
            const r = Math.min(w, h) * 0.12;
            ctx.roundRect(i, i, w - i * 2, h - i * 2, r);
            break;
        }
        case 'hexagon': {
            const pts = [
                [0.50, 0.00], [0.93, 0.25], [0.93, 0.75],
                [0.50, 1.00], [0.07, 0.75], [0.07, 0.25],
            ];
            // Slightly inset each point toward centre
            const cx = w / 2, cy = h / 2;
            ctx.moveTo(...pts[0].map((v, idx) => {
                const raw = idx === 0 ? v * w : v * h;
                return raw + (idx === 0 ? cx - raw : cy - raw) * (i / (Math.min(w, h) / 2));
            }));
            for (let pi = 1; pi < pts.length; pi++) {
                const [px, py] = pts[pi];
                const rx = px * w, ry = py * h;
                ctx.lineTo(
                    rx + (cx - rx) * (i / (Math.min(w, h) / 2)),
                    ry + (cy - ry) * (i / (Math.min(w, h) / 2))
                );
            }
            ctx.closePath();
            break;
        }
        case 'diamond': {
            const cx = w / 2, cy = h / 2;
            const f = i / (Math.min(w, h) / 2);
            ctx.moveTo(cx,         0  + (cy - 0)  * f);
            ctx.lineTo(w   - (w - cx) * f, cy);
            ctx.lineTo(cx,         h  - (h - cy) * f);
            ctx.lineTo(0   + cx * f,       cy);
            ctx.closePath();
            break;
        }
        default: // 'square'
            ctx.rect(i, i, w - i * 2, h - i * 2);
    }
}

const BORDERS = [
    {
        id: 'none',
        label: 'None',
        draw() {},
    },
    {
        id: 'solid',
        label: 'Solid',
        draw(ctx, w, h, primary, _secondary, glow, shape = 'square') {
            if (glow > 0) { ctx.shadowColor = primary; ctx.shadowBlur = glow; }
            ctx.strokeStyle = primary;
            ctx.lineWidth = 6;
            ctx.beginPath();
            buildBorderPath(ctx, w, h, shape, 4);
            ctx.stroke();
            ctx.shadowBlur = 0;
        },
    },
    {
        id: 'glow',
        label: 'Glow',
        draw(ctx, w, h, primary, _secondary, glow, shape = 'square') {
            ctx.shadowColor = primary;
            ctx.shadowBlur  = Math.max(glow, 20);
            ctx.strokeStyle = primary;
            ctx.lineWidth = 4;
            ctx.beginPath();
            buildBorderPath(ctx, w, h, shape, 4);
            ctx.stroke();
            ctx.shadowBlur = 0;
        },
    },
    {
        id: 'gradient',
        label: 'Gradient',
        draw(ctx, w, h, primary, secondary, glow, shape = 'square') {
            const g = ctx.createLinearGradient(0, 0, w, h);
            g.addColorStop(0, primary);
            g.addColorStop(1, secondary);
            ctx.strokeStyle = g;
            ctx.lineWidth = 6;
            if (glow > 0) { ctx.shadowColor = primary; ctx.shadowBlur = glow; }
            ctx.beginPath();
            buildBorderPath(ctx, w, h, shape, 4);
            ctx.stroke();
            ctx.shadowBlur = 0;
        },
    },
    {
        id: 'double',
        label: 'Double',
        draw(ctx, w, h, primary, secondary, glow, shape = 'square') {
            ctx.strokeStyle = primary;
            ctx.lineWidth = 3;
            if (glow > 0) { ctx.shadowColor = primary; ctx.shadowBlur = glow; }
            ctx.beginPath();
            buildBorderPath(ctx, w, h, shape, 4);
            ctx.stroke();
            ctx.shadowBlur = 0;
            // Inner ring
            ctx.strokeStyle = secondary;
            ctx.lineWidth = 2;
            ctx.beginPath();
            buildBorderPath(ctx, w, h, shape, 12);
            ctx.stroke();
        },
    },
    {
        id: 'dashed',
        label: 'Dashed',
        draw(ctx, w, h, primary, _secondary, glow, shape = 'square') {
            ctx.setLineDash([12, 8]);
            ctx.strokeStyle = primary;
            ctx.lineWidth = 4;
            if (glow > 0) { ctx.shadowColor = primary; ctx.shadowBlur = glow; }
            ctx.beginPath();
            buildBorderPath(ctx, w, h, shape, 4);
            ctx.stroke();
            ctx.shadowBlur = 0;
            ctx.setLineDash([]);
        },
    },
    {
        id: 'neon',
        label: 'Neon',
        draw(ctx, w, h, primary, _secondary, glow, shape = 'square') {
            // Three stacked strokes: wide dim outer → medium mid → thin bright core
            const layers = [
                { lw: 12, alpha: 0.25, blur: Math.max(glow, 30) },
                { lw: 6,  alpha: 0.55, blur: Math.max(glow, 15) },
                { lw: 2,  alpha: 1.00, blur: Math.max(glow,  8) },
            ];
            for (const { lw, alpha, blur } of layers) {
                ctx.save();
                ctx.globalAlpha = alpha;
                ctx.shadowColor = primary;
                ctx.shadowBlur  = blur;
                ctx.strokeStyle = primary;
                ctx.lineWidth   = lw;
                ctx.beginPath();
                buildBorderPath(ctx, w, h, shape, 6);
                ctx.stroke();
                ctx.restore();
            }
        },
    },
    {
        id: 'rainbow',
        label: 'Rainbow',
        draw(ctx, w, h, _primary, _secondary, glow, shape = 'square') {
            // Conic gradient approximated as 6-stop linear around the perimeter
            const g = ctx.createLinearGradient(0, 0, w, h);
            g.addColorStop(0.00, '#ff0000');
            g.addColorStop(0.17, '#ff8800');
            g.addColorStop(0.33, '#ffff00');
            g.addColorStop(0.50, '#00cc44');
            g.addColorStop(0.67, '#0088ff');
            g.addColorStop(0.83, '#8800ff');
            g.addColorStop(1.00, '#ff0000');
            ctx.strokeStyle = g;
            ctx.lineWidth = 5;
            if (glow > 0) { ctx.shadowColor = '#ffffff'; ctx.shadowBlur = glow; }
            ctx.beginPath();
            buildBorderPath(ctx, w, h, shape, 4);
            ctx.stroke();
            ctx.shadowBlur = 0;
        },
    },
];

function getBorderById(id) {
    return BORDERS.find(b => b.id === id) ?? BORDERS[0];
}

function getBorderChoices() {
    return BORDERS.map(b => ({ name: b.label, value: b.id }));
}

function getAllBorderIds() {
    return BORDERS.map(b => b.id);
}

module.exports = { BORDERS, getBorderById, getBorderChoices, getAllBorderIds };
