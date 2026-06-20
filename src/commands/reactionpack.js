const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const JSZip = require('jszip');
const { registerAllFonts, getAllFontFamilies } = require('../utils/canvas.js');
const { saveEntry } = require('../utils/history.js');
const { dispatchAutocomplete, autocompleteColor } = require('../utils/autocomplete.js');
const guard = require('../utils/packageGuard');

registerAllFonts();

const THEME_CHOICES = [
    { name: 'Neon Green', value: 'neon'   },
    { name: 'Fire Red',   value: 'fire'   },
    { name: 'Ocean Blue', value: 'ocean'  },
    { name: 'Gold',       value: 'gold'   },
    { name: 'Purple',     value: 'purple' },
    { name: 'Custom',     value: 'custom' },
];

const THEME_COLORS = {
    neon:   { primary: '#39FF14', secondary: '#00cc00', bg: '#0a0a0a' },
    fire:   { primary: '#ff6600', secondary: '#cc0000', bg: '#1a0000' },
    ocean:  { primary: '#00ccff', secondary: '#0057e7', bg: '#000d1a' },
    gold:   { primary: '#ffd700', secondary: '#b8860b', bg: '#1a1100' },
    purple: { primary: '#bf00ff', secondary: '#6a0dad', bg: '#0d001a' },
    custom: { primary: '#ffffff', secondary: '#aaaaaa', bg: '#111111' },
};

function renderReaction({ emoji, primary, secondary, bg, font, size = 128 }) {
    const canvas = createCanvas(size, size);
    const ctx    = canvas.getContext('2d');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, size, size);
    const grad = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
    grad.addColorStop(0, primary + '44');
    grad.addColorStop(1, secondary + '11');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(size/2, size/2, size/2 - 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = primary + '88';
    ctx.lineWidth = 2;
    ctx.stroke();
    const fontSize = Math.round(size * 0.45);
    ctx.font = `bold ${fontSize}px "${font}"`;
    ctx.fillStyle = primary;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = primary;
    ctx.shadowBlur = 8;
    ctx.fillText(emoji, size/2, size/2);
    ctx.shadowBlur = 0;
    return canvas.toBuffer('image/png');
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reactionpack')
        .setDescription('Generate a themed set of 5 custom reaction emojis as a ZIP download')
        .addStringOption(opt => opt.setName('emoji1').setDescription('First emoji or text').setRequired(true))
        .addStringOption(opt => opt.setName('emoji2').setDescription('Second emoji or text').setRequired(true))
        .addStringOption(opt => opt.setName('emoji3').setDescription('Third emoji or text').setRequired(true))
        .addStringOption(opt => opt.setName('emoji4').setDescription('Fourth emoji or text').setRequired(true))
        .addStringOption(opt => opt.setName('emoji5').setDescription('Fifth emoji or text').setRequired(true))
        .addStringOption(opt => opt.setName('theme').setDescription('Color theme').addChoices(...THEME_CHOICES))
        .addStringOption(opt => opt.setName('primary_color').setDescription('Custom primary color (hex)').setAutocomplete(true))
        .addStringOption(opt => opt.setName('font').setDescription('Font family').addChoices(...getAllFontFamilies().map(f => ({ name: f, value: f })))),

    async autocomplete(interaction) {
        await dispatchAutocomplete(interaction, { primary_color: autocompleteColor });
    },

    async execute(interaction) {
        if (await guard(interaction, 'nitrofree')) return;
        await interaction.deferReply();

        const emojis = [1,2,3,4,5].map(n => interaction.options.getString(`emoji${n}`));
        const themeKey    = interaction.options.getString('theme')         ?? 'neon';
        const customColor = interaction.options.getString('primary_color') ?? null;
        const font        = interaction.options.getString('font')          ?? getAllFontFamilies()[0] ?? 'Arial';

        const theme = { ...THEME_COLORS[themeKey] ?? THEME_COLORS.neon };
        if (themeKey === 'custom' && customColor) theme.primary = customColor;

        const buffers = emojis.map(emoji => renderReaction({ emoji, ...theme, font }));

        const PREVIEW_W = 128 * 5 + 16 * 4;
        const preview = createCanvas(PREVIEW_W, 128);
        const pctx    = preview.getContext('2d');
        pctx.fillStyle = theme.bg;
        pctx.fillRect(0, 0, PREVIEW_W, 128);
        for (let i = 0; i < buffers.length; i++) {
            const img = await loadImage(buffers[i]);
            pctx.drawImage(img, i * (128 + 16), 0, 128, 128);
        }
        const previewBuf = preview.toBuffer('image/png');

        const zip = new JSZip();
        emojis.forEach((emoji, i) => {
            const safeName = emoji.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 20) || `reaction_${i+1}`;
            zip.file(`${safeName}.png`, buffers[i]);
        });
        zip.file('preview.png', previewBuf);
        const zipBuf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });

        const previewAttachment = new AttachmentBuilder(previewBuf, { name: 'reactionpack-preview.png' });
        const zipAttachment     = new AttachmentBuilder(zipBuf,     { name: 'reactionpack.zip' });

        const embed = new EmbedBuilder()
            .setTitle('😄 Reaction Pack Ready')
            .setDescription(`**${emojis.join('  ')}** — themed pack generated!\n\n**To use:** Download the ZIP, extract PNGs, upload in **Server Settings → Emoji**. No Nitro needed.`)
            .setImage('attachment://reactionpack-preview.png')
            .setColor(theme.primary)
            .addFields(
                { name: 'Theme',  value: themeKey.charAt(0).toUpperCase() + themeKey.slice(1), inline: true },
                { name: 'Count',  value: '5 emojis + preview', inline: true },
                { name: 'Format', value: 'PNG × 5 (zipped)',   inline: true },
            )
            .setFooter({ text: 'Sigil • reactionpack' });

        await interaction.editReply({ embeds: [embed], files: [previewAttachment, zipAttachment] });
        saveEntry(interaction.user.id, { command: 'reactionpack', emojis, theme: themeKey, font });
    },
};
