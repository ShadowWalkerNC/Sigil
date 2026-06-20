const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { renderKit, registerAllFonts, getAllFontFamilies } = require('../utils/canvas.js');
const { getBackgroundChoices } = require('../utils/backgrounds.js');
const { getColorAutocomplete } = require('../utils/colors.js');
const guard = require('../utils/packageGuard');

registerAllFonts();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('themepreview')
        .setDescription('Preview a color theme across icon, banner, and palette')
        .addStringOption(opt => opt.setName('primary').setDescription('Primary color').setAutocomplete(true))
        .addStringOption(opt => opt.setName('secondary').setDescription('Secondary color').setAutocomplete(true))
        .addStringOption(opt => opt.setName('background').setDescription('Background style').addChoices(...getBackgroundChoices()))
        .addStringOption(opt => opt.setName('font').setDescription('Font family').addChoices(...getAllFontFamilies().map(f => ({ name: f, value: f })))),

    async autocomplete(interaction) {
        await interaction.respond(getColorAutocomplete(interaction.options.getFocused()));
    },

    async execute(interaction) {
        if (await guard(interaction, 'nitrofree')) return;
        await interaction.deferReply();
        const primary    = interaction.options.getString('primary')    ?? '#8B0000';
        const secondary  = interaction.options.getString('secondary')  ?? '#4B0082';
        const background = interaction.options.getString('background') ?? 'midnight-gradient';
        const font       = interaction.options.getString('font')       ?? 'Arial Black';
        const { iconBuf, bannerBuf, paletteBuf } = await renderKit({ text: 'THM', bannerText: 'Theme Preview', background, primary, secondary, font, glow: 10, opacity: 0.85, shape: 'circle' });
        const files = [
            new AttachmentBuilder(iconBuf,    { name: 'theme-icon.png'    }),
            new AttachmentBuilder(bannerBuf,  { name: 'theme-banner.png'  }),
            new AttachmentBuilder(paletteBuf, { name: 'theme-palette.png' }),
        ];
        const embed = new EmbedBuilder()
            .setTitle('🎨 Theme Preview')
            .setColor(primary)
            .addFields({ name: 'Primary', value: primary, inline: true }, { name: 'Secondary', value: secondary, inline: true }, { name: 'Background', value: background, inline: true })
            .setFooter({ text: 'Sigil • /themepreview' });
        await interaction.editReply({ embeds: [embed], files });
    },
};
