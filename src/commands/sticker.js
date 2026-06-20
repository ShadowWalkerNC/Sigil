const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { registerAllFonts, getAllFontFamilies } = require('../utils/canvas.js');
const { getBackgroundChoices } = require('../utils/backgrounds.js');
const { saveEntry } = require('../utils/history.js');
const {
    STICKER_STYLE_CHOICES,
    dispatchAutocomplete,
    autocompleteColor,
    autocompleteBackground,
    autocompleteStickerStyle,
} = require('../utils/autocomplete.js');
const { createCanvas } = require('canvas');
const guard = require('../utils/packageGuard');

registerAllFonts();

async function renderSticker({ text, primary, secondary, background, font, style }) {
    const SIZE = 320;
    const canvas = createCanvas(SIZE, SIZE);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = background || primary || '#5865F2';
    if (style === 'bubble') {
        ctx.beginPath();
        ctx.roundRect(10, 10, SIZE - 20, SIZE - 20, 60);
        ctx.fillStyle = primary || '#5865F2';
        ctx.fill();
    } else {
        ctx.fillRect(0, 0, SIZE, SIZE);
    }

    const fontSize = Math.min(80, Math.floor(SIZE * 0.28));
    ctx.font = `bold ${fontSize}px "${font}"`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (style === 'outlined') {
        ctx.strokeStyle = secondary || '#ffffff';
        ctx.lineWidth = 6;
        ctx.strokeText(text, SIZE / 2, SIZE / 2);
    }

    ctx.fillStyle = secondary || '#ffffff';
    ctx.fillText(text, SIZE / 2, SIZE / 2);

    return canvas.toBuffer('image/png');
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sticker')
        .setDescription('Generate a Discord sticker (320×320 PNG) — upload free, no Nitro needed')
        .addStringOption(opt => opt.setName('text').setDescription('Sticker text or emoji label').setRequired(true))
        .addStringOption(opt => opt.setName('primary_color').setDescription('Background color').setAutocomplete(true))
        .addStringOption(opt => opt.setName('secondary_color').setDescription('Text color').setAutocomplete(true))
        .addStringOption(opt => opt.setName('background').setDescription('Background style').addChoices(...getBackgroundChoices()))
        .addStringOption(opt => opt.setName('font').setDescription('Font family').addChoices(...getAllFontFamilies().map(f => ({ name: f, value: f }))))
        .addStringOption(opt => opt.setName('style').setDescription('Sticker style').setAutocomplete(true)),

    async autocomplete(interaction) {
        await dispatchAutocomplete(interaction, {
            primary_color:   autocompleteColor,
            secondary_color: autocompleteColor,
            background:      autocompleteBackground,
            style:           autocompleteStickerStyle,
        });
    },

    async execute(interaction) {
        if (await guard(interaction, 'nitrofree')) return;
        await interaction.deferReply();

        const text       = interaction.options.getString('text');
        const primary    = interaction.options.getString('primary_color')   ?? '#5865F2';
        const secondary  = interaction.options.getString('secondary_color') ?? '#ffffff';
        const background = interaction.options.getString('background')      ?? null;
        const font       = interaction.options.getString('font')            ?? getAllFontFamilies()[0];
        const style      = interaction.options.getString('style')           ?? 'standard';

        const styleLabel = STICKER_STYLE_CHOICES.find(s => s.value === style)?.name ?? style;

        const buf = await renderSticker({ text, primary, secondary, background, font, style });
        const attachment = new AttachmentBuilder(buf, { name: 'sticker.png' });

        const embed = new EmbedBuilder()
            .setTitle('🎨 Sticker Ready')
            .setDescription('Download and upload in **Server Settings → Emoji → Stickers**.')
            .setImage('attachment://sticker.png')
            .setColor(primary)
            .addFields(
                { name: 'Style', value: styleLabel, inline: true },
                { name: 'Font',  value: font,       inline: true },
            )
            .setFooter({ text: 'Sigil • sticker — 320×320px, free upload, no Nitro required' });

        await interaction.editReply({ embeds: [embed], files: [attachment] });
        saveEntry(interaction.user.id, { command: 'sticker', text, primary_color: primary, secondary_color: secondary, background, font, style });
    },
};
