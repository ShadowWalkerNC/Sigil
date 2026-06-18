const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const path = require('path');
const { registerAllFonts, getAllFontFamilies, renderIcon } = require('../utils/canvas.js');
const { getBackgroundChoices } = require('../utils/backgrounds.js');
const { getBorderChoices } = require('../utils/borders.js');
const { saveEntry } = require('../utils/history.js');

registerAllFonts();

const AVATAR_SIZE = 512;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('avatar')
        .setDescription('Generate a server avatar / profile icon with an overlay image')
        .addStringOption(opt => opt.setName('text').setDescription('Text to display').setRequired(true))
        .addStringOption(opt => opt.setName('overlay').setDescription('URL of image to overlay').setRequired(false))
        .addStringOption(opt => opt
            .setName('background')
            .setDescription('Background style')
            .addChoices(...getBackgroundChoices())
        )
        .addStringOption(opt => opt
            .setName('border')
            .setDescription('Border style')
            .addChoices(...getBorderChoices())
        )
        .addStringOption(opt => opt
            .setName('primary_color')
            .setDescription('Primary hex color (e.g. #ff0000)')
            .setAutocomplete(true)
        )
        .addStringOption(opt => opt
            .setName('secondary_color')
            .setDescription('Secondary hex color (e.g. #0000ff)')
            .setAutocomplete(true)
        )
        .addStringOption(opt => opt
            .setName('font')
            .setDescription('Font family')
            .addChoices(...getAllFontFamilies().map(f => ({ name: f, value: f })))
        )
        .addNumberOption(opt => opt.setName('glow').setDescription('Glow intensity (0–25)').setMinValue(0).setMaxValue(25))
        .addNumberOption(opt => opt.setName('opacity').setDescription('Background opacity (0.0–1.0)').setMinValue(0).setMaxValue(1)),

    async autocomplete(interaction) {
        const { colorAutocomplete } = require('../utils/colors.js');
        await colorAutocomplete(interaction);
    },

    async execute(interaction) {
        await interaction.deferReply();

        const text      = interaction.options.getString('text');
        const overlayURL = interaction.options.getString('overlay');
        const background = interaction.options.getString('background') ?? 'gradient-purple';
        const border    = interaction.options.getString('border')     ?? 'none';
        const primary   = interaction.options.getString('primary_color') ?? '#ffffff';
        const secondary = interaction.options.getString('secondary_color') ?? '#aaaaaa';
        const font      = interaction.options.getString('font')      ?? getAllFontFamilies()[0];
        const glow      = interaction.options.getNumber('glow')      ?? 0;
        const opacity   = interaction.options.getNumber('opacity')   ?? 1.0;

        // 1. Render the base icon
        const iconBuf = await renderIcon({ text, background, border, primary, secondary, font, glow, opacity });

        // 2. If overlay URL provided, composite it
        let finalBuf = iconBuf;
        if (overlayURL) {
            try {
                const base = await loadImage(iconBuf);
                const overlay = await loadImage(overlayURL);

                const canvas = createCanvas(AVATAR_SIZE, AVATAR_SIZE);
                const ctx = canvas.getContext('2d');

                // Draw base icon
                ctx.drawImage(base, 0, 0, AVATAR_SIZE, AVATAR_SIZE);

                // Clip to circle
                ctx.save();
                ctx.beginPath();
                ctx.arc(AVATAR_SIZE / 2, AVATAR_SIZE / 2, AVATAR_SIZE / 2, 0, Math.PI * 2);
                ctx.clip();

                // Draw overlay scaled to fit
                const scale = Math.min(AVATAR_SIZE / overlay.width, AVATAR_SIZE / overlay.height);
                const w = overlay.width * scale;
                const h = overlay.height * scale;
                const x = (AVATAR_SIZE - w) / 2;
                const y = (AVATAR_SIZE - h) / 2;
                ctx.drawImage(overlay, x, y, w, h);
                ctx.restore();

                finalBuf = canvas.toBuffer('image/png');
            } catch (err) {
                console.error('[avatar] Overlay load failed:', err.message);
                // fall back to base icon
            }
        }

        const attachment = new AttachmentBuilder(finalBuf, { name: 'avatar.png' });

        const embed = new EmbedBuilder()
            .setTitle(`🖼️ ${text}`)
            .setDescription('Your custom server avatar is ready!')
            .setImage('attachment://avatar.png')
            .setColor(primary)
            .setFooter({ text: 'Sigil • avatar' });

        await interaction.editReply({ embeds: [embed], files: [attachment] });

        saveEntry(interaction.user.id, {
            command: 'avatar', text, background, border,
            primary_color: primary, secondary_color: secondary,
            font, glow, opacity,
        });
    },
};
