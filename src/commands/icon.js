const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const { createCanvas, registerFont, loadImage } = require('canvas');
const path = require('path');
const { getFont, getFontChoices } = require('../utils/fonts');

const HEX_COLOR_REGEX = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;
const MAX_TEXT_LENGTH = 20;
const MIN_FONT_SIZE = 10;
const MAX_FONT_SIZE = 200;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('icon')
        .setDescription('Generate a custom 400x400 profile icon.')
        .addStringOption(option =>
            option.setName('text')
                .setDescription(`Text to display on the icon (max ${MAX_TEXT_LENGTH} chars)`)
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('size')
                .setDescription(`Font size in pixels (${MIN_FONT_SIZE}–${MAX_FONT_SIZE})`)
                .setRequired(true))
        .addStringOption(option =>
            option.setName('color')
                .setDescription('Text color in hex format (e.g. #FF0000)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('glow')
                .setDescription('Glow intensity around the text')
                .setRequired(true)
                .addChoices(
                    { name: 'Low', value: '5' },
                    { name: 'Medium', value: '10' },
                    { name: 'High', value: '15' }
                ))
        .addStringOption(option =>
            option.setName('background')
                .setDescription('Background style for the icon')
                .setRequired(true)
                .addChoices(
                    { name: 'Plain (Black)', value: 'plain' },
                    { name: 'Custom Background 1', value: 'custom1' },
                    { name: 'Custom Background 2', value: 'custom2' }
                ))
        .addStringOption(option =>
            option.setName('font')
                .setDescription('Font style for the text')
                .setRequired(false)
                .addChoices(...getFontChoices())),

    async execute(interaction) {
        const text = interaction.options.getString('text');
        const size = interaction.options.getInteger('size');
        const color = interaction.options.getString('color');
        const glowIntensity = interaction.options.getString('glow') || '5';
        const background = interaction.options.getString('background');
        const fontKey = interaction.options.getString('font') || 'another-danger';

        if (text.length > MAX_TEXT_LENGTH) {
            return interaction.reply({
                content: `Text must be ${MAX_TEXT_LENGTH} characters or fewer.`,
                ephemeral: true,
            });
        }
        if (size < MIN_FONT_SIZE || size > MAX_FONT_SIZE) {
            return interaction.reply({
                content: `Font size must be between ${MIN_FONT_SIZE} and ${MAX_FONT_SIZE}.`,
                ephemeral: true,
            });
        }
        if (!HEX_COLOR_REGEX.test(color)) {
            return interaction.reply({
                content: 'Color must be a valid hex code (e.g. `#FF0000` or `#F00`).',
                ephemeral: true,
            });
        }

        const loadingEmbed = new EmbedBuilder()
            .setColor('#808080')
            .setDescription('Generating your icon...');
        const initialReply = await interaction.reply({ embeds: [loadingEmbed] });

        try {
            const canvasSize = 400;
            const canvas = createCanvas(canvasSize, canvasSize);
            const ctx = canvas.getContext('2d');

            const font = getFont(fontKey);
            registerFont(font.file, { family: font.family });

            if (background === 'custom1' || background === 'custom2') {
                const bgFile = background === 'custom1' ? 'background1.jpg' : 'background2.jpg';
                const bgPath = path.resolve(__dirname, '..', 'images', bgFile);
                const backgroundImage = await loadImage(bgPath);
                ctx.drawImage(backgroundImage, 0, 0, canvasSize, canvasSize);
            } else {
                ctx.fillStyle = '#000000';
                ctx.fillRect(0, 0, canvasSize, canvasSize);
            }

            const shadowBlur = parseInt(glowIntensity);
            ctx.font = `${size}px '${font.family}'`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.translate(canvasSize / 2, canvasSize / 2);
            ctx.rotate(-Math.PI / 20);

            ctx.shadowColor = color;
            ctx.shadowBlur = shadowBlur;
            ctx.fillStyle = color;
            ctx.fillText(text, 0, 0);

            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.fillText(text, 0, 0);

            const attachment = canvas.toBuffer();

            await initialReply.edit({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#808080')
                        .setImage('attachment://profile_icon.png')
                        .setFooter({ text: `Discord Icon Gen • font: ${font.label}` }),
                ],
                files: [{ attachment, name: 'profile_icon.png' }],
            });
        } catch (error) {
            console.error('[ERROR] Icon generation failed:', error);
            await initialReply.edit({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#FF0000')
                        .setDescription('Failed to generate your icon. Please try again.'),
                ],
            });
        }
    },
};
