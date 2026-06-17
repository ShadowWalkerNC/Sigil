const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { createCanvas, registerFont, loadImage } = require('canvas');
const { getFont, getAllFonts }                  = require('../utils/fonts');
const { createTextGradient }                   = require('../utils/gradient');
const { drawBackground }                       = require('../utils/backgrounds');
const { drawBorder, BORDER_LABELS }            = require('../utils/borders');
const { saveEntry }                            = require('../utils/history');

for (const font of getAllFonts()) {
    try { registerFont(font.file, { family: font.family }); }
    catch (e) { console.error(`[ERROR] Failed to register font '${font.family}':`, e.message); }
}

const CANVAS_SIZE = 400;

const TEXTS = [
    'ICON', 'LOGO', 'GG', 'PRO', 'ACE', 'KING', 'NOVA', 'APEX',
    'VIBE', 'GRID', 'HYPE', 'FLUX', 'CORE', 'ZERO', 'NEON', 'BYTE',
    'SIGIL', 'RIFT', 'ECHO', 'VOID',
];

const COLORS = [
    '#FF4500', '#00FFFF', '#FF00FF', '#FFD700', '#00FF7F',
    '#FF69B4', '#7B68EE', '#FF6347', '#40E0D0', '#EE82EE',
    '#DC143C', '#39FF14', '#FF007F', '#00BFFF', '#FFA500',
];

const BACKGROUNDS = [
    'plain-black', 'midnight-gradient', 'sunset', 'forest',
    'cyberpunk-grid', 'starfield', 'carbon-fiber',
];

const BORDERS = ['none', 'solid', 'glow', 'gradient', 'double', 'dashed', 'corner', 'neon'];
const GLOWS   = ['0', '5', '10', '15', '25'];

function seededRandom(seed) {
    let s = seed;
    return () => {
        s = (s * 1664525 + 1013904223) & 0xffffffff;
        return (s >>> 0) / 0xffffffff;
    };
}

module.exports = {
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName('random')
        .setDescription('Generate a fully randomised icon.')
        .addStringOption(o =>
            o.setName('text')
             .setDescription('Custom text (defaults to a random word)')
             .setRequired(false)
             .setMaxLength(20))
        .addIntegerOption(o =>
            o.setName('seed')
             .setDescription('Seed number to reproduce the same result')
             .setRequired(false)),

    async execute(interaction) {
        const customText = interaction.options.getString('text') || null;
        const seedInput  = interaction.options.getInteger('seed');
        const rng        = seedInput != null ? seededRandom(seedInput) : Math.random.bind(Math);
        const pick       = arr => arr[Math.floor(rng() * arr.length)];

        const loadingEmbed = new EmbedBuilder().setColor('#808080').setDescription('\u2726 Generating a random icon\u2026');
        const initialReply = await interaction.reply({ embeds: [loadingEmbed] });

        try {
            const text       = customText || pick(TEXTS);
            const color      = pick(COLORS);
            const color2     = rng() > 0.5 ? pick(COLORS.filter(c => c !== color)) : null;
            const background = pick(BACKGROUNDS);
            const border     = pick(BORDERS);
            const glow       = pick(GLOWS);
            const size       = 60 + Math.floor(rng() * 60);
            const fontKey    = 'another-danger';

            const canvas = createCanvas(CANVAS_SIZE, CANVAS_SIZE);
            const ctx    = canvas.getContext('2d');

            await drawBackground(ctx, background, CANVAS_SIZE, CANVAS_SIZE, loadImage);

            if (border !== 'none') drawBorder(ctx, border, color, color2, CANVAS_SIZE);

            const font = getFont(fontKey);
            ctx.font         = `${size}px '${font.family}'`;
            ctx.textAlign    = 'center';
            ctx.textBaseline = 'middle';

            const fill = createTextGradient(ctx, color, color2, text, CANVAS_SIZE / 2, CANVAS_SIZE);
            ctx.shadowColor = color;
            ctx.shadowBlur  = Number(glow);
            ctx.fillStyle   = fill;
            ctx.fillText(text, CANVAS_SIZE / 2, CANVAS_SIZE / 2);
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur  = 0;
            ctx.fillText(text, CANVAS_SIZE / 2, CANVAS_SIZE / 2);

            const attachment = canvas.toBuffer();
            const colorLabel = color2 ? `${color} \u2192 ${color2}` : color;
            const borderName = BORDER_LABELS[border] ?? border;
            const glowLabels = { '0': 'None', '5': 'Low', '10': 'Medium', '15': 'High', '25': 'Ultra' };
            const seedLabel  = seedInput != null ? ` \u2022 seed: ${seedInput}` : '';

            saveEntry(interaction.user.id, {
                label:   `Random \u2022 ${text} \u2022 ${colorLabel}`,
                command: 'icon',
                params: { text, size, color, color2, glow, background, border, font: fontKey },
            });

            await initialReply.edit({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#808080')
                        .setImage('attachment://random.png')
                        .setFooter({ text: `Sigil \u2022 /random \u2022 ${background} \u2022 ${colorLabel} \u2022 border: ${borderName} \u2022 glow: ${glowLabels[glow]}${seedLabel}` }),
                ],
                files: [{ attachment, name: 'random.png' }],
            });
        } catch (error) {
            console.error('[ERROR] Random generation failed:', error);
            await initialReply.edit({
                embeds: [new EmbedBuilder().setColor('#FF0000').setDescription('Failed to generate a random icon. Please try again.')],
            });
        }
    },
};
