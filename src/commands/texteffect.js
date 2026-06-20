const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas, registerAllFonts: _r } = require('canvas');
const { registerAllFonts, getAllFontFamilies } = require('../utils/canvas.js');
const { getColorAutocomplete } = require('../utils/colors.js');
const { saveEntry } = require('../utils/history.js');
const guard = require('../utils/packageGuard');

registerAllFonts();

const EFFECT_CHOICES = [
    { name: 'Neon Glow',    value: 'neon'    },
    { name: 'Chrome',       value: 'chrome'  },
    { name: 'Fire',         value: 'fire'    },
    { name: 'Ice',          value: 'ice'     },
    { name: 'Shadow',       value: 'shadow'  },
    { name: 'Outline',      value: 'outline' },
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('texteffect')
        .setDescription('Apply a visual effect to text and export as PNG')
        .addStringOption(opt => opt.setName('text').setDescription('Text to render').setRequired(true))
        .addStringOption(opt => opt.setName('effect').setDescription('Visual effect').addChoices(...EFFECT_CHOICES))
        .addStringOption(opt => opt.setName('color').setDescription('Base color').setAutocomplete(true))
        .addStringOption(opt => opt.setName('font').setDescription('Font family').addChoices(...getAllFontFamilies().map(f => ({ name: f, value: f }))))
        .addIntegerOption(opt => opt.setName('size').setDescription('Font size (20–200)').setMinValue(20).setMaxValue(200)),

    async autocomplete(interaction) {
        await interaction.respond(getColorAutocomplete(interaction.options.getFocused()));
    },

    async execute(interaction) {
        if (await guard(interaction, 'nitrofree')) return;
        await interaction.deferReply();
        const text   = interaction.options.getString('text');
        const effect = interaction.options.getString('effect') ?? 'neon';
        const color  = interaction.options.getString('color')  ?? '#00ffff';
        const font   = interaction.options.getString('font')   ?? getAllFontFamilies()[0];
        const size   = interaction.options.getInteger('size')  ?? 72;
        const PAD = 40;
        const tmp  = createCanvas(1, 1);
        const tctx = tmp.getContext('2d');
        tctx.font = `bold ${size}px "${font}"`;
        const tw = tctx.measureText(text).width;
        const W = Math.ceil(tw + PAD * 2), H = size + PAD * 2;
        const canvas = createCanvas(W, H);
        const ctx    = canvas.getContext('2d');
        ctx.fillStyle = '#111111'; ctx.fillRect(0, 0, W, H);
        ctx.font = `bold ${size}px "${font}"`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        if (effect === 'neon') {
            ctx.shadowColor = color; ctx.shadowBlur = 24;
            ctx.fillStyle = color; ctx.fillText(text, W/2, H/2);
            ctx.shadowBlur = 0;
        } else if (effect === 'outline') {
            ctx.strokeStyle = color; ctx.lineWidth = 4; ctx.strokeText(text, W/2, H/2);
            ctx.fillStyle = '#111111'; ctx.fillText(text, W/2, H/2);
        } else if (effect === 'shadow') {
            ctx.fillStyle = '#00000088'; ctx.fillText(text, W/2 + 4, H/2 + 4);
            ctx.fillStyle = color; ctx.fillText(text, W/2, H/2);
        } else if (effect === 'chrome') {
            const grad = ctx.createLinearGradient(0, H/2 - size/2, 0, H/2 + size/2);
            grad.addColorStop(0, '#ffffff'); grad.addColorStop(0.5, color); grad.addColorStop(1, '#333333');
            ctx.fillStyle = grad; ctx.fillText(text, W/2, H/2);
        } else if (effect === 'fire') {
            const grad = ctx.createLinearGradient(0, H/2 - size/2, 0, H/2 + size/2);
            grad.addColorStop(0, '#ffff00'); grad.addColorStop(0.5, '#ff6600'); grad.addColorStop(1, '#cc0000');
            ctx.fillStyle = grad; ctx.fillText(text, W/2, H/2);
        } else if (effect === 'ice') {
            const grad = ctx.createLinearGradient(0, H/2 - size/2, 0, H/2 + size/2);
            grad.addColorStop(0, '#ffffff'); grad.addColorStop(0.5, '#aaddff'); grad.addColorStop(1, '#0077cc');
            ctx.fillStyle = grad; ctx.fillText(text, W/2, H/2);
        } else {
            ctx.fillStyle = color; ctx.fillText(text, W/2, H/2);
        }
        const buf = canvas.toBuffer('image/png');
        const attachment = new AttachmentBuilder(buf, { name: 'texteffect.png' });
        const embed = new EmbedBuilder()
            .setTitle('✨ Text Effect')
            .setImage('attachment://texteffect.png')
            .setColor(color)
            .addFields({ name: 'Effect', value: EFFECT_CHOICES.find(e => e.value === effect)?.name ?? effect, inline: true }, { name: 'Font', value: font, inline: true })
            .setFooter({ text: 'Sigil • /texteffect' });
        await interaction.editReply({ embeds: [embed], files: [attachment] });
        saveEntry(interaction.user.id, { command: 'texteffect', text, effect, color, font, size });
    },
};
