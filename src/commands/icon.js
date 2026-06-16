const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { createCanvas, registerFont, loadImage } = require('canvas');
const { getFont, getFontChoices, getAllFonts } = require('../utils/fonts');
const { createTextGradient } = require('../utils/gradient');
const { getBackgroundChoices, drawBackground } = require('../utils/backgrounds');
const { drawBorder } = require('../utils/borders');

const HEX_COLOR_REGEX = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;
const MAX_TEXT_LENGTH = 20;
const MIN_FONT_SIZE   = 10;
const MAX_FONT_SIZE   = 150;
const CANVAS_SIZE     = 400;

for (const font of getAllFonts()) {
    registerFont(font.file, { family: font.family });
}

module.exports = {
    cooldown: 4,
    data: new SlashCommandBuilder()
        .setName('icon')
        .setDescription('Generate a 400x400 profile icon.')
        .addStringOption(option =>
            option.setName('text')
                .setDescription(`Text to display (max ${MAX_TEXT_LENGTH} chars)`)
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('size')
                .setDescription(`Font size in pixels (${MIN_FONT_SIZE}\u2013${MAX_FONT_SIZE})`)
                .setRequired(true))
        .addStringOption(option =>
            option.setName('color')
                .setDescription('Text color in hex (e.g. #FF0000)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('glow')
                .setDescription('Glow intensity')
                .setRequired(true)
                .addChoices(
                    { name: 'Low',    value: '5'  },
                    { name: 'Medium', value: '10' },
                    { name: 'High',   value: '15' }
                ))
        .addStringOption(option =>
            option.setName('background')
                .setDescription('Background style')
                .setRequired(true)
                .addChoices(...getBackgroundChoices()))
        .addStringOption(option =>
            option.setName('color2')
                .setDescription('Optional second color for a gradient (e.g. #0000FF)')
                .setRequired(false))
        .addIntegerOption(option =>
            option.setName('opacity')
                .setDescription('Background opacity 10\u2013100 (default: 100)')
                .setMinValue(10)
                .setMaxValue(100)
                .setRequired(false))
        .addStringOption(option =>
            option.setName('border')
                .setDescription('Frame style around the edge of the icon (default: None)')
                .setRequired(false)
                .addChoices(
                    { name: 'None',          value: 'none'     },
                    { name: 'Solid',         value: 'solid'    },
                    { name: 'Glow Ring',     value: 'glow'     },
                    { name: 'Gradient Ring', value: 'gradient' },
                    { name: 'Double',        value: 'double'   },
                    { name: 'Dashed',        value: 'dashed'   },
                    { name: 'Corner Marks',  value: 'corner'   },
                    { name: 'Neon',          value: 'neon'     }
                ))
        .addStringOption(option =>
            option.setName('font')
                .setDescription('Font style for the text')
                .setRequired(false)
                .addChoices(...getFontChoices())),

    async execute(interaction) {
        const text          = interaction.options.getString('text');
        const size          = interaction.options.getInteger('size');
        const color         = interaction.options.getString('color');
        const color2        = interaction.options.getString('color2') || null;
        const glowIntensity = interaction.options.getString('glow') || '5';
        const background    = interaction.options.getString('background') || 'plain-black';
        const opacity       = interaction.options.getInteger('opacity') ?? 100;
        const borderStyle   = interaction.options.getString('border') || 'none';
        const fontKey       = interaction.options.getString('font') || 'another-danger';

        if (text.length > MAX_TEXT_LENGTH)
            return interaction.reply({ content: `Text must be ${MAX_TEXT_LENGTH} characters or fewer.`, ephemeral: true });
        if (size < MIN_FONT_SIZE || size > MAX_FONT_SIZE)
            return interaction.reply({ content: `Font size must be between ${MIN_FONT_SIZE} and ${MAX_FONT_SIZE}.`, ephemeral: true });
        if (!HEX_COLOR_REGEX.test(color))
            return interaction.reply({ content: 'Color must be a valid hex code (e.g. #FF0000).', ephemeral: true });
        if (color2 && !HEX_COLOR_REGEX.test(color2))
            return interaction.reply({ content: 'Color2 must be a valid hex code (e.g. #0000FF).', ephemeral: true });

        const loadingEmbed = new EmbedBuilder().setColor('#808080').setDescription('Generating your icon\u2026');
        const initialReply = await interaction.reply({ embeds: [loadingEmbed] });

        try {
            const canvas = createCanvas(CANVAS_SIZE, CANVAS_SIZE);
            const ctx    = canvas.getContext('2d');

            await drawBackground(ctx, background, CANVAS_SIZE, CANVAS_SIZE, loadImage);

            if (opacity < 100) {
                ctx.globalAlpha = 1 - (opacity / 100);
                ctx.fillStyle   = '#000000';
                ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
                ctx.globalAlpha = 1.0;
            }

            if (borderStyle !== 'none') drawBorder(ctx, borderStyle, color, color2, CANVAS_SIZE);

            const font       = getFont(fontKey);
            const shadowBlur = Number(glowIntensity);
            const drawX      = CANVAS_SIZE / 2;
            const drawY      = CANVAS_SIZE / 2;

            ctx.font         = `${size}px '${font.family}'`;
            ctx.textAlign    = 'center';
            ctx.textBaseline = 'middle';

            const fill = createTextGradient(ctx, color, color2, text, drawX, CANVAS_SIZE);

            ctx.shadowColor = color;
            ctx.shadowBlur  = shadowBlur;
            ctx.fillStyle   = fill;
            ctx.fillText(text, drawX, drawY);
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur  = 0;
            ctx.fillText(text, drawX, drawY);

            const attachment   = canvas.toBuffer();
            const colorLabel   = color2 ? `gradient ${color}\u2192${color2}` : color;
            const opacityLabel = opacity < 100 ? ` \u2022 bg:${opacity}%` : '';
            const borderLabel  = borderStyle !== 'none' ? ` \u2022 border:${borderStyle}` : '';

            await initialReply.edit({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#808080')
                        .setImage('attachment://icon.png')
                        .setFooter({ text: `Discord Icon Gen \u2022 /icon \u2022 ${background}${opacityLabel}${borderLabel} \u2022 ${colorLabel} \u2022 font: ${font.label}` }),
                ],
                files: [{ attachment, name: 'icon.png' }],
            });
        } catch (error) {
            console.error('[ERROR] Icon generation failed:', error);
            await initialReply.edit({
                embeds: [new EmbedBuilder().setColor('#FF0000').setDescription('Failed to generate your icon. Please try again.')],
            });
        }
    },
};
