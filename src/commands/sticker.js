const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { registerAllFonts, getAllFontFamilies, renderIcon } = require('../utils/canvas.js');
const { getBackgroundChoices } = require('../utils/backgrounds.js');
const { getBorderChoices } = require('../utils/borders.js');
const { saveEntry } = require('../utils/history.js');
const { getColorAutocomplete } = require('../utils/colors.js');

registerAllFonts();

const SHAPE_CHOICES = [
    { name: 'Square',  value: 'square'  },
    { name: 'Rounded', value: 'rounded' },
    { name: 'Circle',  value: 'circle'  },
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sticker')
        .setDescription('Generate a Discord-format sticker (320×320 PNG) — upload it to your server for free')
        .addStringOption(opt => opt.setName('text').setDescription('Sticker text (keep it short!)').setRequired(true))
        .addStringOption(opt => opt.setName('shape').setDescription('Sticker shape').addChoices(...SHAPE_CHOICES))
        .addStringOption(opt => opt.setName('background').setDescription('Background style').addChoices(...getBackgroundChoices()))
        .addStringOption(opt => opt.setName('border').setDescription('Border style').addChoices(...getBorderChoices()))
        .addStringOption(opt => opt.setName('primary_color').setDescription('Primary hex color').setAutocomplete(true))
        .addStringOption(opt => opt.setName('secondary_color').setDescription('Secondary hex color').setAutocomplete(true))
        .addStringOption(opt => opt.setName('font').setDescription('Font family').addChoices(...getAllFontFamilies().map(f => ({ name: f, value: f }))))
        .addNumberOption(opt => opt.setName('glow').setDescription('Glow intensity (0–25)').setMinValue(0).setMaxValue(25)),

    async autocomplete(interaction) {
        const focused = interaction.options.getFocused();
        const results = getColorAutocomplete(focused);
        await interaction.respond(results);
    },

    async execute(interaction) {
        await interaction.deferReply();

        const text       = interaction.options.getString('text');
        const shape      = interaction.options.getString('shape')          ?? 'rounded';
        const background = interaction.options.getString('background')     ?? 'gradient-purple';
        const border     = interaction.options.getString('border')         ?? 'none';
        const primary    = interaction.options.getString('primary_color')  ?? '#ffffff';
        const secondary  = interaction.options.getString('secondary_color') ?? '#aaaaaa';
        const font       = interaction.options.getString('font')           ?? getAllFontFamilies()[0];
        const glow       = interaction.options.getNumber('glow')           ?? 0;

        const buf = await renderIcon({ text, shape, background, border, primary, secondary, font, glow, width: 320, height: 320 });
        const attachment = new AttachmentBuilder(buf, { name: 'sticker.png' });

        const embed = new EmbedBuilder()
            .setTitle('🏷️ Sticker Ready')
            .setDescription(
                `Your **${text}** sticker is ready!\n\n` +
                '**To use it:**\n' +
                '1. Download the image below\n' +
                '2. Go to **Server Settings \u2192 Stickers**\n' +
                '3. Upload it \u2014 free for all servers, no Nitro needed'
            )
            .setImage('attachment://sticker.png')
            .setColor(primary)
            .addFields(
                { name: 'Size', value: '320 × 320 px', inline: true },
                { name: 'Format', value: 'PNG', inline: true },
                { name: 'Shape', value: shape.charAt(0).toUpperCase() + shape.slice(1), inline: true },
            )
            .setFooter({ text: 'Sigil • sticker — Discord stickers are free to upload for server admins' });

        await interaction.editReply({ embeds: [embed], files: [attachment] });

        saveEntry(interaction.user.id, {
            command: 'sticker', text, shape, background, border,
            primary_color: primary, secondary_color: secondary, font, glow,
        });
    },
};
