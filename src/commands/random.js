/**
 * /random — Generate a randomised 400×400 icon
 * Refactored to use src/utils/canvas.js shared render functions.
 */
'use strict';

const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas }                                          = require('canvas');
const { getFont, getAllFonts }                                   = require('../utils/fonts');
const { registerAllFonts, renderIcon, autoFontSize }            = require('../utils/canvas');

registerAllFonts();

const CANVAS_SIZE = 400;

const TEXTS = [
    'ICON', 'LOGO', 'GG', 'PRO', 'ACE', 'KING', 'NOVA', 'APEX',
    'VIBE', 'GRID', 'HYPE', 'FLUX', 'CORE', 'ZERO', 'NEON', 'BYTE',
    'SIGIL', 'RIFT', 'ECHO', 'VOID',
];

const COLORS = [
    '#FF4500', '#00FFFF', '#FF00FF', '#FFD700', '#00FF88',
    '#FF1493', '#7B2FFF', '#FF6600', '#00BFFF', '#ADFF2F',
    '#FF3366', '#33FFCC', '#FF9900', '#CC00FF', '#00FF00',
];

const BACKGROUNDS = [
    'plain-black', 'plain-white', 'midnight-gradient',
    'sunset', 'forest', 'cyberpunk-grid', 'starfield', 'carbon-fiber',
];

const BORDERS = ['none', 'solid', 'glow', 'gradient', 'double', 'dashed', 'neon'];
const GLOWS   = ['0', '5', '10', '15', '25'];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

module.exports = {
    cooldown: 3,
    data: new SlashCommandBuilder()
        .setName('random')
        .setDescription('Generate a fully randomised icon — surprise yourself!')
        .addBooleanOption(o =>
            o.setName('gradient')
             .setDescription('Include a random gradient (second colour)?')
             .setRequired(false)),

    async execute(interaction) {
        const useGradient = interaction.options.getBoolean('gradient') ?? false;

        const text       = pick(TEXTS);
        const color      = pick(COLORS);
        const color2     = useGradient ? pick(COLORS.filter(c => c !== color)) : null;
        const background = pick(BACKGROUNDS);
        const border     = pick(BORDERS);
        const glow       = pick(GLOWS);
        const fontList   = getAllFonts();
        const font       = fontList[Math.floor(Math.random() * fontList.length)];
        const size       = autoFontSize(text, 150, 60, 220);

        const reply = await interaction.reply({
            embeds: [new EmbedBuilder().setColor('#808080').setDescription('\u2726 Rolling the dice\u2026')],
        });

        try {
            const canvas = createCanvas(CANVAS_SIZE, CANVAS_SIZE);
            await renderIcon(canvas.getContext('2d'), {
                text, size, color, color2, glow, background, border, font,
            });

            const colorLabel = color2 ? `gradient ${color}\u2192${color2}` : color;

            await reply.edit({
                embeds: [new EmbedBuilder()
                    .setColor('#808080')
                    .setImage('attachment://random.png')
                    .setFooter({ text: `Sigil \u2022 /random \u2022 ${background} \u2022 ${colorLabel} \u2022 glow:${glow} \u2022 font:${font.label}` })],
                files: [new AttachmentBuilder(canvas.toBuffer(), { name: 'random.png' })],
            });
        } catch (err) {
            console.error('[ERROR] Random generation failed:', err);
            await reply.edit({
                embeds: [new EmbedBuilder().setColor('#FF0000').setDescription('Failed to generate. Please try again.')],
            });
        }
    },
};
