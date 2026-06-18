const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { registerAllFonts, getAllFontFamilies, renderIcon } = require('../utils/canvas.js');
const { getBackgroundChoices } = require('../utils/backgrounds.js');
const { getBorderChoices } = require('../utils/borders.js');
const { saveEntry } = require('../utils/history.js');

registerAllFonts();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('logo')
        .setDescription('Generate a logo-style icon')
        .addStringOption(opt => opt.setName('text').setDescription('Text to display').setRequired(true))
        .addStringOption(opt => opt.setName('background').setDescription('Background style').addChoices(...getBackgroundChoices()))
        .addStringOption(opt => opt.setName('border').setDescription('Border style').addChoices(...getBorderChoices()))
        .addStringOption(opt => opt.setName('primary_color').setDescription('Primary hex color').setAutocomplete(true))
        .addStringOption(opt => opt.setName('secondary_color').setDescription('Secondary hex color').setAutocomplete(true))
        .addStringOption(opt => opt.setName('font').setDescription('Font family').addChoices(...getAllFontFamilies().map(f => ({ name: f, value: f }))))
        .addNumberOption(opt => opt.setName('glow').setDescription('Glow intensity (0–25)').setMinValue(0).setMaxValue(25)),

    async autocomplete(interaction) {
        const { colorAutocomplete } = require('../utils/colors.js');
        await colorAutocomplete(interaction);
    },

    async execute(interaction) {
        await interaction.deferReply();

        const text       = interaction.options.getString('text');
        const background = interaction.options.getString('background')      ?? 'solid-black';
        const border     = interaction.options.getString('border')          ?? 'solid';
        const primary    = interaction.options.getString('primary_color')   ?? '#ffffff';
        const secondary  = interaction.options.getString('secondary_color') ?? '#aaaaaa';
        const font       = interaction.options.getString('font')            ?? getAllFontFamilies()[0];
        const glow       = interaction.options.getNumber('glow')            ?? 5;

        const buf = await renderIcon({ text, background, border, primary, secondary, font, glow });
        const attachment = new AttachmentBuilder(buf, { name: 'logo.png' });

        const embed = new EmbedBuilder()
            .setTitle(`🪙 ${text}`)
            .setDescription('Your logo is ready!')
            .setImage('attachment://logo.png')
            .setColor(primary)
            .setFooter({ text: 'Sigil • logo' });

        await interaction.editReply({ embeds: [embed], files: [attachment] });
        saveEntry(interaction.user.id, { command: 'logo', text, background, border, primary_color: primary, secondary_color: secondary, font, glow });
    },
};
