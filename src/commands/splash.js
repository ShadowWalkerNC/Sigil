const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { registerAllFonts, getAllFontFamilies, renderBanner } = require('../utils/canvas.js');
const { getBackgroundChoices } = require('../utils/backgrounds.js');
const { getBorderChoices } = require('../utils/borders.js');
const { saveEntry } = require('../utils/history.js');
const { getColorAutocomplete } = require('../utils/colors.js');

registerAllFonts();

const SIZE_CHOICES = [
    { name: 'Invite Splash (1920×1080)', value: '1920x1080' },
    { name: 'Discovery Splash (1920×480)', value: '1920x480' },
    { name: 'Wide Banner (1500×500)', value: '1500x500' },
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('splash')
        .setDescription('Generate a full-size server invite splash or discovery banner')
        .addStringOption(opt => opt.setName('text').setDescription('Main text').setRequired(true))
        .addStringOption(opt => opt.setName('size').setDescription('Canvas size').addChoices(...SIZE_CHOICES))
        .addStringOption(opt => opt.setName('subtitle').setDescription('Subtitle / tagline'))
        .addStringOption(opt => opt.setName('background').setDescription('Background style').addChoices(...getBackgroundChoices()))
        .addStringOption(opt => opt.setName('border').setDescription('Border style').addChoices(...getBorderChoices()))
        .addStringOption(opt => opt.setName('primary_color').setDescription('Primary color (hex)').setAutocomplete(true))
        .addStringOption(opt => opt.setName('secondary_color').setDescription('Secondary color (hex)').setAutocomplete(true))
        .addStringOption(opt => opt.setName('font').setDescription('Font').addChoices(...getAllFontFamilies().map(f => ({ name: f, value: f }))))
        .addNumberOption(opt => opt.setName('glow').setDescription('Glow (0–25)').setMinValue(0).setMaxValue(25)),

    async autocomplete(interaction) {
        const focused = interaction.options.getFocused();
        const results = getColorAutocomplete(focused);
        await interaction.respond(results);
    },

    async execute(interaction) {
        await interaction.deferReply();

        const text       = interaction.options.getString('text');
        const sizeVal    = interaction.options.getString('size')           ?? '1920x1080';
        const subtitle   = interaction.options.getString('subtitle')       ?? '';
        const background = interaction.options.getString('background')     ?? 'gradient-purple';
        const border     = interaction.options.getString('border')         ?? 'none';
        const primary    = interaction.options.getString('primary_color')  ?? '#ffffff';
        const secondary  = interaction.options.getString('secondary_color') ?? '#aaaaaa';
        const font       = interaction.options.getString('font')           ?? getAllFontFamilies()[0];
        const glow       = interaction.options.getNumber('glow')           ?? 0;

        const [W, H] = sizeVal.split('x').map(Number);

        const buf = await renderBanner({ text, subtitle, background, border, primary, secondary, font, glow, width: W, height: H });
        const attachment = new AttachmentBuilder(buf, { name: 'splash.png' });

        const sizeLabel = SIZE_CHOICES.find(s => s.value === sizeVal)?.name ?? sizeVal;

        const embed = new EmbedBuilder()
            .setTitle('🌅 Splash Screen Ready')
            .setDescription(
                `**${sizeLabel}** splash generated!\n\n` +
                '**To use it:**\n' +
                '\u2022 **Invite Splash**: Server Settings \u2192 Overview \u2192 Invite Background\n' +
                '\u2022 **Discovery Splash**: Server Settings \u2192 Discovery\n' +
                '\u2022 Both require the server to have that setting unlocked (Level 1 boost for invite splash)'
            )
            .setImage('attachment://splash.png')
            .setColor(primary)
            .addFields(
                { name: 'Size', value: `${W} \u00d7 ${H} px`, inline: true },
                { name: 'Format', value: 'PNG', inline: true },
            )
            .setFooter({ text: 'Sigil \u2022 splash' });

        await interaction.editReply({ embeds: [embed], files: [attachment] });

        saveEntry(interaction.user.id, {
            command: 'splash', text, subtitle, background, border,
            primary_color: primary, secondary_color: secondary, font, glow,
        });
    },
};
