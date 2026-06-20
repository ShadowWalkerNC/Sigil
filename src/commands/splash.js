const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { renderKit, registerAllFonts, getAllFontFamilies } = require('../utils/canvas.js');
const { getBackgroundChoices } = require('../utils/backgrounds.js');
const { getColorAutocomplete } = require('../utils/colors.js');
const guard = require('../utils/packageGuard');

registerAllFonts();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('splash')
        .setDescription('Generate a server splash / invite background image')
        .addStringOption(opt => opt.setName('text').setDescription('Main text').setRequired(true))
        .addStringOption(opt => opt.setName('primary').setDescription('Primary color').setAutocomplete(true))
        .addStringOption(opt => opt.setName('secondary').setDescription('Secondary color').setAutocomplete(true))
        .addStringOption(opt => opt.setName('background').setDescription('Background style').addChoices(...getBackgroundChoices()))
        .addStringOption(opt => opt.setName('font').setDescription('Font family').addChoices(...getAllFontFamilies().map(f => ({ name: f, value: f }))))
        .addNumberOption(opt => opt.setName('glow').setDescription('Glow intensity (0–25)').setMinValue(0).setMaxValue(25)),

    async autocomplete(interaction) {
        await interaction.respond(getColorAutocomplete(interaction.options.getFocused()));
    },

    async execute(interaction) {
        if (await guard(interaction, 'nitrofree')) return;
        await interaction.deferReply();
        const text       = interaction.options.getString('text');
        const primary    = interaction.options.getString('primary')    ?? '#8B0000';
        const secondary  = interaction.options.getString('secondary')  ?? '#4B0082';
        const background = interaction.options.getString('background') ?? 'midnight-gradient';
        const font       = interaction.options.getString('font')       ?? 'Arial Black';
        const glow       = interaction.options.getNumber('glow')       ?? 12;
        const { bannerBuf } = await renderKit({ text, bannerText: text, background, primary, secondary, font, glow });
        const attachment = new AttachmentBuilder(bannerBuf, { name: 'sigil-splash.png' });
        const embed = new EmbedBuilder()
            .setTitle('🌅 Splash Image Generated')
            .setColor(primary)
            .setImage('attachment://sigil-splash.png')
            .setFooter({ text: 'Sigil • /splash' });
        await interaction.editReply({ embeds: [embed], files: [attachment] });
    },
};
