const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas } = require('canvas');
const { registerAllFonts, getAllFontFamilies, renderIcon } = require('../utils/canvas.js');
const { getBackgroundChoices } = require('../utils/backgrounds.js');
const { getBorderChoices } = require('../utils/borders.js');
const { saveEntry } = require('../utils/history.js');
const { getColorAutocomplete } = require('../utils/colors.js');

registerAllFonts();

const ICON_SIZE = 512;

const SHAPE_CHOICES = [
    { name: 'Circle',  value: 'circle'  },
    { name: 'Rounded', value: 'rounded' },
    { name: 'Square',  value: 'square'  },
    { name: 'Hexagon', value: 'hexagon' },
    { name: 'Diamond', value: 'diamond' },
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('compare')
        .setDescription('Compare two icon designs side by side')
        .addStringOption(opt => opt.setName('text_a').setDescription('Text for design A').setRequired(true))
        .addStringOption(opt => opt.setName('text_b').setDescription('Text for design B').setRequired(true))
        .addStringOption(opt => opt.setName('shape_a').setDescription('Shape for A').addChoices(...SHAPE_CHOICES))
        .addStringOption(opt => opt.setName('background_a').setDescription('Background for A').addChoices(...getBackgroundChoices()))
        .addStringOption(opt => opt.setName('border_a').setDescription('Border for A').addChoices(...getBorderChoices()))
        .addStringOption(opt => opt.setName('primary_a').setDescription('Primary color for A').setAutocomplete(true))
        .addStringOption(opt => opt.setName('secondary_a').setDescription('Secondary color for A').setAutocomplete(true))
        .addNumberOption(opt => opt.setName('glow_a').setDescription('Glow for A (0–25)').setMinValue(0).setMaxValue(25))
        .addStringOption(opt => opt.setName('shape_b').setDescription('Shape for B').addChoices(...SHAPE_CHOICES))
        .addStringOption(opt => opt.setName('background_b').setDescription('Background for B').addChoices(...getBackgroundChoices()))
        .addStringOption(opt => opt.setName('border_b').setDescription('Border for B').addChoices(...getBorderChoices()))
        .addStringOption(opt => opt.setName('primary_b').setDescription('Primary color for B').setAutocomplete(true))
        .addStringOption(opt => opt.setName('secondary_b').setDescription('Secondary color for B').setAutocomplete(true))
        .addNumberOption(opt => opt.setName('glow_b').setDescription('Glow for B (0–25)').setMinValue(0).setMaxValue(25)),

    async autocomplete(interaction) {
        const focused = interaction.options.getFocused();
        const results = getColorAutocomplete(focused);
        await interaction.respond(results);
    },

    async execute(interaction) {
        await interaction.deferReply();

        const aOpts = {
            text:       interaction.options.getString('text_a'),
            shape:      interaction.options.getString('shape_a')      ?? 'square',
            background: interaction.options.getString('background_a') ?? 'gradient-purple',
            border:     interaction.options.getString('border_a')     ?? 'none',
            primary:    interaction.options.getString('primary_a')    ?? '#ffffff',
            secondary:  interaction.options.getString('secondary_a')  ?? '#aaaaaa',
            glow:       interaction.options.getNumber('glow_a')       ?? 0,
        };
        const bOpts = {
            text:       interaction.options.getString('text_b'),
            shape:      interaction.options.getString('shape_b')      ?? 'square',
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

        const { loadImage } = require('canvas');
        const [imgA, imgB] = await Promise.all([loadImage(bufA), loadImage(bufB)]);
        const GAP = 20;
        const W = ICON_SIZE * 2 + GAP;
        const H = ICON_SIZE;
        const canvas = createCanvas(W, H);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#111111';
        ctx.fillRect(0, 0, W, H);
        ctx.drawImage(imgA, 0, 0, ICON_SIZE, ICON_SIZE);
        ctx.drawImage(imgB, ICON_SIZE + GAP, 0, ICON_SIZE, ICON_SIZE);

        const buf = canvas.toBuffer('image/png');
        const attachment = new AttachmentBuilder(buf, { name: 'compare.png' });

        const shapeLabel = s => (SHAPE_CHOICES.find(x => x.value === s)?.name ?? s);

        const embed = new EmbedBuilder()
            .setTitle('⚖️ Side-by-Side Comparison')
            .addFields(
                {
                    name: 'Design A',
                    value: [
                        `**${aOpts.text}**`,
                        `Shape: ${shapeLabel(aOpts.shape)}`,
                        `BG: ${aOpts.background} | Border: ${aOpts.border}`,
                    ].join('\n'),
                    inline: true,
                },
                {
                    name: 'Design B',
                    value: [
                        `**${bOpts.text}**`,
                        `Shape: ${shapeLabel(bOpts.shape)}`,
                        `BG: ${bOpts.background} | Border: ${bOpts.border}`,
                    ].join('\n'),
                    inline: true,
                },
            )
            .setImage('attachment://compare.png')
            .setColor(aOpts.primary)
            .setFooter({ text: 'Sigil • compare' });

        await interaction.editReply({ embeds: [embed], files: [attachment] });
        saveEntry(interaction.user.id, { command: 'compare', a: aOpts, b: bOpts });
    },
};
