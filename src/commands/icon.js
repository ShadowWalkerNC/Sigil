const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { registerAllFonts, getAllFontFamilies, renderIcon } = require('../utils/canvas.js');
const { getBackgroundChoices } = require('../utils/backgrounds.js');
const { getBorderChoices } = require('../utils/borders.js');
const { saveEntry } = require('../utils/history.js');

registerAllFonts();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('icon')
        .setDescription('Generate a server icon')
        .addStringOption(opt => opt.setName('text').setDescription('Text to display').setRequired(true))
        .addStringOption(opt => opt.setName('background').setDescription('Background style').addChoices(...getBackgroundChoices()))
        .addStringOption(opt => opt.setName('border').setDescription('Border style').addChoices(...getBorderChoices()))
        .addStringOption(opt => opt.setName('primary_color').setDescription('Primary hex color').setAutocomplete(true))
        .addStringOption(opt => opt.setName('secondary_color').setDescription('Secondary hex color').setAutocomplete(true))
        .addStringOption(opt => opt.setName('font').setDescription('Font family').addChoices(...getAllFontFamilies().map(f => ({ name: f, value: f }))))
        .addNumberOption(opt => opt.setName('glow').setDescription('Glow intensity (0–25)').setMinValue(0).setMaxValue(25))
        .addNumberOption(opt => opt.setName('opacity').setDescription('Background opacity (0.0–1.0)').setMinValue(0).setMaxValue(1)),

    async autocomplete(interaction) {
        const { colorAutocomplete } = require('../utils/colors.js');
        await colorAutocomplete(interaction);
    },

    async execute(interaction) {
        await interaction.deferReply();

        const text       = interaction.options.getString('text');
        const background = interaction.options.getString('background')      ?? 'gradient-purple';
        const border     = interaction.options.getString('border')          ?? 'none';
        const primary    = interaction.options.getString('primary_color')   ?? '#ffffff';
        const secondary  = interaction.options.getString('secondary_color') ?? '#aaaaaa';
        const font       = interaction.options.getString('font')            ?? getAllFontFamilies()[0];
        const glow       = interaction.options.getNumber('glow')            ?? 0;
        const opacity    = interaction.options.getNumber('opacity')         ?? 1.0;

        const buf = await renderIcon({ text, background, border, primary, secondary, font, glow, opacity });
        const attachment = new AttachmentBuilder(buf, { name: 'icon.png' });

        const embed = new EmbedBuilder()
            .setTitle(`🖼️ ${text}`)
            .setDescription('Your custom server icon is ready!')
            .setImage('attachment://icon.png')
            .setColor(primary)
            .setFooter({ text: 'Sigil • icon' });

        await interaction.editReply({ embeds: [embed], files: [attachment] });
        saveEntry(interaction.user.id, { command: 'icon', text, background, border, primary_color: primary, secondary_color: secondary, font, glow, opacity });
    },
};
