const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const { registerAllFonts, getAllFontFamilies } = require('../utils/canvas.js');
const { getBackgroundById } = require('../utils/backgrounds.js');
const { getBackgroundChoices } = require('../utils/backgrounds.js');
const { saveEntry } = require('../utils/history.js');
const { getColorAutocomplete } = require('../utils/colors.js');

registerAllFonts();

const W = 900, H = 320;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('servercard')
        .setDescription('Generate a shareable server preview card with name, description, and member count')
        .addStringOption(opt => opt.setName('name').setDescription('Server name').setRequired(true))
        .addStringOption(opt => opt.setName('description').setDescription('Short server description').setRequired(true))
        .addStringOption(opt => opt.setName('member_count').setDescription('Member count (e.g. 1,204 members)'))
        .addStringOption(opt => opt.setName('category').setDescription('Server category (e.g. Gaming, Art, Music)'))
        .addStringOption(opt => opt.setName('background').setDescription('Background style').addChoices(...getBackgroundChoices()))
        .addStringOption(opt => opt.setName('primary_color').setDescription('Accent color (hex)').setAutocomplete(true))
        .addStringOption(opt => opt.setName('font').setDescription('Font').addChoices(...getAllFontFamilies().map(f => ({ name: f, value: f }))))
        .addStringOption(opt => opt.setName('icon_url').setDescription('Server icon URL (optional)')),

    async autocomplete(interaction) {
        const focused = interaction.options.getFocused();
        const results = getColorAutocomplete(focused);
        await interaction.respond(results);
    },

    async execute(interaction) {
        await interaction.deferReply();

        const name        = interaction.options.getString('name');
        const description = interaction.options.getString('description');
        const memberCount = interaction.options.getString('member_count') ?? '';
        const category    = interaction.options.getString('category')    ?? '';
        const background  = interaction.options.getString('background')  ?? 'solid-dark';
        const primary     = interaction.options.getString('primary_color') ?? '#5865F2';
        const font        = interaction.options.getString('font')         ?? getAllFontFamilies()[0] ?? 'Arial';
        const iconURL     = interaction.options.getString('icon_url')    ?? null;

        const canvas = createCanvas(W, H);
        const ctx    = canvas.getContext('2d');

        try { getBackgroundById(background).draw(ctx, W, H); } catch { ctx.fillStyle = '#1a1a2e'; ctx.fillRect(0, 0, W, H); }

        ctx.fillStyle = '#00000055';
        ctx.fillRect(0, 0, W, H);

        ctx.fillStyle = primary;
        ctx.fillRect(0, 0, W, 5);

        const ICON_X = 48, ICON_Y = H / 2, ICON_R = 64;
        ctx.save();
        ctx.beginPath();
        ctx.arc(ICON_X + ICON_R, ICON_Y, ICON_R, 0, Math.PI * 2);
        ctx.clip();
        if (iconURL) {
            try {
                const img = await loadImage(iconURL);
                ctx.drawImage(img, ICON_X, ICON_Y - ICON_R, ICON_R * 2, ICON_R * 2);
            } catch {
                ctx.fillStyle = primary + '55'; ctx.fill();
            }
        } else {
            ctx.fillStyle = primary + '55'; ctx.fill();
            ctx.restore(); ctx.save();
            ctx.font = `bold 44px "${font}"`;
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(name.slice(0, 2).toUpperCase(), ICON_X + ICON_R, ICON_Y);
        }
        ctx.restore();

        ctx.beginPath();
        ctx.arc(ICON_X + ICON_R, ICON_Y, ICON_R + 3, 0, Math.PI * 2);
        ctx.strokeStyle = primary;
        ctx.lineWidth = 3;
        ctx.stroke();

        const textX = ICON_X + ICON_R * 2 + 36;

        ctx.font = `bold 36px "${font}"`;
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(name, textX, H * 0.33);

        ctx.font = `18px "${font}"`;
        ctx.fillStyle = '#cccccc';
        const words = description.split(' ');
        let line = '', lines = [];
        for (const word of words) {
            const test = line ? line + ' ' + word : word;
            if (ctx.measureText(test).width > W - textX - 40) { lines.push(line); line = word; }
            else line = test;
        }
        if (line) lines.push(line);
        lines.slice(0, 3).forEach((l, i) => ctx.fillText(l, textX, H * 0.33 + 34 + i * 26));

        const meta = [memberCount, category].filter(Boolean).join('  •  ');
        if (meta) {
            ctx.font = `bold 15px "${font}"`;
            ctx.fillStyle = primary;
            ctx.fillText(meta, textX, H * 0.82);
        }

        const btnW = 120, btnH = 34, btnX = W - btnW - 32, btnY = H - btnH - 24;
        ctx.fillStyle = primary;
        ctx.beginPath();
        ctx.roundRect(btnX, btnY, btnW, btnH, 6);
        ctx.fill();
        ctx.font = `bold 15px Arial`;
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Join Server', btnX + btnW / 2, btnY + btnH / 2);

        ctx.font = '13px Arial';
        ctx.fillStyle = '#ffffff22';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        ctx.fillText('made with Sigil', W - 16, H - 12);

        const buf = canvas.toBuffer('image/png');
        const attachment = new AttachmentBuilder(buf, { name: 'servercard.png' });

        const embed = new EmbedBuilder()
            .setTitle(`🗂️ ${name} — Server Card`)
            .setDescription('Share this to recruit members anywhere outside Discord.')
            .setImage('attachment://servercard.png')
            .setColor(primary)
            .setFooter({ text: 'Sigil • servercard — 900×320 px PNG' });

        await interaction.editReply({ embeds: [embed], files: [attachment] });

        saveEntry(interaction.user.id, { command: 'servercard', name, description, background, primary_color: primary, font });
    },
};
