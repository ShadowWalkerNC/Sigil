/**
 * /compare — Side-by-side icon comparison (800×400)
 * Refactored to use src/utils/canvas.js shared render functions.
 * Two renderIcon() calls placed side-by-side on a single wide canvas.
 */
'use strict';

const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas }                                          = require('canvas');
const { getFont, getFontChoices }                               = require('../utils/fonts');
const { getBackgroundChoices }                                  = require('../utils/backgrounds');
const { getBorderChoices }                                      = require('../utils/borders');
const { getColorAutocomplete }                                  = require('../utils/colors');
const { registerAllFonts, renderIcon }                          = require('../utils/canvas');

registerAllFonts();

const HEX_COLOR_REGEX = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;
const ICON_SIZE       = 400;
const COMPARE_W       = ICON_SIZE * 2;  // 800
const COMPARE_H       = ICON_SIZE;      // 400

module.exports = {
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName('compare')
        .setDescription('Generate two icons side-by-side for comparison.')
        // ── Left icon
        .addStringOption(o =>
            o.setName('text_a').setDescription('Left icon text').setRequired(true))
        .addStringOption(o =>
            o.setName('color_a')
             .setDescription('Left icon primary colour')
             .setRequired(true)
             .setAutocomplete(true))
        .addStringOption(o =>
            o.setName('background_a')
             .setDescription('Left icon background')
             .setRequired(true)
             .addChoices(...getBackgroundChoices()))
        // ── Right icon
        .addStringOption(o =>
            o.setName('text_b').setDescription('Right icon text').setRequired(true))
        .addStringOption(o =>
            o.setName('color_b')
             .setDescription('Right icon primary colour')
             .setRequired(true)
             .setAutocomplete(true))
        .addStringOption(o =>
            o.setName('background_b')
             .setDescription('Right icon background')
             .setRequired(true)
             .addChoices(...getBackgroundChoices()))
        // ── Shared options
        .addIntegerOption(o =>
            o.setName('size')
             .setDescription('Font size for both icons (default: auto)')
             .setMinValue(10).setMaxValue(150)
             .setRequired(false))
        .addStringOption(o =>
            o.setName('glow')
             .setDescription('Glow intensity (applies to both)')
             .setRequired(false)
             .addChoices(
                 { name: 'None',   value: '0'  },
                 { name: 'Low',    value: '5'  },
                 { name: 'Medium', value: '10' },
                 { name: 'High',   value: '15' },
                 { name: 'Ultra',  value: '25' },
             ))
        .addStringOption(o =>
            o.setName('border')
             .setDescription('Border style (applies to both)')
             .setRequired(false)
             .addChoices(...getBorderChoices()))
        .addStringOption(o =>
            o.setName('font')
             .setDescription('Font (applies to both)')
             .setRequired(false)
             .addChoices(...getFontChoices()))
        .addStringOption(o =>
            o.setName('color2_a')
             .setDescription('Left icon secondary colour (gradient)')
             .setRequired(false)
             .setAutocomplete(true))
        .addStringOption(o =>
            o.setName('color2_b')
             .setDescription('Right icon secondary colour (gradient)')
             .setRequired(false)
             .setAutocomplete(true)),

    async autocomplete(interaction) {
        const focused = interaction.options.getFocused(true);
        if (['color_a', 'color_b', 'color2_a', 'color2_b'].includes(focused.name))
            await interaction.respond(getColorAutocomplete(focused.value));
    },

    async execute(interaction) {
        const textA  = interaction.options.getString('text_a');
        const colorA = interaction.options.getString('color_a');
        const bgA    = interaction.options.getString('background_a');
        const c2A    = interaction.options.getString('color2_a') || null;

        const textB  = interaction.options.getString('text_b');
        const colorB = interaction.options.getString('color_b');
        const bgB    = interaction.options.getString('background_b');
        const c2B    = interaction.options.getString('color2_b') || null;

        const size   = interaction.options.getInteger('size') || null;
        const glow   = interaction.options.getString('glow') || '10';
        const border = interaction.options.getString('border') || 'none';
        const fontKey= interaction.options.getString('font') || 'another-danger';

        for (const [label, hex] of [['color_a', colorA], ['color_b', colorB]]) {
            if (!HEX_COLOR_REGEX.test(hex))
                return interaction.reply({ content: `\u274c ${label} must be a valid hex code (e.g. #FF0000).`, ephemeral: true });
        }
        for (const [label, hex] of [['color2_a', c2A], ['color2_b', c2B]]) {
            if (hex && !HEX_COLOR_REGEX.test(hex))
                return interaction.reply({ content: `\u274c ${label} must be a valid hex code.`, ephemeral: true });
        }

        const reply = await interaction.reply({
            embeds: [new EmbedBuilder().setColor('#808080').setDescription('\u2726 Generating comparison\u2026')],
        });

        try {
            const font    = getFont(fontKey);
            const autoSize = (t) => size ?? Math.min(150, Math.max(32, Math.floor(220 / Math.max(t.length, 1))));

            // Render both icons onto their own off-screen canvases in parallel
            const [canvasA, canvasB] = [createCanvas(ICON_SIZE, ICON_SIZE), createCanvas(ICON_SIZE, ICON_SIZE)];
            await Promise.all([
                renderIcon(canvasA.getContext('2d'), { text: textA, size: autoSize(textA), color: colorA, color2: c2A, glow, background: bgA, border, font }),
                renderIcon(canvasB.getContext('2d'), { text: textB, size: autoSize(textB), color: colorB, color2: c2B, glow, background: bgB, border, font }),
            ]);

            // Composite side-by-side
            const compare = createCanvas(COMPARE_W, COMPARE_H);
            const cCtx    = compare.getContext('2d');
            cCtx.drawImage(canvasA, 0,         0, ICON_SIZE, ICON_SIZE);
            cCtx.drawImage(canvasB, ICON_SIZE,  0, ICON_SIZE, ICON_SIZE);

            // Divider line
            cCtx.strokeStyle = 'rgba(255,255,255,0.25)';
            cCtx.lineWidth   = 2;
            cCtx.beginPath();
            cCtx.moveTo(ICON_SIZE, 0);
            cCtx.lineTo(ICON_SIZE, COMPARE_H);
            cCtx.stroke();

            // Labels
            cCtx.font      = "bold 18px 'Arial'";
            cCtx.fillStyle = 'rgba(255,255,255,0.55)';
            cCtx.textAlign = 'center';
            cCtx.fillText('A', ICON_SIZE * 0.5,  24);
            cCtx.fillText('B', ICON_SIZE * 1.5, 24);

            await reply.edit({
                embeds: [new EmbedBuilder()
                    .setColor('#808080')
                    .setImage('attachment://compare.png')
                    .setFooter({ text: `Sigil \u2022 /compare \u2022 A: ${colorA} on ${bgA}  |  B: ${colorB} on ${bgB}` })],
                files: [new AttachmentBuilder(compare.toBuffer(), { name: 'compare.png' })],
            });
        } catch (err) {
            console.error('[ERROR] Compare generation failed:', err);
            await reply.edit({
                embeds: [new EmbedBuilder().setColor('#FF0000').setDescription('Failed to generate comparison. Please try again.')],
            });
        }
    },
};
