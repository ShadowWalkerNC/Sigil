const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { renderKit, registerAllFonts, getAllFontFamilies } = require('../utils/canvas.js');
const { getBackgroundChoices } = require('../utils/backgrounds.js');
const { getColorAutocomplete } = require('../utils/colors.js');
const guard = require('../utils/packageGuard');

registerAllFonts();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('eventbanner')
        .setDescription('Generate a banner for a server event')
        .addStringOption(opt => opt.setName('event').setDescription('Event name').setRequired(true))
        .addStringOption(opt => opt.setName('date').setDescription('Event date (e.g. July 4th)'))
        .addStringOption(opt => opt.setName('primary').setDescription('Primary color').setAutocomplete(true))
        .addStringOption(opt => opt.setName('secondary').setDescription('Secondary color').setAutocomplete(true))
        .addStringOption(opt => opt.setName('background').setDescription('Background style').addChoices(...getBackgroundChoices()))
        .addStringOption(opt => opt.setName('font').setDescription('Font family').addChoices(...getAllFontFamilies().map(f => ({ name: f, value: f }))))
        .addNumberOption(opt => opt.setName('glow').setDescription('Glow intensity (0–25)').setMinValue(0).setMaxValue(25)),

    async autocomplete(interaction) {
        await interaction.respond(getColorAutocomplete(interaction.options.getFocused()));
    },

    async execute(interaction) {
        if (await guard(interaction, 'community')) return;
        await interaction.deferReply();
        const event      = interaction.options.getString('event');
        const date       = interaction.options.getString('date')       ?? '';
        const primary    = interaction.options.getString('primary')    ?? '#8B0000';
        const secondary  = interaction.options.getString('secondary')  ?? '#4B0082';
        const background = interaction.options.getString('background') ?? 'midnight-gradient';
        const font       = interaction.options.getString('font')       ?? 'Arial Black';
        const glow       = interaction.options.getNumber('glow')       ?? 12;
        const bannerText = date ? `${event} — ${date}` : event;
        const { bannerBuf } = await renderKit({ text: event.slice(0,4).toUpperCase(), bannerText, background, primary, secondary, font, glow });
        const attachment = new AttachmentBuilder(bannerBuf, { name: 'eventbanner.png' });
        const embed = new EmbedBuilder()
            .setTitle(`🎉 Event Banner — ${event}`)
            .setImage('attachment://eventbanner.png')
            .setColor(primary)
            .setFooter({ text: 'Sigil • /eventbanner' });
        await interaction.editReply({ embeds: [embed], files: [attachment] });
    },
};
