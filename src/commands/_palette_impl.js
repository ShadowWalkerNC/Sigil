'use strict';
const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas } = require('@napi-rs/canvas');

const data = new SlashCommandBuilder()
    .setName('palette')
    .setDescription('Generate a color palette from a hex color or name')
    .addStringOption(o =>
        o.setName('color')
         .setDescription('Base hex color (e.g. #3a86ff) or CSS name (e.g. crimson)')
         .setRequired(true))
    .addIntegerOption(o =>
        o.setName('swatches')
         .setDescription('Number of swatches to generate (3–8, default 5)')
         .setMinValue(3).setMaxValue(8).setRequired(false));

function hexToHsl(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    const r = parseInt(hex.slice(0, 2), 16) / 255;
    const g = parseInt(hex.slice(2, 4), 16) / 255;
    const b = parseInt(hex.slice(4, 6), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) { h = s = 0; }
    else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
        }
    }
    return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function hslToHex(h, s, l) {
    s /= 100; l /= 100;
    const k = n => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = n => Math.round((l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))) * 255)
        .toString(16).padStart(2, '0');
    return `#${f(0)}${f(8)}${f(4)}`;
}

function resolveCssColor(name) {
    const css = {
        red: '#ff0000', blue: '#0000ff', green: '#008000', white: '#ffffff',
        black: '#000000', yellow: '#ffff00', orange: '#ffa500', purple: '#800080',
        pink: '#ffc0cb', crimson: '#dc143c', gold: '#ffd700', navy: '#000080',
        teal: '#008080', coral: '#ff7f50', violet: '#ee82ee', indigo: '#4b0082',
    };
    return css[name.toLowerCase()] ?? null;
}

async function execute(interaction) {
    await interaction.deferReply();
    const input = interaction.options.getString('color').trim();
    const count = interaction.options.getInteger('swatches') ?? 5;

    let baseHex = input.startsWith('#') ? input : resolveCssColor(input);
    if (!baseHex) {
        // Try treating it as a hex without hash
        if (/^[0-9A-Fa-f]{6}$/.test(input)) baseHex = `#${input}`;
        else return interaction.editReply({ content: `❌ Could not parse color **${input}**. Use a hex code like \`#3a86ff\` or a color name like \`crimson\`.` });
    }

    const [h, s, l] = hexToHsl(baseHex);

    // Generate palette: lighter + darker variations around base
    const step = Math.floor(60 / (count - 1));
    const lightnessValues = Array.from({ length: count }, (_, i) => {
        const offset = Math.floor((count - 1) / 2);
        return Math.max(5, Math.min(95, l + (i - offset) * step));
    });

    const swatches = lightnessValues.map(lv => hslToHex(h, s, lv));

    // Draw canvas
    const W = 100, H = 180, PAD = 10;
    const canvas = createCanvas(swatches.length * (W + PAD) + PAD, H + PAD * 2);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    swatches.forEach((hex, i) => {
        const x = PAD + i * (W + PAD);
        ctx.fillStyle = hex;
        ctx.beginPath();
        ctx.roundRect(x, PAD, W, H, 8);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(hex.toUpperCase(), x + W / 2, H + PAD - 4);
    });

    const buffer = canvas.toBuffer('image/png');
    const attachment = new AttachmentBuilder(buffer, { name: 'palette.png' });

    const embed = new EmbedBuilder()
        .setTitle(`🎨 Palette — ${baseHex.toUpperCase()}`)
        .setDescription(`${count} swatches generated from base color **${baseHex.toUpperCase()}** (HSL: ${h}°, ${s}%, ${l}%)`)
        .setImage('attachment://palette.png')
        .setColor(baseHex)
        .setTimestamp();

    return interaction.editReply({ embeds: [embed], files: [attachment] });
}

module.exports = { data, execute };
