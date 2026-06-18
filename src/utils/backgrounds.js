// backgrounds.js — all background definitions for Sigil
// Each entry: { id, label, draw(ctx, w, h) }

const BACKGROUNDS = [
    // ── Original 20 ─────────────────────────────────────────────────────────────
    {
        id: 'gradient-purple',
        label: 'Purple Gradient',
        draw(ctx, w, h) {
            const g = ctx.createLinearGradient(0, 0, w, h);
            g.addColorStop(0, '#2d0057');
            g.addColorStop(1, '#6a0dad');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, w, h);
        },
    },
    {
        id: 'gradient-blue',
        label: 'Blue Gradient',
        draw(ctx, w, h) {
            const g = ctx.createLinearGradient(0, 0, w, h);
            g.addColorStop(0, '#001f5b');
            g.addColorStop(1, '#0057e7');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, w, h);
        },
    },
    {
        id: 'gradient-red',
        label: 'Red Gradient',
        draw(ctx, w, h) {
            const g = ctx.createLinearGradient(0, 0, w, h);
            g.addColorStop(0, '#3b0000');
            g.addColorStop(1, '#cc0000');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, w, h);
        },
    },
    {
        id: 'gradient-green',
        label: 'Green Gradient',
        draw(ctx, w, h) {
            const g = ctx.createLinearGradient(0, 0, w, h);
            g.addColorStop(0, '#003b00');
            g.addColorStop(1, '#00cc44');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, w, h);
        },
    },
    {
        id: 'gradient-gold',
        label: 'Gold Gradient',
        draw(ctx, w, h) {
            const g = ctx.createLinearGradient(0, 0, w, h);
            g.addColorStop(0, '#3b2800');
            g.addColorStop(1, '#ffd700');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, w, h);
        },
    },
    {
        id: 'gradient-teal',
        label: 'Teal Gradient',
        draw(ctx, w, h) {
            const g = ctx.createLinearGradient(0, 0, w, h);
            g.addColorStop(0, '#003b3b');
            g.addColorStop(1, '#00cccc');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, w, h);
        },
    },
    {
        id: 'gradient-pink',
        label: 'Pink Gradient',
        draw(ctx, w, h) {
            const g = ctx.createLinearGradient(0, 0, w, h);
            g.addColorStop(0, '#3b002d');
            g.addColorStop(1, '#ff69b4');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, w, h);
        },
    },
    {
        id: 'gradient-orange',
        label: 'Orange Gradient',
        draw(ctx, w, h) {
            const g = ctx.createLinearGradient(0, 0, w, h);
            g.addColorStop(0, '#3b1800');
            g.addColorStop(1, '#ff6600');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, w, h);
        },
    },
    {
        id: 'solid-black',
        label: 'Solid Black',
        draw(ctx, w, h) {
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, w, h);
        },
    },
    {
        id: 'solid-white',
        label: 'Solid White',
        draw(ctx, w, h) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, w, h);
        },
    },
    {
        id: 'solid-dark',
        label: 'Solid Dark',
        draw(ctx, w, h) {
            ctx.fillStyle = '#1a1a2e';
            ctx.fillRect(0, 0, w, h);
        },
    },
    {
        id: 'noise-dark',
        label: 'Noise Dark',
        draw(ctx, w, h) {
            ctx.fillStyle = '#111111';
            ctx.fillRect(0, 0, w, h);
            const id = ctx.getImageData(0, 0, w, h);
            const d  = id.data;
            for (let i = 0; i < d.length; i += 4) {
                const v = Math.random() * 20;
                d[i] += v; d[i+1] += v; d[i+2] += v;
            }
            ctx.putImageData(id, 0, 0);
        },
    },
    {
        id: 'grid-dark',
        label: 'Dark Grid',
        draw(ctx, w, h) {
            ctx.fillStyle = '#0d0d0d';
            ctx.fillRect(0, 0, w, h);
            ctx.strokeStyle = '#1f1f1f';
            ctx.lineWidth = 1;
            const step = 32;
            for (let x = 0; x <= w; x += step) {
                ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
            }
            for (let y = 0; y <= h; y += step) {
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
            }
        },
    },
    {
        id: 'dots-dark',
        label: 'Dark Dots',
        draw(ctx, w, h) {
            ctx.fillStyle = '#0d0d0d';
            ctx.fillRect(0, 0, w, h);
            ctx.fillStyle = '#2a2a2a';
            const step = 24;
            for (let x = step; x < w; x += step) {
                for (let y = step; y < h; y += step) {
                    ctx.beginPath();
                    ctx.arc(x, y, 1.5, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        },
    },
    {
        id: 'radial-purple',
        label: 'Radial Purple',
        draw(ctx, w, h) {
            const g = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, Math.max(w, h)/2);
            g.addColorStop(0, '#6a0dad');
            g.addColorStop(1, '#0d0d0d');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, w, h);
        },
    },
    {
        id: 'radial-blue',
        label: 'Radial Blue',
        draw(ctx, w, h) {
            const g = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, Math.max(w, h)/2);
            g.addColorStop(0, '#0057e7');
            g.addColorStop(1, '#0d0d0d');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, w, h);
        },
    },
    {
        id: 'diagonal-purple',
        label: 'Diagonal Purple',
        draw(ctx, w, h) {
            const g = ctx.createLinearGradient(0, 0, w, h);
            g.addColorStop(0, '#0d0d0d');
            g.addColorStop(0.5, '#6a0dad');
            g.addColorStop(1, '#0d0d0d');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, w, h);
        },
    },
    {
        id: 'diagonal-blue',
        label: 'Diagonal Blue',
        draw(ctx, w, h) {
            const g = ctx.createLinearGradient(0, 0, w, h);
            g.addColorStop(0, '#0d0d0d');
            g.addColorStop(0.5, '#0057e7');
            g.addColorStop(1, '#0d0d0d');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, w, h);
        },
    },
    {
        id: 'bg-image-1',
        label: 'Abstract Mesh',
        draw(ctx, w, h) {
            ctx.fillStyle = '#050510';
            ctx.fillRect(0, 0, w, h);
            const colors = ['#6a0dad44', '#0057e744', '#ff006644', '#00cccc44'];
            for (let i = 0; i < 8; i++) {
                const x = (i / 8) * w + w * 0.1;
                const y = (i % 4) / 4 * h + h * 0.1;
                const r = 80 + (i * 30) % 120;
                const g = ctx.createRadialGradient(x, y, 0, x, y, r);
                g.addColorStop(0, colors[i % colors.length]);
                g.addColorStop(1, 'transparent');
                ctx.fillStyle = g;
                ctx.fillRect(0, 0, w, h);
            }
        },
    },
    {
        id: 'bg-image-2',
        label: 'Neon Lines',
        draw(ctx, w, h) {
            ctx.fillStyle = '#050505';
            ctx.fillRect(0, 0, w, h);
            const neonColors = ['#ff00ff', '#00ffff', '#ff6600', '#00ff88'];
            const pts = [
                [0.1, 0.2, 0.9, 0.8], [0.0, 0.5, 1.0, 0.5], [0.3, 0.0, 0.7, 1.0],
                [0.8, 0.1, 0.2, 0.9], [0.0, 0.0, 1.0, 1.0], [1.0, 0.0, 0.0, 1.0],
                [0.5, 0.0, 0.5, 1.0], [0.0, 0.3, 1.0, 0.7], [0.2, 0.8, 0.8, 0.2],
                [0.4, 0.1, 0.6, 0.9], [0.1, 0.6, 0.9, 0.4], [0.7, 0.3, 0.3, 0.7],
            ];
            pts.forEach(([x1, y1, x2, y2], i) => {
                ctx.strokeStyle = neonColors[i % neonColors.length] + '66';
                ctx.lineWidth = 1 + (i % 3);
                ctx.beginPath();
                ctx.moveTo(x1 * w, y1 * h);
                ctx.lineTo(x2 * w, y2 * h);
                ctx.stroke();
            });
        },
    },

    // ── 12 Named presets (used by templates & Gemini prompt) ──────────────────────
    {
        id: 'midnight-gradient',
        label: 'Midnight',
        draw(ctx, w, h) {
            const g = ctx.createLinearGradient(0, 0, w, h);
            g.addColorStop(0, '#0a0015');
            g.addColorStop(0.5, '#150030');
            g.addColorStop(1, '#000000');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, w, h);
        },
    },
    {
        id: 'deep-space',
        label: 'Deep Space',
        draw(ctx, w, h) {
            // Dark base
            ctx.fillStyle = '#03001c';
            ctx.fillRect(0, 0, w, h);
            // Star field — deterministic via seeded positions
            ctx.fillStyle = '#ffffff';
            const stars = [
                [0.12,0.08],[0.34,0.15],[0.67,0.05],[0.89,0.22],[0.45,0.33],
                [0.78,0.41],[0.23,0.55],[0.56,0.62],[0.91,0.70],[0.10,0.80],
                [0.40,0.88],[0.72,0.92],[0.05,0.45],[0.60,0.18],[0.82,0.55],
                [0.28,0.72],[0.50,0.50],[0.15,0.35],[0.95,0.10],[0.38,0.95],
            ];
            for (const [sx, sy] of stars) {
                const r = 0.8 + ((sx * 7 + sy * 13) % 1.4);
                ctx.beginPath();
                ctx.arc(sx * w, sy * h, r, 0, Math.PI * 2);
                ctx.fill();
            }
            // Faint nebula glow
            const nb = ctx.createRadialGradient(w*0.6, h*0.4, 0, w*0.6, h*0.4, w*0.5);
            nb.addColorStop(0, '#1a006633');
            nb.addColorStop(1, 'transparent');
            ctx.fillStyle = nb;
            ctx.fillRect(0, 0, w, h);
        },
    },
    {
        id: 'inferno',
        label: 'Inferno',
        draw(ctx, w, h) {
            const g = ctx.createLinearGradient(0, h, w, 0);
            g.addColorStop(0, '#1a0000');
            g.addColorStop(0.3, '#8b0000');
            g.addColorStop(0.6, '#cc3300');
            g.addColorStop(0.85, '#ff6600');
            g.addColorStop(1, '#ffaa00');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, w, h);
            // Heat shimmer — radial highlight at centre-bottom
            const glow = ctx.createRadialGradient(w/2, h, 0, w/2, h, h*0.7);
            glow.addColorStop(0, '#ff440033');
            glow.addColorStop(1, 'transparent');
            ctx.fillStyle = glow;
            ctx.fillRect(0, 0, w, h);
        },
    },
    {
        id: 'ocean-depth',
        label: 'Ocean Depth',
        draw(ctx, w, h) {
            const g = ctx.createLinearGradient(0, 0, 0, h);
            g.addColorStop(0, '#001a33');
            g.addColorStop(0.4, '#003366');
            g.addColorStop(0.75, '#005580');
            g.addColorStop(1, '#00334d');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, w, h);
            // Caustic light rays
            ctx.strokeStyle = '#00aaff22';
            ctx.lineWidth = w * 0.015;
            const rays = [[0.2,0,0.35,1],[0.4,0,0.5,1],[0.6,0,0.48,1],[0.75,0,0.62,1]];
            for (const [x1,y1,x2,y2] of rays) {
                ctx.beginPath();
                ctx.moveTo(x1*w, y1*h);
                ctx.lineTo(x2*w, y2*h);
                ctx.stroke();
            }
        },
    },
    {
        id: 'twilight',
        label: 'Twilight',
        draw(ctx, w, h) {
            const g = ctx.createLinearGradient(0, 0, 0, h);
            g.addColorStop(0, '#0d0d2b');
            g.addColorStop(0.45, '#4b1a6e');
            g.addColorStop(0.7, '#c2185b');
            g.addColorStop(1, '#ff6f00');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, w, h);
        },
    },
    {
        id: 'aurora',
        label: 'Aurora',
        draw(ctx, w, h) {
            ctx.fillStyle = '#020d1a';
            ctx.fillRect(0, 0, w, h);
            // Three aurora bands
            const bands = [
                { cx: 0.3, cy: 0.4, color0: '#00ff8844', color1: '#00aaff22' },
                { cx: 0.6, cy: 0.3, color0: '#aa00ff44', color1: '#ff00aa22' },
                { cx: 0.5, cy: 0.6, color0: '#00ffcc33', color1: 'transparent' },
            ];
            for (const b of bands) {
                const gr = ctx.createRadialGradient(b.cx*w, b.cy*h, 0, b.cx*w, b.cy*h, w*0.55);
                gr.addColorStop(0, b.color0);
                gr.addColorStop(1, b.color1);
                ctx.fillStyle = gr;
                ctx.fillRect(0, 0, w, h);
            }
        },
    },
    {
        id: 'storm',
        label: 'Storm',
        draw(ctx, w, h) {
            const g = ctx.createRadialGradient(w*0.5, h*0.3, 0, w*0.5, h*0.5, Math.max(w,h)*0.8);
            g.addColorStop(0, '#d0d8e0');
            g.addColorStop(0.25, '#607080');
            g.addColorStop(0.55, '#2a3040');
            g.addColorStop(1, '#0a0e18');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, w, h);
            // Lightning bolt hint
            ctx.strokeStyle = '#e8f0ff88';
            ctx.lineWidth = Math.max(2, w * 0.004);
            ctx.beginPath();
            const lx = w * 0.55;
            ctx.moveTo(lx, 0);
            ctx.lineTo(lx - w*0.05, h*0.4);
            ctx.lineTo(lx + w*0.04, h*0.4);
            ctx.lineTo(lx - w*0.06, h);
            ctx.stroke();
        },
    },
    {
        id: 'void',
        label: 'Void',
        draw(ctx, w, h) {
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, w, h);
            // Subtle dark-on-dark radial vignette
            const g = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, Math.max(w,h)/2);
            g.addColorStop(0, '#0d0010');
            g.addColorStop(0.6, '#05000a');
            g.addColorStop(1, '#000000');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, w, h);
            // Distant star pinpricks
            ctx.fillStyle = '#ffffff18';
            const pts = [[0.1,0.2],[0.5,0.1],[0.8,0.3],[0.3,0.7],[0.7,0.8],[0.9,0.5],[0.2,0.9]];
            for (const [px,py] of pts) {
                ctx.beginPath();
                ctx.arc(px*w, py*h, 0.8, 0, Math.PI*2);
                ctx.fill();
            }
        },
    },
    {
        id: 'neon-city',
        label: 'Neon City',
        draw(ctx, w, h) {
            // Sky
            const sky = ctx.createLinearGradient(0, 0, 0, h*0.6);
            sky.addColorStop(0, '#0a001a');
            sky.addColorStop(1, '#1a0033');
            ctx.fillStyle = sky;
            ctx.fillRect(0, 0, w, h);
            // City silhouette
            ctx.fillStyle = '#050008';
            const buildings = [
                [0, 0.55, 0.08, 0.45], [0.06, 0.48, 0.06, 0.52], [0.10, 0.40, 0.10, 0.60],
                [0.18, 0.52, 0.08, 0.48], [0.24, 0.44, 0.10, 0.56], [0.32, 0.50, 0.12, 0.50],
                [0.42, 0.36, 0.08, 0.64], [0.48, 0.50, 0.10, 0.50], [0.56, 0.42, 0.10, 0.58],
                [0.64, 0.48, 0.12, 0.52], [0.74, 0.38, 0.08, 0.62], [0.80, 0.52, 0.10, 0.48],
                [0.88, 0.44, 0.12, 0.56],
            ];
            for (const [x, y, bw, bh] of buildings) {
                ctx.fillRect(x*w, y*h, bw*w, bh*h);
            }
            // Neon glows
            for (const [color, cx, cy] of [['#ff00ff', 0.2, 0.5], ['#00ffff', 0.55, 0.45], ['#ff6600', 0.8, 0.52]]) {
                const gr = ctx.createRadialGradient(cx*w, cy*h, 0, cx*w, cy*h, w*0.2);
                gr.addColorStop(0, color + '55');
                gr.addColorStop(1, 'transparent');
                ctx.fillStyle = gr;
                ctx.fillRect(0, 0, w, h);
            }
        },
    },
    {
        id: 'sunset-fade',
        label: 'Sunset Fade',
        draw(ctx, w, h) {
            const g = ctx.createLinearGradient(0, 0, 0, h);
            g.addColorStop(0, '#1a0533');
            g.addColorStop(0.3, '#7b1fa2');
            g.addColorStop(0.55, '#e64a19');
            g.addColorStop(0.75, '#ff8f00');
            g.addColorStop(1, '#ffcc02');
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, w, h);
            // Sun disc
            const sun = ctx.createRadialGradient(w/2, h*0.72, 0, w/2, h*0.72, w*0.18);
            sun.addColorStop(0, '#ffffffcc');
            sun.addColorStop(0.3, '#ffdd0099');
            sun.addColorStop(1, 'transparent');
            ctx.fillStyle = sun;
            ctx.fillRect(0, 0, w, h);
        },
    },
    {
        id: 'forest-night',
        label: 'Forest Night',
        draw(ctx, w, h) {
            // Sky
            const sky = ctx.createLinearGradient(0, 0, 0, h*0.65);
            sky.addColorStop(0, '#020d05');
            sky.addColorStop(1, '#0a2010');
            ctx.fillStyle = sky;
            ctx.fillRect(0, 0, w, h);
            // Moon
            const moon = ctx.createRadialGradient(w*0.75, h*0.18, 0, w*0.75, h*0.18, w*0.08);
            moon.addColorStop(0, '#e8f0d8cc');
            moon.addColorStop(0.6, '#c8ddb044');
            moon.addColorStop(1, 'transparent');
            ctx.fillStyle = moon;
            ctx.fillRect(0, 0, w, h);
            // Tree silhouettes
            ctx.fillStyle = '#010801';
            const trees = [[0,0.6,0.12],[0.1,0.55,0.10],[0.22,0.62,0.09],[0.32,0.50,0.13],
                           [0.45,0.58,0.11],[0.55,0.52,0.10],[0.65,0.60,0.12],[0.76,0.54,0.09],
                           [0.85,0.62,0.10],[0.93,0.56,0.12]];
            for (const [tx, ty, tw] of trees) {
                // trunk
                ctx.fillRect((tx + tw*0.45)*w, ty*h, tw*0.1*w, (1-ty)*h);
                // canopy triangle
                ctx.beginPath();
                ctx.moveTo((tx + tw*0.5)*w, (ty - tw*0.8)*h);
                ctx.lineTo(tx*w, ty*h);
                ctx.lineTo((tx+tw)*w, ty*h);
                ctx.closePath();
                ctx.fill();
            }
        },
    },
    {
        id: 'polar',
        label: 'Polar',
        draw(ctx, w, h) {
            // Ice-blue sky
            const sky = ctx.createLinearGradient(0, 0, 0, h);
            sky.addColorStop(0, '#0d1b2a');
            sky.addColorStop(0.5, '#1b3a4b');
            sky.addColorStop(1, '#c8dfe8');
            ctx.fillStyle = sky;
            ctx.fillRect(0, 0, w, h);
            // Aurora shimmer
            const aurora = ctx.createRadialGradient(w*0.4, h*0.35, 0, w*0.4, h*0.35, w*0.6);
            aurora.addColorStop(0, '#00ff8822');
            aurora.addColorStop(0.5, '#00aaff11');
            aurora.addColorStop(1, 'transparent');
            ctx.fillStyle = aurora;
            ctx.fillRect(0, 0, w, h);
            // Snow ground
            ctx.fillStyle = '#d8eef7';
            ctx.beginPath();
            ctx.ellipse(w/2, h*1.05, w*0.7, h*0.25, 0, 0, Math.PI*2);
            ctx.fill();
        },
    },
];

function getBackgroundById(id) {
    return BACKGROUNDS.find(b => b.id === id) ?? BACKGROUNDS.find(b => b.id === 'solid-black');
}

function getBackgroundChoices() {
    return BACKGROUNDS.map(b => ({ name: b.label, value: b.id }));
}

function getAllBackgroundIds() {
    return BACKGROUNDS.map(b => b.id);
}

module.exports = { BACKGROUNDS, getBackgroundById, getBackgroundChoices, getAllBackgroundIds };
