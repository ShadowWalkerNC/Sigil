// borders.js — all border style definitions for Sigil

const BORDERS = [
    {
        id: 'none',
        label: 'None',
        draw() {},  // no-op
    },
    {
        id: 'solid',
        label: 'Solid',
        draw(ctx, w, h, primary, secondary, glow) {
            ctx.strokeStyle = primary;
            ctx.lineWidth = 6;
            if (glow > 0) {
                ctx.shadowColor = primary;
                ctx.shadowBlur  = glow;
            }
            ctx.strokeRect(4, 4, w - 8, h - 8);
            ctx.shadowBlur = 0;
        },
    },
    {
        id: 'glow',
        label: 'Glow',
        draw(ctx, w, h, primary, secondary, glow) {
            ctx.shadowColor = primary;
            ctx.shadowBlur  = Math.max(glow, 20);
            ctx.strokeStyle = primary;
            ctx.lineWidth = 4;
            ctx.strokeRect(4, 4, w - 8, h - 8);
            ctx.shadowBlur = 0;
        },
    },
    {
        id: 'gradient',
        label: 'Gradient',
        draw(ctx, w, h, primary, secondary, glow) {
            const g = ctx.createLinearGradient(0, 0, w, h);
            g.addColorStop(0, primary);
            g.addColorStop(1, secondary);
            ctx.strokeStyle = g;
            ctx.lineWidth = 6;
            if (glow > 0) { ctx.shadowColor = primary; ctx.shadowBlur = glow; }
            ctx.strokeRect(4, 4, w - 8, h - 8);
            ctx.shadowBlur = 0;
        },
    },
    {
        id: 'double',
        label: 'Double',
        draw(ctx, w, h, primary, secondary, glow) {
            ctx.strokeStyle = primary;
            ctx.lineWidth = 3;
            if (glow > 0) { ctx.shadowColor = primary; ctx.shadowBlur = glow; }
            ctx.strokeRect(4, 4, w - 8, h - 8);
            ctx.shadowBlur = 0;
            ctx.strokeStyle = secondary;
            ctx.lineWidth = 2;
            ctx.strokeRect(10, 10, w - 20, h - 20);
        },
    },
    {
        id: 'dashed',
        label: 'Dashed',
        draw(ctx, w, h, primary, secondary, glow) {
            ctx.setLineDash([12, 8]);
            ctx.strokeStyle = primary;
            ctx.lineWidth = 4;
            if (glow > 0) { ctx.shadowColor = primary; ctx.shadowBlur = glow; }
            ctx.strokeRect(4, 4, w - 8, h - 8);
            ctx.shadowBlur = 0;
            ctx.setLineDash([]);
        },
    },
];

function getBorderById(id) {
    return BORDERS.find(b => b.id === id) ?? BORDERS[0];
}

function getBorderChoices() {
    return BORDERS.map(b => ({ name: b.label, value: b.id }));
}

module.exports = { BORDERS, getBorderById, getBorderChoices };
