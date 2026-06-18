const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas } = require('canvas');
const { registerAllFonts, getAllFontFamilies, renderIcon } = require('../utils/canvas.js');
const { getBackgroundChoices, getBackgroundById } = require('../utils/backgrounds.js');
const { getBorderChoices } = require('../utils/borders.js');

registerAllFonts();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('preview')
        .setDescription('Preview all backgrounds and borders in a grid')
        .addStringOption(opt => opt.setName('text').setDescription('Text to preview').setRequired(true))
        .addStringOption(opt => opt.setName('primary_color').setDescription('Primary color').setAutocomplete(true))
        .addStringOption(opt => opt.setName('secondary_color').setDescription('Secondary color').setAutocomplete(true)),

    async autocomplete(interaction) {
        const { colorAutocomplete } = require('../utils/colors.js');
        await colorAutocomplete(interaction);
    },

    async execute(interaction) {
        await interaction.deferReply();

        const text      = interaction.options.getString('text');
        const primary   = interaction.options.getString('primary_color')   ?? '#ffffff';
        const secondary = interaction.options.getString('secondary_color') ?? '#aaaaaa';
        const font      = getAllFontFamilies()[0] ?? 'Arial';

        const bgChoices     = getBackgroundChoices();
        const borderChoices = getBorderChoices();

        const CELL = 128;
        const COLS = 5;
        const ROWS = Math.ceil(bgChoices.length / COLS);
        const canvas = createCanvas(CELL * COLS, CELL * ROWS);
        const ctx    = canvas.getContext('2d');
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        for (let i = 0; i < bgChoices.length; i++) {
            const bgId = bgChoices[i].value;
            const buf = await renderIcon({ text, background: bgId, border: 'none', primary, secondary, font, glow: 0 });
            const { loadImage } = require('canvas');
            const img = await loadImage(buf);
            const col = i % COLS;
            const row = Math.floor(i / COLS);
            try {
                ctx.drawBackground?.(ctx, CELL, CELL);
            } catch {}
            ctx.drawImage(img, col * CELL, row * CELL, CELL, CELL);
        }

        const buf = canvas.toBuffer('image/png');
        const attachment = new AttachmentBuilder(buf, { name: 'preview.png' });

        const embed = new EmbedBuilder()
            .setTitle('👁️ Background Preview Grid')
            .setDescription(`Previewing ${bgChoices.length} backgrounds with text: **${text}**`)
            .setImage('attachment://preview.png')
            .setColor(primary)
            .setFooter({ text: 'Sigil • preview' });

        await interaction.editReply({ embeds: [embed], files: [attachment] });
    },
};
