// backgrounds.js — all background definitions for Sigil
// Each entry: { id, label, draw(ctx, w, h) }

const BACKGROUNDS = [
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
            // Simple noise via random pixels
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
            // Simulated abstract mesh with overlapping circles
            ctx.fillStyle = '#050510';
            ctx.fillRect(0, 0, w, h);
            const colors = ['#6a0dad44', '#0057e744', '#ff006644', '#00cccc44'];
            for (let i = 0; i < 8; i++) {
                const x = Math.random() * w;
                const y = Math.random() * h;
                const r = 80 + Math.random() * 120;
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
            for (let i = 0; i < 12; i++) {
                ctx.strokeStyle = neonColors[i % neonColors.length] + '66';
                ctx.lineWidth = 1 + Math.random() * 2;
                ctx.beginPath();
                ctx.moveTo(Math.random() * w, Math.random() * h);
                ctx.lineTo(Math.random() * w, Math.random() * h);
                ctx.stroke();
            }
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
