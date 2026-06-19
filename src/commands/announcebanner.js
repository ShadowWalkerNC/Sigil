const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { registerAllFonts, getAllFontFamilies, renderBanner } = require('../utils/canvas.js');
const { getBackgroundChoices } = require('../utils/backgrounds.js');
const { saveEntry } = require('../utils/history.js');
const {
    ANNOUNCE_TYPE_CHOICES,
    dispatchAutocomplete,
    autocompleteColor,
    autocompleteBackground,
    autocompleteAnnounceType,
} = require('../utils/autocomplete.js');

registerAllFonts();

const TYPE_COLORS = {
    announcement: '#5865F2',
    alert:        '#ED4245',
    update:       '#3BA55C',
    event:        '#FAA61A',
    maintenance:  '#9B59B6',
    celebration:  '#FF73FA',
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('announcebanner')
        .setDescription('Generate a professional announcement graphic')
        .addStringOption(opt => opt.setName('title').setDescription('Announcement title').setRequired(true))
        .addStringOption(opt => opt.setName('body').setDescription('Body / supporting text'))
        .addStringOption(opt => opt.setName('type').setDescription('Announcement type').setAutocomplete(true))
        .addStringOption(opt => opt.setName('primary_color').setDescription('Primary hex color').setAutocomplete(true))
        .addStringOption(opt => opt.setName('secondary_color').setDescription('Secondary hex color').setAutocomplete(true))
        .addStringOption(opt => opt.setName('background').setDescription('Background style').addChoices(...getBackgroundChoices()))
        .addStringOption(opt => opt.setName('font').setDescription('Font family').addChoices(...getAllFontFamilies().map(f => ({ name: f, value: f })))),

    async autocomplete(interaction) {
        await dispatchAutocomplete(interaction, {
            type:            autocompleteAnnounceType,
            primary_color:   autocompleteColor,
            secondary_color: autocompleteColor,
            background:      autocompleteBackground,
        });
    },

    async execute(interaction) {
        await interaction.deferReply();

        const title     = interaction.options.getString('title');
        const body      = interaction.options.getString('body')      ?? '';
        const type      = interaction.options.getString('type')      ?? 'announcement';
        const primary   = interaction.options.getString('primary_color')   ?? TYPE_COLORS[type] ?? '#5865F2';
        const secondary = interaction.options.getString('secondary_color') ?? '#ffffff';
        const background= interaction.options.getString('background') ?? 'gradient-purple';
        const font      = interaction.options.getString('font')       ?? getAllFontFamilies()[0];

        const typeLabel = ANNOUNCE_TYPE_CHOICES.find(t => t.value === type)?.name ?? type;
        const fullText  = body ? `${title}\n${body}` : title;

        const buf = await renderBanner({ text: fullText, primary, secondary, background, font, align: 'center', glow: 0, opacity: 1.0 });
        const attachment = new AttachmentBuilder(buf, { name: 'announcebanner.png' });

        const embed = new EmbedBuilder()
            .setTitle(`📢 ${typeLabel}: ${title}`)
            .setDescription(body || null)
            .setImage('attachment://announcebanner.png')
            .setColor(primary)
            .addFields({ name: 'Type', value: typeLabel, inline: true })
            .setFooter({ text: 'Sigil • announcebanner' });

        await interaction.editReply({ embeds: [embed], files: [attachment] });
        saveEntry(interaction.user.id, { command: 'announcebanner', title, body, type, primary_color: primary, secondary_color: secondary, background, font });
    },
};
