const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const { createCanvas, registerFont, loadImage } = require('canvas');
const { getFont, getFontChoices } = require('../utils/fonts');

const HEX_COLOR_REGEX = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;
const MAX_TEXT_LENGTH = 20;
const MIN_FONT_SIZE = 10;
const MAX_FONT_SIZE = 150;
const CANVAS_SIZE = 400;

const TEXT_POSITIONS = {
    top: 0.15,
    center: 0.5,
    bottom: 0.85,
};

// Fix #3: register all fonts at module load time, not per-interaction
const { getAllFonts } = require('../utils/fonts');
for (const font of getAllFonts()) {
    registerFont(font.file, { family: font.family });
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('avatar')
        .setDescription('Overlay custom text on your Discord avatar.')
        .addStringOption(option =>
            option.setName('text')
                .setDescription(`Text to overlay (max ${MAX_TEXT_LENGTH} chars)`)
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('size')
                .setDescription(`Font size in pixels (${MIN_FONT_SIZE}\u2013${MAX_FONT_SIZE})`)
                .setRequired(true))
        .addStringOption(option =>
            option.setName('color')
                .setDescription('Text color in hex format (e.g. #FFFFFF)')
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
            option.setName('position')
                .setDescription('Where to place the text on the avatar')
                .setRequired(true)
                .addChoices(
                    { name: 'Top', value: 'top' },
                    { name: 'Center', value: 'center' },
                    { name: 'Bottom', value: 'bottom' }
                ))
        .addBooleanOption(option =>
            option.setName('circular')
                .setDescription('Crop the avatar into a circle (default: false)')
                .setRequired(false))
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
        const position = interaction.options.getString('position') || 'bottom';
        const circular = interaction.options.getBoolean('circular') ?? false;
        const fontKey = interaction.options.getString('font') || 'another-danger';

        if (text.length > MAX_TEXT_LENGTH) {
            return interaction.reply({ content: `Text must be ${MAX_TEXT_LENGTH} characters or fewer.`, ephemeral: true });
        }
        if (size < MIN_FONT_SIZE || size > MAX_FONT_SIZE) {
            return interaction.reply({ content: `Font size must be between ${MIN_FONT_SIZE} and ${MAX_FONT_SIZE}.`, ephemeral: true });
        }
        if (!HEX_COLOR_REGEX.test(color)) {
            return interaction.reply({ content: 'Color must be a valid hex code (e.g. `#FFFFFF`).', ephemeral: true });
        }

        const loadingEmbed = new EmbedBuilder().setColor('#808080').setDescription('Generating your avatar overlay...');
        const initialReply = await interaction.reply({ embeds: [loadingEmbed] });

        try {
            const canvas = createCanvas(CANVAS_SIZE, CANVAS_SIZE);
            const ctx = canvas.getContext('2d');

            const font = getFont(fontKey);
            // Fix #5: Number() instead of parseInt() without radix
            const shadowBlur = Number(glowIntensity);

            const avatarURL = interaction.user.displayAvatarURL({ extension: 'png', size: 256 });

            try {
                const avatarImage = await loadImage(avatarURL);

                if (circular) {
                    // Fix #1: ctx.save() before clip so state can be fully restored after
                    ctx.save();
                    ctx.beginPath();
                    ctx.arc(CANVAS_SIZE / 2, CANVAS_SIZE / 2, CANVAS_SIZE / 2, 0, Math.PI * 2);
                    ctx.closePath();
                    ctx.clip();
                }

                ctx.drawImage(avatarImage, 0, 0, CANVAS_SIZE, CANVAS_SIZE);

                if (circular) {
                    // Fix #1: restore clip state so text and any future layers are unclipped
                    ctx.restore();
                }
            } catch {
                // Fallback: solid dark background if avatar fails to load
                ctx.fillStyle = '#2b2d31';
                ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
            }

            // Overlay text
            const textY = CANVAS_SIZE * (TEXT_POSITIONS[position] ?? 0.85);

            ctx.font = `${size}px '${font.family}'`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Glow pass
            ctx.shadowColor = color;
            ctx.shadowBlur = shadowBlur;
            ctx.fillStyle = color;
            ctx.fillText(text, CANVAS_SIZE / 2, textY);

            // Crisp pass
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.fillText(text, CANVAS_SIZE / 2, textY);

            const attachment = canvas.toBuffer();

            await initialReply.edit({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#808080')
                        .setImage('attachment://avatar_overlay.png')
                        .setFooter({ text: `Discord Icon Gen \u2022 /avatar \u2022 ${circular ? 'circular' : 'square'} \u2022 position: ${position}` }),
                ],
                files: [{ attachment, name: 'avatar_overlay.png' }],
            });
        } catch (error) {
            console.error('[ERROR] Avatar overlay failed:', error);
            await initialReply.edit({
                embeds: [new EmbedBuilder().setColor('#FF0000').setDescription('Failed to generate your avatar overlay. Please try again.')],
            });
        }
    },
};
