/**
 * /avatar — Generate a 400×400 avatar
 * Refactored to use src/utils/canvas.js shared render functions.
 */
'use strict';

const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage }                               = require('canvas');
const { getFont, getFontChoices }                               = require('../utils/fonts');
const { getBackgroundChoices }                                  = require('../utils/backgrounds');
const { getBorderChoices }                                      = require('../utils/borders');
const { getColorAutocomplete }                                  = require('../utils/colors');
const { saveEntry }                                             = require('../utils/history');
const { registerAllFonts, renderIcon }                          = require('../utils/canvas');

registerAllFonts();

const HEX_COLOR_REGEX = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;
const MAX_TEXT_LENGTH = 10;
const MIN_FONT_SIZE   = 10;
const MAX_FONT_SIZE   = 150;
const CANVAS_SIZE     = 400;

module.exports = {
    cooldown: 4,
    data: new SlashCommandBuilder()
        .setName('avatar')
        .setDescription('Generate a stylised 400\u00d7400 avatar icon.')
        .addStringOption(o =>
            o.setName('text')
             .setDescription(`Initials / short text (max ${MAX_TEXT_LENGTH} chars)`)
             .setRequired(true))
        .addIntegerOption(o =>
            o.setName('size')
             .setDescription(`Font size in pixels (${MIN_FONT_SIZE}\u2013${MAX_FONT_SIZE})`)
             .setRequired(true))
        .addStringOption(o =>
            o.setName('color')
             .setDescription('Text colour \u2014 pick a preset or type a hex code like #FF0000')
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
            o.setName('color2')
             .setDescription('Optional second colour for a gradient')
             .setRequired(false)
             .setAutocomplete(true))
        .addIntegerOption(o =>
            o.setName('opacity')
             .setDescription('Background opacity 10\u2013100 (default: 100)')
             .setMinValue(10)
             .setMaxValue(100)
             .setRequired(false))
        .addStringOption(o =>
            o.setName('border')
             .setDescription('Frame style (default: None)')
             .setRequired(false)
             .addChoices(...getBorderChoices()))
        .addStringOption(o =>
            o.setName('font')
             .setDescription('Font style for the text')
             .setRequired(false)
             .addChoices(...getFontChoices()))
        .addUserOption(o =>
            o.setName('overlay_user')
             .setDescription('Overlay a Discord user\'s avatar beneath the text')
             .setRequired(false)),

    async autocomplete(interaction) {
        const focused = interaction.options.getFocused(true);
        if (focused.name === 'color' || focused.name === 'color2')
            await interaction.respond(getColorAutocomplete(focused.value));
    },

    async execute(interaction) {
        const text        = interaction.options.getString('text');
        const size        = interaction.options.getInteger('size');
        const color       = interaction.options.getString('color');
        const color2      = interaction.options.getString('color2') || null;
        const glow        = interaction.options.getString('glow') || '5';
        const background  = interaction.options.getString('background') || 'plain-black';
        const opacity     = interaction.options.getInteger('opacity') ?? 100;
        const border      = interaction.options.getString('border') || 'none';
        const fontKey     = interaction.options.getString('font') || 'another-danger';
        const overlayUser = interaction.options.getUser('overlay_user') || null;

        if (text.length > MAX_TEXT_LENGTH)
            return interaction.reply({ content: `Text must be ${MAX_TEXT_LENGTH} characters or fewer.`, ephemeral: true });
        if (size < MIN_FONT_SIZE || size > MAX_FONT_SIZE)
            return interaction.reply({ content: `Font size must be between ${MIN_FONT_SIZE} and ${MAX_FONT_SIZE}.`, ephemeral: true });
        if (!HEX_COLOR_REGEX.test(color))
            return interaction.reply({ content: '\u274c Color must be a valid hex code (e.g. #FF0000).', ephemeral: true });
        if (color2 && !HEX_COLOR_REGEX.test(color2))
            return interaction.reply({ content: '\u274c Color2 must be a valid hex code.', ephemeral: true });

        const reply = await interaction.reply({
            embeds: [new EmbedBuilder().setColor('#808080').setDescription('\u2726 Generating your avatar\u2026')],
        });

        try {
            const canvas = createCanvas(CANVAS_SIZE, CANVAS_SIZE);
            const ctx    = canvas.getContext('2d');
            const font   = getFont(fontKey);

            // Optional: composite a Discord user avatar beneath the text layer
            if (overlayUser) {
                try {
                    const avatarUrl = overlayUser.displayAvatarURL({ extension: 'png', size: 512 });
                    const img       = await loadImage(avatarUrl);
                    ctx.globalAlpha = 0.35;
                    ctx.drawImage(img, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
                    ctx.globalAlpha = 1.0;
                } catch (e) {
                    console.warn('[avatar] overlay load failed (non-fatal):', e.message);
                }
            }

            await renderIcon(ctx, {
                text, size, color, color2, glow, background, border, font, opacity,
            });

            const buffer     = canvas.toBuffer();
            const colorLabel = color2 ? `gradient ${color}\u2192${color2}` : color;

            // History entry
            saveEntry(interaction.user.id, {
                command:   'avatar',
                text,
                size,
                color,
                color2,
                glow,
                background,
                border,
                fontKey,
                timestamp: Date.now(),
            });

            await reply.edit({
                embeds: [new EmbedBuilder()
                    .setColor('#808080')
                    .setImage('attachment://avatar.png')
                    .setFooter({ text: `Sigil \u2022 /avatar \u2022 ${background} \u2022 ${colorLabel} \u2022 font:${font.label}` })],
                files: [new AttachmentBuilder(buffer, { name: 'avatar.png' })],
            });
        } catch (err) {
            console.error('[ERROR] Avatar generation failed:', err);
            await reply.edit({
                embeds: [new EmbedBuilder().setColor('#FF0000').setDescription('Failed to generate your avatar. Please try again.')],
            });
        }
    },
};
