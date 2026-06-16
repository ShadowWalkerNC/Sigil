const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas, registerFont, loadImage } = require('canvas');
const path = require('path');
const { getFont, getFontChoices, getAllFonts } = require('../utils/fonts');

const HEX_COLOR_REGEX = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;
const MAX_TEXT_LENGTH = 20;
const MIN_FONT_SIZE = 10;
const MAX_FONT_SIZE = 200;
const CANVAS_SIZE = 400;

// Fix #3: register all fonts at module load time, not per-interaction
for (const font of getAllFonts()) {
    registerFont(font.file, { family: font.family });
}

const BACKGROUNDS = {
    'Plain (Black)': null,
    'Custom Background 1': path.resolve(__dirname, '..', 'backgrounds', 'bg1.png'),
    'Custom Background 2': path.resolve(__dirname, '..', 'backgrounds', 'bg2.png'),
};

module.exports = {
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
                .setDescription('Text color in hex format (e.g. #FF0000)')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('glow')
                .setDescription('Glow intensity')
                .setRequired(true)
                .addChoices(
                    { name: 'Low', value: '5' },
                    { name: 'Medium', value: '10' },
                    { name: 'High', value: '15' }
                ))
        .addStringOption(option =>
            option.setName('background')
                .setDescription('Background style')
                .setRequired(true)
                .addChoices(
                    { name: 'Plain (Black)', value: 'Plain (Black)' },
                    { name: 'Custom Background 1', value: 'Custom Background 1' },
                    { name: 'Custom Background 2', value: 'Custom Background 2' }
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
        const background = interaction.options.getString('background') || 'Plain (Black)';
        const fontKey = interaction.options.getString('font') || 'another-danger';

        if (text.length > MAX_TEXT_LENGTH) {
            return interaction.reply({ content: `Text must be ${MAX_TEXT_LENGTH} characters or fewer.`, ephemeral: true });
        }
        if (size < MIN_FONT_SIZE || size > MAX_FONT_SIZE) {
            return interaction.reply({ content: `Font size must be between ${MIN_FONT_SIZE} and ${MAX_FONT_SIZE}.`, ephemeral: true });
        }
        if (!HEX_COLOR_REGEX.test(color)) {
            return interaction.reply({ content: 'Color must be a valid hex code (e.g. `#FF0000`).', ephemeral: true });
        }

        const loadingEmbed = new EmbedBuilder().setColor('#808080').setDescription('Generating your icon...');
        const initialReply = await interaction.reply({ embeds: [loadingEmbed] });

        try {
            const canvas = createCanvas(CANVAS_SIZE, CANVAS_SIZE);
            const ctx = canvas.getContext('2d');

            // Background
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

            const bgPath = BACKGROUNDS[background];
            if (bgPath) {
                try {
                    const bgImage = await loadImage(bgPath);
                    ctx.drawImage(bgImage, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
                } catch {
                    // Fallback to black if bg image missing
                }
            }

            const font = getFont(fontKey);
            // Fix #5: Number() instead of parseInt() without radix
            const shadowBlur = Number(glowIntensity);

            ctx.font = `${size}px '${font.family}'`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Glow pass
            ctx.shadowColor = color;
            ctx.shadowBlur = shadowBlur;
            ctx.fillStyle = color;
            ctx.fillText(text, CANVAS_SIZE / 2, CANVAS_SIZE / 2);

            // Crisp pass
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.fillText(text, CANVAS_SIZE / 2, CANVAS_SIZE / 2);

            const attachment = canvas.toBuffer();

            await initialReply.edit({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#808080')
                        .setImage('attachment://icon.png')
                        .setFooter({ text: `Discord Icon Gen \u2022 /icon \u2022 ${background} \u2022 font: ${font.label}` }),
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
