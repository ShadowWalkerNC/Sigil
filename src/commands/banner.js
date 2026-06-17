/**
 * /banner — Generate a 1024×320 server banner
 * Refactored to use src/utils/canvas.js shared render functions.
 * Extra options (align, opacity) are applied as ctx state around renderBanner().
 */
'use strict';

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { createCanvas }                      = require('canvas');
const { getFont, getFontChoices }           = require('../utils/fonts');
const { getBackgroundChoices }              = require('../utils/backgrounds');
const { getColorAutocomplete }              = require('../utils/colors');
const { registerAllFonts, renderBanner }    = require('../utils/canvas');

registerAllFonts();

const HEX_COLOR_REGEX = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;
const MAX_TEXT_LENGTH = 30;
const MAX_SUB_LENGTH  = 50;
const MIN_FONT_SIZE   = 10;
const MAX_FONT_SIZE   = 150;
const CANVAS_W        = 1024;
const CANVAS_H        = 320;

const ALIGN_X = {
    left:   CANVAS_W * 0.05,
    center: CANVAS_W / 2,
    right:  CANVAS_W * 0.95,
};

module.exports = {
    cooldown: 4,
    data: new SlashCommandBuilder()
        .setName('banner')
        .setDescription('Generate a 1024\u00d7320 server banner.')
        .addStringOption(o =>
            o.setName('text')
             .setDescription(`Primary banner text (max ${MAX_TEXT_LENGTH} chars)`)
             .setRequired(true))
        .addIntegerOption(o =>
            o.setName('size')
             .setDescription(`Font size in pixels (${MIN_FONT_SIZE}\u2013${MAX_FONT_SIZE})`)
             .setRequired(true))
        .addStringOption(o =>
            o.setName('color')
             .setDescription('Text colour \u2014 pick a preset or type a hex code like #00FFFF')
             .setRequired(true)
             .setAutocomplete(true))
        .addStringOption(o =>
            o.setName('glow')
             .setDescription('Glow intensity')
             .setRequired(true)
             .addChoices(
                 { name: 'None',   value: '0'  },
                 { name: 'Low',    value: '5'  },
                 { name: 'Medium', value: '10' },
                 { name: 'High',   value: '15' },
                 { name: 'Ultra',  value: '25' },
             ))
        .addStringOption(o =>
            o.setName('background')
             .setDescription('Background style')
             .setRequired(true)
             .addChoices(...getBackgroundChoices()))
        .addStringOption(o =>
            o.setName('align')
             .setDescription('Text alignment (default: Center)')
             .setRequired(false)
             .addChoices(
                 { name: 'Left',   value: 'left'   },
                 { name: 'Center', value: 'center' },
                 { name: 'Right',  value: 'right'  },
             ))
        .addStringOption(o =>
            o.setName('color2')
             .setDescription('Optional second colour for a gradient')
             .setRequired(false)
             .setAutocomplete(true))
        .addStringOption(o =>
            o.setName('subtitle')
             .setDescription(`Optional subtitle beneath main text (max ${MAX_SUB_LENGTH} chars)`)
             .setRequired(false))
        .addIntegerOption(o =>
            o.setName('opacity')
             .setDescription('Background opacity 10\u2013100 (default: 100)')
             .setMinValue(10)
             .setMaxValue(100)
             .setRequired(false))
        .addStringOption(o =>
            o.setName('font')
             .setDescription('Font style for the text')
             .setRequired(false)
             .addChoices(...getFontChoices())),

    async autocomplete(interaction) {
        const focused = interaction.options.getFocused(true);
        if (focused.name === 'color' || focused.name === 'color2')
            await interaction.respond(getColorAutocomplete(focused.value));
    },

    async execute(interaction) {
        const text       = interaction.options.getString('text');
        const size       = interaction.options.getInteger('size');
        const color      = interaction.options.getString('color');
        const color2     = interaction.options.getString('color2') || null;
        const glow       = interaction.options.getString('glow') || '5';
        const background = interaction.options.getString('background') || 'plain-black';
        const align      = interaction.options.getString('align') || 'center';
        const subtitle   = interaction.options.getString('subtitle') || null;
        const opacity    = interaction.options.getInteger('opacity') ?? 100;
        const fontKey    = interaction.options.getString('font') || 'another-danger';

        if (text.length > MAX_TEXT_LENGTH)
            return interaction.reply({ content: `Text must be ${MAX_TEXT_LENGTH} characters or fewer.`, ephemeral: true });
        if (subtitle && subtitle.length > MAX_SUB_LENGTH)
            return interaction.reply({ content: `Subtitle must be ${MAX_SUB_LENGTH} characters or fewer.`, ephemeral: true });
        if (size < MIN_FONT_SIZE || size > MAX_FONT_SIZE)
            return interaction.reply({ content: `Font size must be between ${MIN_FONT_SIZE} and ${MAX_FONT_SIZE}.`, ephemeral: true });
        if (!HEX_COLOR_REGEX.test(color))
            return interaction.reply({ content: '\u274c Color must be a valid hex code (e.g. #00FFFF).', ephemeral: true });
        if (color2 && !HEX_COLOR_REGEX.test(color2))
            return interaction.reply({ content: '\u274c Color2 must be a valid hex code.', ephemeral: true });

        const reply = await interaction.reply({
            embeds: [new EmbedBuilder().setColor('#808080').setDescription('\u2726 Generating your banner\u2026')],
        });

        try {
            const canvas = createCanvas(CANVAS_W, CANVAS_H);
            const ctx    = canvas.getContext('2d');
            const font   = getFont(fontKey);

            // renderBanner() handles background draw, text, glow, and subtitle.
            // We pass textX so it honours the align option.
            await renderBanner(ctx, {
                text, size, color, color2, glow, background, subtitle, font,
                textX: ALIGN_X[align] ?? ALIGN_X.center,
                align,
            });

            // Opacity overlay (darkens background post-draw)
            if (opacity < 100) {
                ctx.globalAlpha = 1 - (opacity / 100);
                ctx.fillStyle   = '#000000';
                ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
                ctx.globalAlpha = 1.0;
            }

            const colorLabel   = color2 ? `gradient ${color}\u2192${color2}` : color;
            const opacityLabel = opacity < 100 ? ` \u2022 bg:${opacity}%` : '';

            await reply.edit({
                embeds: [new EmbedBuilder()
                    .setColor('#808080')
                    .setImage('attachment://banner.png')
                    .setFooter({ text: `Sigil \u2022 /banner \u2022 ${background}${opacityLabel} \u2022 align:${align} \u2022 ${colorLabel} \u2022 font:${font.label}` })],
                files: [{ attachment: canvas.toBuffer(), name: 'banner.png' }],
            });
        } catch (err) {
            console.error('[ERROR] Banner generation failed:', err);
            await reply.edit({
                embeds: [new EmbedBuilder().setColor('#FF0000').setDescription('Failed to generate your banner. Please try again.')],
            });
        }
    },
};
