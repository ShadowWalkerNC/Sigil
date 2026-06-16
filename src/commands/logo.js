const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const { createCanvas, registerFont } = require('canvas');
const { getFont, getFontChoices, getAllFonts } = require('../utils/fonts');

const HEX_COLOR_REGEX = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;
const MAX_TEXT_LENGTH = 20;
const MIN_FONT_SIZE = 10;
const MAX_FONT_SIZE = 200;
const CANVAS_SIZE = 512;

// Fix #3: register all fonts at module load time, not per-interaction
for (const font of getAllFonts()) {
    registerFont(font.file, { family: font.family });
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('logo')
        .setDescription('Generate a 512x512 transparent PNG logo.')
        .addStringOption(option =>
            option.setName('text')
                .setDescription(`Logo text (max ${MAX_TEXT_LENGTH} chars)`)
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('size')
                .setDescription(`Font size in pixels (${MIN_FONT_SIZE}\u2013${MAX_FONT_SIZE})`)
                .setRequired(true))
        .addStringOption(option =>
            option.setName('color')
                .setDescription('Text and shape color in hex format (e.g. #FF4500)')
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
            option.setName('shape')
                .setDescription('Optional decorative shape behind the text')
                .setRequired(false)
                .addChoices(
                    { name: 'None', value: 'none' },
                    { name: 'Circle Ring', value: 'circle' },
                    { name: 'Underline', value: 'underline' }
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
        const shape = interaction.options.getString('shape') || 'none';
        const fontKey = interaction.options.getString('font') || 'another-danger';

        if (text.length > MAX_TEXT_LENGTH) {
            return interaction.reply({ content: `Text must be ${MAX_TEXT_LENGTH} characters or fewer.`, ephemeral: true });
        }
        if (size < MIN_FONT_SIZE || size > MAX_FONT_SIZE) {
            return interaction.reply({ content: `Font size must be between ${MIN_FONT_SIZE} and ${MAX_FONT_SIZE}.`, ephemeral: true });
        }
        if (!HEX_COLOR_REGEX.test(color)) {
            return interaction.reply({ content: 'Color must be a valid hex code (e.g. `#FF4500`).`, ephemeral: true });
        }

        const loadingEmbed = new EmbedBuilder().setColor('#808080').setDescription('Generating your logo...');
        const initialReply = await interaction.reply({ embeds: [loadingEmbed] });

        try {
            const canvas = createCanvas(CANVAS_SIZE, CANVAS_SIZE);
            const ctx = canvas.getContext('2d');
            // Transparent background \u2014 no fillRect

            const font = getFont(fontKey);
            // Fix #5: Number() instead of parseInt() without radix
            const shadowBlur = Number(glowIntensity);

            const centerX = CANVAS_SIZE / 2;
            const centerY = CANVAS_SIZE / 2;

            ctx.strokeStyle = color;
            ctx.fillStyle = color;

            // Draw circle ring behind text
            if (shape === 'circle') {
                const radius = CANVAS_SIZE * 0.42;
                ctx.beginPath();
                ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
                ctx.lineWidth = 3;
                ctx.shadowColor = color;
                ctx.shadowBlur = shadowBlur;
                ctx.stroke();
                // Crisp pass
                ctx.shadowColor = 'transparent';
                ctx.shadowBlur = 0;
                ctx.stroke();
            }

            // Draw text
            ctx.font = `${size}px '${font.family}'`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Glow pass
            ctx.shadowColor = color;
            ctx.shadowBlur = shadowBlur;
            ctx.fillStyle = color;
            ctx.fillText(text, centerX, centerY);

            // Crisp pass
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.fillText(text, centerX, centerY);

            // Draw underline after text
            if (shape === 'underline') {
                const metrics = ctx.measureText(text);
                const lineWidth = metrics.width * 1.1;
                const lineY = centerY + size * 0.65;
                ctx.beginPath();
                ctx.moveTo(centerX - lineWidth / 2, lineY);
                ctx.lineTo(centerX + lineWidth / 2, lineY);
                ctx.lineWidth = Math.max(2, size * 0.04);
                // Glow pass
                ctx.shadowColor = color;
                ctx.shadowBlur = shadowBlur;
                ctx.stroke();
                // Fix #2: only two strokes (glow + crisp), not three
                ctx.shadowColor = 'transparent';
                ctx.shadowBlur = 0;
                ctx.stroke();
            }

            const attachment = canvas.toBuffer('image/png');

            await initialReply.edit({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#808080')
                        .setImage('attachment://logo.png')
                        .setFooter({ text: `Discord Icon Gen \u2022 /logo \u2022 transparent \u2022 shape: ${shape} \u2022 font: ${font.label}` }),
                ],
                files: [{ attachment, name: 'logo.png' }],
            });
        } catch (error) {
            console.error('[ERROR] Logo generation failed:', error);
            await initialReply.edit({
                embeds: [new EmbedBuilder().setColor('#FF0000').setDescription('Failed to generate your logo. Please try again.')],
            });
        }
    },
};
