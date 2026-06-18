const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas } = require('canvas');
const { registerAllFonts, getAllFontFamilies, renderIcon } = require('../utils/canvas.js');
const { getBackgroundChoices } = require('../utils/backgrounds.js');
const { getBorderChoices } = require('../utils/borders.js');
const { saveEntry } = require('../utils/history.js');

registerAllFonts();

const ICON_SIZE = 512;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('compare')
        .setDescription('Compare two icon designs side by side')
        // --- Design A ---
        .addStringOption(opt => opt.setName('text_a').setDescription('Text for design A').setRequired(true))
        .addStringOption(opt => opt.setName('background_a').setDescription('Background for A').addChoices(...getBackgroundChoices()))
        .addStringOption(opt => opt.setName('border_a').setDescription('Border for A').addChoices(...getBorderChoices()))
        .addStringOption(opt => opt.setName('primary_a').setDescription('Primary color for A').setAutocomplete(true))
        .addStringOption(opt => opt.setName('secondary_a').setDescription('Secondary color for A').setAutocomplete(true))
        .addNumberOption(opt => opt.setName('glow_a').setDescription('Glow for A (0–25)').setMinValue(0).setMaxValue(25))
        // --- Design B ---
        .addStringOption(opt => opt.setName('text_b').setDescription('Text for design B').setRequired(true))
        .addStringOption(opt => opt.setName('background_b').setDescription('Background for B').addChoices(...getBackgroundChoices()))
        .addStringOption(opt => opt.setName('border_b').setDescription('Border for B').addChoices(...getBorderChoices()))
        .addStringOption(opt => opt.setName('primary_b').setDescription('Primary color for B').setAutocomplete(true))
        .addStringOption(opt => opt.setName('secondary_b').setDescription('Secondary color for B').setAutocomplete(true))
        .addNumberOption(opt => opt.setName('glow_b').setDescription('Glow for B (0–25)').setMinValue(0).setMaxValue(25)),

    async autocomplete(interaction) {
        const { colorAutocomplete } = require('../utils/colors.js');
        await colorAutocomplete(interaction);
    },

    async execute(interaction) {
        await interaction.deferReply();

        const aOpts = {
            text:       interaction.options.getString('text_a'),
            background: interaction.options.getString('background_a') ?? 'gradient-purple',
            border:     interaction.options.getString('border_a')     ?? 'none',
            primary:    interaction.options.getString('primary_a')    ?? '#ffffff',
            secondary:  interaction.options.getString('secondary_a')  ?? '#aaaaaa',
            glow:       interaction.options.getNumber('glow_a')       ?? 0,
        };
        const bOpts = {
            text:       interaction.options.getString('text_b'),
            background: interaction.options.getString('background_b') ?? 'gradient-blue',
            border:     interaction.options.getString('border_b')     ?? 'none',
            primary:    interaction.options.getString('primary_b')    ?? '#ffffff',
            secondary:  interaction.options.getString('secondary_b')  ?? '#aaaaaa',
            glow:       interaction.options.getNumber('glow_b')       ?? 0,
        };

        const [bufA, bufB] = await Promise.all([
            renderIcon(aOpts),
            renderIcon(bOpts),
        ]);

        // Stitch side-by-side
        const { loadImage } = require('canvas');
        const [imgA, imgB] = await Promise.all([loadImage(bufA), loadImage(bufB)]);
        const W = ICON_SIZE * 2 + 20;
        const H = ICON_SIZE;
        const canvas = createCanvas(W, H);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, W, H);
        ctx.drawImage(imgA, 0, 0, ICON_SIZE, ICON_SIZE);
        ctx.drawImage(imgB, ICON_SIZE + 20, 0, ICON_SIZE, ICON_SIZE);

        const buf = canvas.toBuffer('image/png');
        const attachment = new AttachmentBuilder(buf, { name: 'compare.png' });

        const embed = new EmbedBuilder()
            .setTitle('⚖️ Side-by-Side Comparison')
            .addFields(
                { name: 'Design A', value: `${aOpts.text}\nBG: ${aOpts.background} | Border: ${aOpts.border}`, inline: true },
                { name: 'Design B', value: `${bOpts.text}\nBG: ${bOpts.background} | Border: ${bOpts.border}`, inline: true },
            )
            .setImage('attachment://compare.png')
            .setColor(aOpts.primary)
            .setFooter({ text: 'Sigil • compare' });

        await interaction.editReply({ embeds: [embed], files: [attachment] });
    },
};
