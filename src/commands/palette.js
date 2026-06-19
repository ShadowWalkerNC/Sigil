const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas } = require('canvas');
const { saveEntry } = require('../utils/history.js');
const {
    PALETTE_FORMAT_CHOICES,
    dispatchAutocomplete,
    autocompleteColor,
    autocompletePaletteFormat,
} = require('../utils/autocomplete.js');

function buildSwatchImage(colors) {
    const W = 600, H = 120;
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');
    const sw = W / colors.length;
    colors.forEach((c, i) => {
        ctx.fillStyle = c;
        ctx.fillRect(i * sw, 0, sw, H);
        ctx.fillStyle = isLight(c) ? '#000' : '#fff';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(c.toUpperCase(), i * sw + sw / 2, H / 2);
    });
    return canvas.toBuffer('image/png');
}

function isLight(hex) {
    const r = parseInt(hex.slice(1,3),16);
    const g = parseInt(hex.slice(3,5),16);
    const b = parseInt(hex.slice(5,7),16);
    return (0.299*r + 0.587*g + 0.114*b) > 128;
}

function exportPalette(format, colors) {
    const named = ['primary','secondary','accent','neutral','highlight'];
    if (format === 'css') {
        return ':root {\n' + colors.map((c,i) => `  --color-${named[i]}: ${c};`).join('\n') + '\n}';
    }
    if (format === 'tailwind') {
        const obj = Object.fromEntries(colors.map((c,i) => [named[i], c]));
        return `module.exports = {\n  theme: {\n    extend: {\n      colors: ${JSON.stringify(obj, null, 6)}\n    }\n  }\n};`;
    }
    return colors.join('\n');
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('palette')
        .setDescription('Export a colour palette or generate one from inputs')
        .addSubcommand(sub =>
            sub.setName('export')
               .setDescription('Export palette as CSS, Tailwind, or hex list')
               .addStringOption(opt => opt.setName('format').setDescription('Output format').setRequired(true).setAutocomplete(true))
               .addStringOption(opt => opt.setName('primary').setDescription('Primary color (hex)').setAutocomplete(true))
               .addStringOption(opt => opt.setName('secondary').setDescription('Secondary color (hex)').setAutocomplete(true))
               .addStringOption(opt => opt.setName('color3').setDescription('Third color (hex)').setAutocomplete(true))
               .addStringOption(opt => opt.setName('color4').setDescription('Fourth color (hex)').setAutocomplete(true))
               .addStringOption(opt => opt.setName('color5').setDescription('Fifth color (hex)').setAutocomplete(true))
        ),

    async autocomplete(interaction) {
        await dispatchAutocomplete(interaction, {
            format:    autocompletePaletteFormat,
            primary:   autocompleteColor,
            secondary: autocompleteColor,
            color3:    autocompleteColor,
            color4:    autocompleteColor,
            color5:    autocompleteColor,
        });
    },

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        if (sub !== 'export') return;

        await interaction.deferReply({ ephemeral: true });

        const format = interaction.options.getString('format') ?? 'hex';
        const colors = [
            interaction.options.getString('primary')   ?? '#5865F2',
            interaction.options.getString('secondary') ?? '#99AAB5',
            interaction.options.getString('color3')    ?? '#2C2F33',
            interaction.options.getString('color4')    ?? '#23272A',
            interaction.options.getString('color5')    ?? '#ffffff',
        ];

        const formatLabel = PALETTE_FORMAT_CHOICES.find(f => f.value === format)?.name ?? format;
        const exported = exportPalette(format, colors);
        const swatchBuf = buildSwatchImage(colors);
        const attachment = new AttachmentBuilder(swatchBuf, { name: 'palette.png' });

        const embed = new EmbedBuilder()
            .setTitle('🎨 Palette Export')
            .setDescription(`**Format:** ${formatLabel}\n\`\`\`${format === 'hex' ? '' : format}\n${exported}\n\`\`\``)
            .setImage('attachment://palette.png')
            .setColor(colors[0])
            .setFooter({ text: 'Sigil • palette export' });

        await interaction.editReply({ embeds: [embed], files: [attachment] });
        saveEntry(interaction.user.id, { command: 'palette export', format, colors });
    },
};
