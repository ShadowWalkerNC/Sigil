const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { registerAllFonts, getAllFontFamilies, renderIcon } = require('../utils/canvas.js');
const { getBackgroundChoices } = require('../utils/backgrounds.js');
const { saveEntry } = require('../utils/history.js');
const { getColorAutocomplete } = require('../utils/colors.js');
const guard = require('../utils/packageGuard');

registerAllFonts();

const SHAPE_CHOICES = [
    { name: 'Square',  value: 'square'  },
    { name: 'Rounded', value: 'rounded' },
    { name: 'Circle',  value: 'circle'  },
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('emote')
        .setDescription('Generate a custom emoji (128×128 PNG) — upload it to your server for free')
        .addStringOption(opt => opt.setName('text').setDescription('Emoji text (1–3 chars recommended)').setRequired(true))
        .addStringOption(opt => opt.setName('shape').setDescription('Shape').addChoices(...SHAPE_CHOICES))
        .addStringOption(opt => opt.setName('background').setDescription('Background style').addChoices(...getBackgroundChoices()))
        .addStringOption(opt => opt.setName('primary_color').setDescription('Text color').setAutocomplete(true))
        .addStringOption(opt => opt.setName('secondary_color').setDescription('Secondary color').setAutocomplete(true))
        .addStringOption(opt => opt.setName('font').setDescription('Font family').addChoices(...getAllFontFamilies().map(f => ({ name: f, value: f })))),

    async autocomplete(interaction) {
        const focused = interaction.options.getFocused();
        const results = getColorAutocomplete(focused);
        await interaction.respond(results);
    },

    async execute(interaction) {
        if (await guard(interaction, 'nitrofree')) return;
        await interaction.deferReply();

        const text       = interaction.options.getString('text');
        const shape      = interaction.options.getString('shape')           ?? 'square';
        const background = interaction.options.getString('background')      ?? 'gradient-purple';
        const primary    = interaction.options.getString('primary_color')   ?? '#ffffff';
        const secondary  = interaction.options.getString('secondary_color') ?? '#aaaaaa';
        const font       = interaction.options.getString('font')            ?? getAllFontFamilies()[0];

        const buf = await renderIcon({ text, shape, background, border: 'none', primary, secondary, font, glow: 0, width: 128, height: 128 });
        const attachment = new AttachmentBuilder(buf, { name: 'emote.png' });

        const embed = new EmbedBuilder()
            .setTitle('😄 Custom Emote Ready')
            .setDescription(
                `Your **:${text.toLowerCase().replace(/\s+/g, '_')}:** emote is ready!\n\n` +
                '**To use it:**\n1. Download the image below\n2. Go to **Server Settings → Emoji**\n3. Upload it — free slots available on every Discord server'
            )
            .setImage('attachment://emote.png')
            .setColor(primary)
            .addFields(
                { name: 'Size', value: '128 × 128 px', inline: true },
                { name: 'Format', value: 'PNG', inline: true },
                { name: 'Suggested name', value: `:${text.toLowerCase().replace(/\s+/g, '_')}:`, inline: true },
            )
            .setFooter({ text: 'Sigil • emote — all servers get free emoji slots, no Nitro required' });

        await interaction.editReply({ embeds: [embed], files: [attachment] });
        saveEntry(interaction.user.id, { command: 'emote', text, shape, background, primary_color: primary, secondary_color: secondary, font });
    },
};
