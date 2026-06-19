const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { registerAllFonts, getAllFontFamilies, renderBanner } = require('../utils/canvas.js');
const { getBackgroundChoices } = require('../utils/backgrounds.js');
const { saveEntry } = require('../utils/history.js');
const {
    EVENT_TYPE_CHOICES,
    dispatchAutocomplete,
    autocompleteColor,
    autocompleteBackground,
    autocompleteEventType,
} = require('../utils/autocomplete.js');

registerAllFonts();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('eventbanner')
        .setDescription('Generate an event banner with title, date, description, and host')
        .addStringOption(opt => opt.setName('title').setDescription('Event name').setRequired(true))
        .addStringOption(opt => opt.setName('date').setDescription('Date/time string, e.g. Saturday June 21 8PM EST').setRequired(true))
        .addStringOption(opt => opt.setName('description').setDescription('Short event description'))
        .addStringOption(opt => opt.setName('host').setDescription('Host name'))
        .addStringOption(opt => opt.setName('type').setDescription('Event type').setAutocomplete(true))
        .addStringOption(opt => opt.setName('primary_color').setDescription('Primary hex color').setAutocomplete(true))
        .addStringOption(opt => opt.setName('background').setDescription('Background style').addChoices(...getBackgroundChoices()))
        .addStringOption(opt => opt.setName('font').setDescription('Font family').addChoices(...getAllFontFamilies().map(f => ({ name: f, value: f })))),

    async autocomplete(interaction) {
        await dispatchAutocomplete(interaction, {
            type:          autocompleteEventType,
            primary_color: autocompleteColor,
            background:    autocompleteBackground,
        });
    },

    async execute(interaction) {
        await interaction.deferReply();

        const title       = interaction.options.getString('title');
        const date        = interaction.options.getString('date');
        const description = interaction.options.getString('description') ?? '';
        const host        = interaction.options.getString('host')        ?? '';
        const type        = interaction.options.getString('type')        ?? 'gaming';
        const primary     = interaction.options.getString('primary_color') ?? '#5865F2';
        const background  = interaction.options.getString('background')  ?? 'gradient-purple';
        const font        = interaction.options.getString('font')         ?? getAllFontFamilies()[0];

        const typeLabel = EVENT_TYPE_CHOICES.find(t => t.value === type)?.name ?? type;
        const lines = [title, date, description, host ? `Hosted by ${host}` : ''].filter(Boolean).join('\n');

        const buf = await renderBanner({ text: lines, primary, secondary: '#ffffff', background, font, align: 'center', glow: 0, opacity: 1.0 });
        const attachment = new AttachmentBuilder(buf, { name: 'eventbanner.png' });

        const embed = new EmbedBuilder()
            .setTitle(`🎉 ${title}`)
            .addFields(
                { name: 'Date',  value: date,      inline: true },
                { name: 'Type',  value: typeLabel,  inline: true },
                ...(host ? [{ name: 'Host', value: host, inline: true }] : []),
                ...(description ? [{ name: 'Description', value: description }] : []),
            )
            .setImage('attachment://eventbanner.png')
            .setColor(primary)
            .setFooter({ text: 'Sigil • eventbanner' });

        await interaction.editReply({ embeds: [embed], files: [attachment] });
        saveEntry(interaction.user.id, { command: 'eventbanner', title, date, description, host, type, primary_color: primary, background, font });
    },
};
