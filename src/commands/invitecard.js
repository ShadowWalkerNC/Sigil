const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const { registerAllFonts, getAllFontFamilies } = require('../utils/canvas.js');
const { getBackgroundById } = require('../utils/backgrounds.js');
const { getBackgroundChoices } = require('../utils/backgrounds.js');
const { saveEntry } = require('../utils/history.js');
const { getColorAutocomplete } = require('../utils/colors.js');

registerAllFonts();

const W = 800, H = 420;

function buildQRMatrix(text) {
    const size = 21;
    const hash = [...text].reduce((a, c) => (a * 31 + c.charCodeAt(0)) & 0xFFFFFF, 0);
    const matrix = [];
    for (let r = 0; r < size; r++) {
        matrix.push([]);
        for (let c = 0; c < size; c++) {
            const inFinder =
                (r < 8 && c < 8) || (r < 8 && c >= size - 8) || (r >= size - 8 && c < 8);
            if (inFinder) {
                const fr = r % 8, fc = c % 8;
                const rr = (r >= size - 8) ? r - (size - 8) : r;
                const cc = (c >= size - 8) ? c - (size - 8) : c;
                matrix[r].push(
                    (rr === 0 || rr === 6 || fc === 0 || fc === 6) ? 1 :
                    (rr >= 2 && rr <= 4 && cc >= 2 && cc <= 4) ? 1 : 0
                );
            } else {
                matrix[r].push(((hash >> ((r * size + c) % 24)) & 1));
            }
        }
    }
    return matrix;
}

function drawQR(ctx, matrix, x, y, size, color) {
    const mod = size / matrix.length;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x - 4, y - 4, size + 8, size + 8);
    ctx.fillStyle = color;
    matrix.forEach((row, r) => {
        row.forEach((cell, c) => {
            if (cell) ctx.fillRect(x + c * mod, y + r * mod, mod, mod);
        });
    });
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('invitecard')
        .setDescription('Generate a branded server invite card with QR code — shareable on social media and IRL')
        .addStringOption(opt => opt.setName('server_name').setDescription('Server name').setRequired(true))
        .addStringOption(opt => opt.setName('invite_url').setDescription('Discord invite URL (discord.gg/...)').setRequired(true))
        .addStringOption(opt => opt.setName('description').setDescription('Short server description'))
        .addStringOption(opt => opt.setName('member_count').setDescription('Member count (e.g. 1,204 members)'))
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

        const serverName  = interaction.options.getString('server_name');
        const inviteURL   = interaction.options.getString('invite_url');
        const description = interaction.options.getString('description')  ?? 'Join our community!';
        const memberCount = interaction.options.getString('member_count') ?? '';
        const background  = interaction.options.getString('background')   ?? 'solid-dark';
        const primary     = interaction.options.getString('primary_color') ?? '#5865F2';
        const font        = interaction.options.getString('font')         ?? getAllFontFamilies()[0] ?? 'Arial';
        const iconURL     = interaction.options.getString('icon_url')    ?? null;

        const canvas = createCanvas(W, H);
        const ctx    = canvas.getContext('2d');

        try { getBackgroundById(background).draw(ctx, W, H); }
        catch { ctx.fillStyle = '#1a1a2e'; ctx.fillRect(0, 0, W, H); }
        ctx.fillStyle = '#000000aa'; ctx.fillRect(0, 0, W, H);

        ctx.fillStyle = '#00000055';
        ctx.beginPath(); ctx.roundRect(0, 0, W - 220, H, [12, 0, 0, 12]); ctx.fill();

        ctx.fillStyle = primary;
        ctx.fillRect(0, 0, 6, H);

        const IR = 52, IX = 36, IY = 90;
        ctx.save();
        ctx.beginPath(); ctx.arc(IX + IR, IY, IR, 0, Math.PI * 2); ctx.clip();
        if (iconURL) {
            try { const img = await loadImage(iconURL); ctx.drawImage(img, IX, IY - IR, IR * 2, IR * 2); }
            catch { ctx.fillStyle = primary + '55'; ctx.fill(); }
        } else {
            ctx.fillStyle = primary + '55'; ctx.fill();
            ctx.restore(); ctx.save();
            ctx.font = `bold 32px "${font}"`;
            ctx.fillStyle = '#fff';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(serverName.slice(0,2).toUpperCase(), IX + IR, IY);
        }
        ctx.restore();
        ctx.beginPath(); ctx.arc(IX + IR, IY, IR + 3, 0, Math.PI * 2);
        ctx.strokeStyle = primary; ctx.lineWidth = 2.5; ctx.stroke();

        const TX = IX + IR * 2 + 20;
        ctx.font = `bold 32px "${font}"`;
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
        ctx.fillText(serverName, TX, IY + 10);

        ctx.font = `16px "${font}"`;
        ctx.fillStyle = '#cccccc';
        const words = description.split(' ');
        let line = '', lines = [], dy = 180;
        for (const w of words) {
            const t = line ? line + ' ' + w : w;
            if (ctx.measureText(t).width > W - 260) { lines.push(line); line = w; }
            else line = t;
        }
        if (line) lines.push(line);
        lines.slice(0, 4).forEach((l, i) => ctx.fillText(l, 36, dy + i * 26));

        if (memberCount) {
            ctx.font = `bold 14px "${font}"`;
            ctx.fillStyle = primary;
            ctx.fillText('👥  ' + memberCount, 36, H - 56);
        }

        ctx.font = `bold 15px Arial`;
        ctx.fillStyle = '#ffffff88';
        ctx.fillText(inviteURL, 36, H - 32);

        const QR_X = W - 200, QR_Y = 40, QR_SIZE = 160;
        ctx.fillStyle = '#ffffff0a';
        ctx.beginPath(); ctx.roundRect(QR_X - 10, QR_Y - 10, 200, H - 60, 12); ctx.fill();

        const matrix = buildQRMatrix(inviteURL);
        drawQR(ctx, matrix, QR_X + 10, QR_Y + 20, QR_SIZE, primary);

        ctx.font = `bold 13px Arial`;
        ctx.fillStyle = primary;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText('SCAN TO JOIN', QR_X + 90, QR_Y + QR_SIZE + 44);

        ctx.font = '12px Arial'; ctx.fillStyle = '#ffffff18';
        ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
        ctx.fillText('made with Sigil', W - 12, H - 6);

        const buf = canvas.toBuffer('image/png');
        const attachment = new AttachmentBuilder(buf, { name: 'invitecard.png' });

        const embed = new EmbedBuilder()
            .setTitle(`📥 Invite Card — ${serverName}`)
            .setDescription('Share this on Reddit, Twitter, TikTok, or anywhere to recruit members.')
            .setImage('attachment://invitecard.png')
            .setColor(primary)
            .addFields(
                { name: 'Invite',  value: inviteURL,          inline: true },
                { name: 'Members', value: memberCount || 'N/A', inline: true },
            )
            .setFooter({ text: 'Sigil • invitecard — 800×420 PNG' });

        await interaction.editReply({ embeds: [embed], files: [attachment] });
        saveEntry(interaction.user.id, { command: 'invitecard', serverName, inviteURL, description, background, primary_color: primary, font });
    },
};
