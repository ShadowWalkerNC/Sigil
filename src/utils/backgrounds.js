const path = require('path');
const fs   = require('fs');

/**
 * Central background registry.
 * Each entry has:
 *   label   – display name shown in Discord
 *   type    – 'procedural' | 'image'
 *   draw(ctx, w, h) – draws the background onto the canvas context
 *
 * To add a new background:
 *   Procedural: add an entry with type:'procedural' and a draw() function.
 *   Image:      add an entry with type:'image', file: absolute path,
 *               and a draw() that loads + draws the image.
 */
const BACKGROUNDS = {
    'plain-black': {
        label: 'Plain (Black)',
        type: 'procedural',
        draw(ctx, w, h) {
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, w, h);
        },
    },
    'plain-white': {
        label: 'Plain (White)',
        type: 'procedural',
        draw(ctx, w, h) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, w, h);
        },
    },
    'midnight-gradient': {
        label: 'Midnight Gradient',
        type: 'procedural',
        draw(ctx, w, h) {
            const g = ctx.createLinearGradient(0, 0, w, h);
            g.addColorStop(0,   '#0a0a2e');
            g.addColorStop(0.5, '#1a0a3e');
            g.addColorStop(1,   '#0d0d0d');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, w, h);
        },
    },
    'sunset': {
        label: 'Sunset',
        type: 'procedural',
        draw(ctx, w, h) {
            const g = ctx.createLinearGradient(0, 0, 0, h);
            g.addColorStop(0,    '#ff6b35');
            g.addColorStop(0.45, '#c2185b');
            g.addColorStop(1,    '#1a0533');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, w, h);
        },
    },
    'forest': {
        label: 'Forest',
        type: 'procedural',
        draw(ctx, w, h) {
            const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7);
            g.addColorStop(0,   '#1b4332');
            g.addColorStop(0.6, '#0a2e1a');
            g.addColorStop(1,   '#030d07');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, w, h);
        },
    },
    'cyberpunk-grid': {
        label: 'Cyberpunk Grid',
        type: 'procedural',
        draw(ctx, w, h) {
            ctx.fillStyle = '#050510';
            ctx.fillRect(0, 0, w, h);
            // horizon line
            const hy = h * 0.55;
            // vertical perspective lines
            ctx.strokeStyle = 'rgba(0,255,220,0.35)';
            ctx.lineWidth = 1;
            const lines = 18;
            for (let i = 0; i <= lines; i++) {
                const t = i / lines;
                const bx = w * t;
                ctx.beginPath();
                ctx.moveTo(w / 2, hy);
                ctx.lineTo(bx, h);
                ctx.stroke();
            }
            // horizontal lines converging toward horizon
            const hLines = 10;
            for (let j = 1; j <= hLines; j++) {
                const frac = (j / hLines) ** 1.6;
                const y = hy + (h - hy) * frac;
                const alpha = 0.12 + frac * 0.28;
                ctx.strokeStyle = `rgba(0,255,220,${alpha.toFixed(2)})`;
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(w, y);
                ctx.stroke();
            }
            // faint upper glow
            const glowGrad = ctx.createLinearGradient(0, 0, 0, hy);
            glowGrad.addColorStop(0, 'rgba(0,180,255,0.08)');
            glowGrad.addColorStop(1, 'transparent');
            ctx.fillStyle = glowGrad;
            ctx.fillRect(0, 0, w, hy);
        },
    },
    'starfield': {
        label: 'Starfield',
        type: 'procedural',
        draw(ctx, w, h) {
            ctx.fillStyle = '#02020a';
            ctx.fillRect(0, 0, w, h);
            // deterministic pseudo-random so the same canvas size always
            // produces the same star layout
            let seed = 42;
            const rand = () => { seed = (seed * 1664525 + 1013904223) & 0xffffffff; return (seed >>> 0) / 0xffffffff; };
            const count = Math.round((w * h) / 800);
            for (let i = 0; i < count; i++) {
                const x    = rand() * w;
                const y    = rand() * h;
                const r    = rand() * 1.4 + 0.2;
                const a    = rand() * 0.6 + 0.4;
                ctx.beginPath();
                ctx.arc(x, y, r, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255,255,255,${a.toFixed(2)})`;
                ctx.fill();
            }
        },
    },
    'carbon-fiber': {
        label: 'Carbon Fiber',
        type: 'procedural',
        draw(ctx, w, h) {
            const cell = 8;
            for (let row = 0; row * cell < h; row++) {
                for (let col = 0; col * cell < w; col++) {
                    const offset = (row % 2) * (cell / 2);
                    const x = col * cell + offset;
                    const y = row * cell;
                    const dark  = (row + col) % 2 === 0;
                    ctx.fillStyle = dark ? '#1a1a1a' : '#222222';
                    ctx.fillRect(x, y, cell / 2, cell);
                    ctx.fillStyle = dark ? '#2a2a2a' : '#323232';
                    ctx.fillRect(x + cell / 2, y, cell / 2, cell);
                }
            }
            // subtle vignette
            const vg = ctx.createRadialGradient(w/2, h/2, Math.min(w,h)*0.2, w/2, h/2, Math.max(w,h)*0.75);
            vg.addColorStop(0, 'transparent');
            vg.addColorStop(1, 'rgba(0,0,0,0.55)');
            ctx.fillStyle = vg;
            ctx.fillRect(0, 0, w, h);
        },
    },
    'bg-image-1': {
        label: 'Custom Background 1',
        type: 'image',
        file: path.resolve(__dirname, '..', 'images', 'background1.jpg'),
        draw() { /* handled by drawBackground */ },
    },
    'bg-image-2': {
        label: 'Custom Background 2',
        type: 'image',
        file: path.resolve(__dirname, '..', 'images', 'background2.jpg'),
        draw() { /* handled by drawBackground */ },
    },
};

/**
 * Returns choice objects for Discord SlashCommandBuilder.addChoices().
 * @returns {Array<{ name: string, value: string }>}
 */
function getBackgroundChoices() {
    return Object.entries(BACKGROUNDS).map(([value, bg]) => ({ name: bg.label, value }));
}

/**
 * Draws the chosen background onto a canvas context.
 * Handles both procedural and image-based backgrounds.
 * Image backgrounds fall back to plain black on load failure.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} key  - background key from BACKGROUNDS
 * @param {number} w    - canvas width
 * @param {number} h    - canvas height
 * @param {Function} loadImage - the canvas loadImage function
 */
async function drawBackground(ctx, key, w, h, loadImage) {
    // Always start with black in case everything fails
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);

    const bg = BACKGROUNDS[key] || BACKGROUNDS['plain-black'];

    if (bg.type === 'image') {
        if (!bg.file || !fs.existsSync(bg.file)) {
            console.warn(`[backgrounds] Image file not found for key '${key}', falling back to black.`);
            return;
        }
        try {
            const img = await loadImage(bg.file);
            ctx.drawImage(img, 0, 0, w, h);
        } catch (err) {
            console.warn(`[backgrounds] Failed to load image for '${key}':`, err.message);
        }
        return;
    }

    // Procedural
    bg.draw(ctx, w, h);
}

module.exports = { getBackgroundChoices, drawBackground };
