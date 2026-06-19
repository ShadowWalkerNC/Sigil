const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { registerAllFonts, getAllFontFamilies } = require('../utils/canvas.js');
const { saveEntry } = require('../utils/history.js');
const {
    ROLE_BADGE_STYLE_CHOICES,
    dispatchAutocomplete,
    autocompleteColor,
    autocompleteRoleBadgeStyle,
} = require('../utils/autocomplete.js');
const { createCanvas } = require('canvas');

registerAllFonts();

async function renderRoleBadge({ text, style, primary, secondary, font }) {
    const H = 60, PAD = 28;
    const tmp = createCanvas(1, 1);
    const tctx = tmp.getContext('2d');
    tctx.font = `bold 24px "${font}"`;
    const tw = tctx.measureText(text).width;
    const W = Math.ceil(tw + PAD * 2);

    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = primary;

    if (style === 'pill') {
        ctx.beginPath();
        ctx.roundRect(0, 0, W, H, H / 2);
        ctx.fill();
    } else if (style === 'rounded') {
        ctx.beginPath();
        ctx.roundRect(0, 0, W, H, 12);
        ctx.fill();
    } else if (style === 'hex') {
        const cx = W / 2, cy = H / 2, r = H / 2 - 2;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const angle = (Math.PI / 3) * i - Math.PI / 6;
            const x = cx + r * Math.cos(angle);
            const y = cy + r * Math.sin(angle);
            i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
    } else {
        ctx.beginPath();
        ctx.moveTo(W / 2, 2);
        ctx.lineTo(W - 2, H / 2);
        ctx.lineTo(W / 2, H - 2);
        ctx.lineTo(2, H / 2);
        ctx.closePath();
        ctx.fill();
    }

    ctx.font = `bold 24px "${font}"`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = secondary || '#ffffff';
    ctx.fillText(text, W / 2, H / 2);

    return canvas.toBuffer('image/png');
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rolebadge')
        .setDescription('Generate a styled role badge graphic')
        .addStringOption(opt => opt.setName('text').setDescription('Role name').setRequired(true))
        .addStringOption(opt => opt.setName('style').setDescription('Badge shape style').setAutocomplete(true))
        .addStringOption(opt => opt.setName('primary_color').setDescription('Badge fill color').setAutocomplete(true))
        .addStringOption(opt => opt.setName('secondary_color').setDescription('Text color').setAutocomplete(true))
        .addStringOption(opt => opt.setName('font').setDescription('Font family').addChoices(...getAllFontFamilies().map(f => ({ name: f, value: f })))),

    async autocomplete(interaction) {
        await dispatchAutocomplete(interaction, {
            style:           autocompleteRoleBadgeStyle,
            primary_color:   autocompleteColor,
            secondary_color: autocompleteColor,
        });
    },

    async execute(interaction) {
        await interaction.deferReply();

        const text      = interaction.options.getString('text');
        const style     = interaction.options.getString('style')           ?? 'pill';
        const primary   = interaction.options.getString('primary_color')   ?? '#5865F2';
        const secondary = interaction.options.getString('secondary_color') ?? '#ffffff';
        const font      = interaction.options.getString('font')            ?? getAllFontFamilies()[0];

        const styleLabel = ROLE_BADGE_STYLE_CHOICES.find(s => s.value === style)?.name ?? style;

        const buf = await renderRoleBadge({ text, style, primary, secondary, font });
        const attachment = new AttachmentBuilder(buf, { name: 'rolebadge.png' });

        const embed = new EmbedBuilder()
            .setTitle(`🏷️ Role Badge — ${text}`)
            .setDescription('Use this badge graphic in role-selection channels or announcements.')
            .setImage('attachment://rolebadge.png')
            .setColor(primary)
            .addFields(
                { name: 'Style', value: styleLabel, inline: true },
                { name: 'Font',  value: font,       inline: true },
            )
            .setFooter({ text: 'Sigil • rolebadge' });

        await interaction.editReply({ embeds: [embed], files: [attachment] });
        saveEntry(interaction.user.id, { command: 'rolebadge', text, style, primary_color: primary, secondary_color: secondary, font });
    },
};
