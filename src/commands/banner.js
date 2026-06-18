const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const path = require('path');
const { registerAllFonts, getAllFontFamilies, renderBanner } = require('../utils/canvas.js');
const { getBackgroundChoices } = require('../utils/backgrounds.js');
const { getBorderChoices } = require('../utils/borders.js');
const { saveEntry } = require('../utils/history.js');

registerAllFonts();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('banner')
        .setDescription('Generate a wide server banner')
        .addStringOption(opt => opt.setName('text').setDescription('Main text').setRequired(true))
        .addStringOption(opt => opt.setName('subtitle').setDescription('Subtitle / tagline'))
        .addStringOption(opt => opt
            .setName('background')
            .setDescription('Background style')
            .addChoices(...getBackgroundChoices())
        )
        .addStringOption(opt => opt
            .setName('border')
            .setDescription('Border style')
            .addChoices(...getBorderChoices())
        )
        .addStringOption(opt => opt
            .setName('primary_color')
            .setDescription('Primary hex color')
            .setAutocomplete(true)
        )
        .addStringOption(opt => opt
            .setName('secondary_color')
            .setDescription('Secondary hex color')
            .setAutocomplete(true)
        )
        .addStringOption(opt => opt
            .setName('font')
            .setDescription('Font family')
            .addChoices(...getAllFontFamilies().map(f => ({ name: f, value: f })))
        )
        .addStringOption(opt =>
            opt.setName('align')
                .setDescription('Text alignment')
                .addChoices(
                    { name: 'Center', value: 'center' },
                    { name: 'Left',   value: 'left'   },
                    { name: 'Right',  value: 'right'  },
                )
        )
        .addNumberOption(opt => opt.setName('glow').setDescription('Glow intensity (0–25)').setMinValue(0).setMaxValue(25))
        .addNumberOption(opt => opt.setName('opacity').setDescription('Background opacity (0.0–1.0)').setMinValue(0).setMaxValue(1)),

    async autocomplete(interaction) {
        const { colorAutocomplete } = require('../utils/colors.js');
        await colorAutocomplete(interaction);
    },

    async execute(interaction) {
        await interaction.deferReply();

        const text      = interaction.options.getString('text');
        const subtitle  = interaction.options.getString('subtitle')  ?? '';
        const background = interaction.options.getString('background') ?? 'gradient-purple';
        const border    = interaction.options.getString('border')     ?? 'none';
        const primary   = interaction.options.getString('primary_color') ?? '#ffffff';
        const secondary = interaction.options.getString('secondary_color') ?? '#aaaaaa';
        const font      = interaction.options.getString('font')      ?? getAllFontFamilies()[0];
        const align     = interaction.options.getString('align')     ?? 'center';
        const glow      = interaction.options.getNumber('glow')      ?? 0;
        const opacity   = interaction.options.getNumber('opacity')   ?? 1.0;

        const buf = await renderBanner({ text, subtitle, background, border, primary, secondary, font, align, glow, opacity });
        const attachment = new AttachmentBuilder(buf, { name: 'banner.png' });

        const embed = new EmbedBuilder()
            .setTitle(`🏳️ ${text}`)
            .setDescription(subtitle || 'Your custom server banner is ready!')
            .setImage('attachment://banner.png')
            .setColor(primary)
            .setFooter({ text: 'Sigil • banner' });

        await interaction.editReply({ embeds: [embed], files: [attachment] });

        saveEntry(interaction.user.id, {
            command: 'banner', text, subtitle, background, border,
            primary_color: primary, secondary_color: secondary,
            font, align, glow, opacity,
        });
    },
};
