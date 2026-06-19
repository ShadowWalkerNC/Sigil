const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas } = require('canvas');
const { registerAllFonts, getAllFontFamilies } = require('../utils/canvas.js');
const { saveEntry } = require('../utils/history.js');
const { getColorAutocomplete } = require('../utils/colors.js');

registerAllFonts();

const STYLE_CHOICES = [
    { name: 'Pill',      value: 'pill'      },
    { name: 'Rounded',   value: 'rounded'   },
    { name: 'Sharp',     value: 'sharp'     },
    { name: 'Diamond',   value: 'diamond'   },
    { name: 'Hexagon',   value: 'hexagon'   },
];

function drawBadge({ text, style, primary, secondary, font, glow }) {
    const H  = 64;
    const PAD = 28;
    const tmp = createCanvas(1, 1);
    const tctx = tmp.getContext('2d');
    tctx.font = `bold 28px "${font}"`;
    const tw = tctx.measureText(text).width;
    const W  = Math.max(160, Math.ceil(tw + PAD * 2));

    const canvas = createCanvas(W, H);
    const ctx    = canvas.getContext('2d');

    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, primary);
    bg.addColorStop(1, secondary);
    ctx.fillStyle = bg;

    ctx.beginPath();
    switch (style) {
        case 'pill':    ctx.roundRect(0, 0, W, H, H / 2); break;
        case 'rounded': ctx.roundRect(0, 0, W, H, 10);    break;
        case 'diamond':
            ctx.moveTo(W / 2, 0); ctx.lineTo(W, H / 2);
            ctx.lineTo(W / 2, H); ctx.lineTo(0, H / 2);
            ctx.closePath(); break;
        case 'hexagon': {
            const pts = [[0.50,0],[0.93,0.25],[0.93,0.75],[0.50,1],[0.07,0.75],[0.07,0.25]];
            ctx.moveTo(pts[0][0]*W, pts[0][1]*H);
            for (let i=1;i<pts.length;i++) ctx.lineTo(pts[i][0]*W, pts[i][1]*H);
            ctx.closePath(); break;
        }
        default: ctx.rect(0, 0, W, H);
    }
    ctx.fill();

    if (glow > 0) { ctx.shadowColor = primary; ctx.shadowBlur = glow * 2; }

    ctx.font = `bold 28px "${font}"`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, W / 2, H / 2);

    return canvas.toBuffer('image/png');
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rolebadge')
        .setDescription('Generate a custom role badge graphic — download and use as a channel icon or role image')
        .addStringOption(opt => opt.setName('text').setDescription('Role name or label').setRequired(true))
        .addStringOption(opt => opt.setName('style').setDescription('Badge shape style').addChoices(...STYLE_CHOICES))
        .addStringOption(opt => opt.setName('primary_color').setDescription('Badge color (hex)').setAutocomplete(true))
        .addStringOption(opt => opt.setName('secondary_color').setDescription('Gradient end color (hex)').setAutocomplete(true))
        .addStringOption(opt => opt.setName('font').setDescription('Font family').addChoices(...getAllFontFamilies().map(f => ({ name: f, value: f }))))
        .addNumberOption(opt => opt.setName('glow').setDescription('Glow intensity (0–25)').setMinValue(0).setMaxValue(25)),

    async autocomplete(interaction) {
        const focused = interaction.options.getFocused();
        const results = getColorAutocomplete(focused);
        await interaction.respond(results);
    },

    async execute(interaction) {
        await interaction.deferReply();

        const text      = interaction.options.getString('text');
        const style     = interaction.options.getString('style')           ?? 'pill';
        const primary   = interaction.options.getString('primary_color')   ?? '#6a0dad';
        const secondary = interaction.options.getString('secondary_color') ?? '#0057e7';
        const font      = interaction.options.getString('font')            ?? getAllFontFamilies()[0];
        const glow      = interaction.options.getNumber('glow')            ?? 0;

        const buf = drawBadge({ text, style, primary, secondary, font, glow });
        const attachment = new AttachmentBuilder(buf, { name: 'rolebadge.png' });

        const embed = new EmbedBuilder()
            .setTitle('🏷️ Role Badge Ready')
            .setDescription(
                `**${text}** badge generated!\n\n` +
                '**How to use:**\n' +
                '\u2022 Use as a **channel icon** in your server sidebar\n' +
                '\u2022 Pin it in a **roles channel** as a visual role menu\n' +
                '\u2022 Use it in **server guide** or welcome embeds'
            )
            .setImage('attachment://rolebadge.png')
            .setColor(primary)
            .addFields(
                { name: 'Style', value: style.charAt(0).toUpperCase() + style.slice(1), inline: true },
                { name: 'Format', value: 'PNG', inline: true },
            )
            .setFooter({ text: 'Sigil • rolebadge' });

        await interaction.editReply({ embeds: [embed], files: [attachment] });

        saveEntry(interaction.user.id, {
            command: 'rolebadge', text, style,
            primary_color: primary, secondary_color: secondary, font, glow,
        });
    },
};
