const { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } = require('discord.js');
const { createCanvas } = require('canvas');
const { getLeaderboard } = require('../utils/db.js');
const { calculateLevel } = require('../utils/xp.js');
const { registerAllFonts } = require('../utils/canvas.js');

registerAllFonts();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('xpleaderboard')
        .setDescription('View the top 10 XP leaderboard for this server'),

    async execute(interaction) {
        await interaction.deferReply();

        const guildId = interaction.guild.id;
        const rows    = getLeaderboard(guildId, 10);

        if (rows.length === 0) {
            return interaction.editReply({ content: 'No XP data yet. Members earn XP by chatting.' });
        }

        // Resolve display names
        const members = await Promise.all(
            rows.map(r => interaction.guild.members.fetch(r.user_id).catch(() => null))
        );

        const W = 600, ROW_H = 54, PAD = 20;
        const H  = PAD * 2 + rows.length * ROW_H + 60;
        const canvas = createCanvas(W, H);
        const ctx    = canvas.getContext('2d');

        // Background
        ctx.fillStyle = '#0f0f1a';
        ctx.fillRect(0, 0, W, H);

        // Title
        ctx.font = 'bold 22px Arial';
        ctx.fillStyle = '#39FF14';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.shadowColor = '#39FF14'; ctx.shadowBlur = 8;
        ctx.fillText('🏆  XP LEADERBOARD', W / 2, PAD);
        ctx.shadowBlur = 0;

        const startY = PAD + 50;

        for (let i = 0; i < rows.length; i++) {
            const r      = rows[i];
            const member = members[i];
            const name   = member?.displayName ?? `User ${r.user_id.slice(-4)}`;
            const { level, currentXp, requiredXp } = calculateLevel(r.xp);
            const y      = startY + i * ROW_H;

            // Row background
            ctx.fillStyle = i % 2 === 0 ? '#ffffff08' : '#ffffff04';
            ctx.beginPath();
            ctx.roundRect(PAD, y, W - PAD * 2, ROW_H - 6, 8);
            ctx.fill();

            // Rank number
            const rankColors = ['#FFD700', '#C0C0C0', '#CD7F32'];
            ctx.font = `bold 16px Arial`;
            ctx.fillStyle = rankColors[i] ?? '#aaaaaa';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(`#${i + 1}`, PAD + 10, y + (ROW_H - 6) / 2);

            // Name
            ctx.font = '15px Arial';
            ctx.fillStyle = '#ffffff';
            ctx.fillText(name.length > 18 ? name.slice(0, 16) + '…' : name, PAD + 42, y + (ROW_H - 6) / 2);

            // Level badge
            ctx.font = 'bold 13px Arial';
            ctx.fillStyle = '#39FF14';
            ctx.textAlign = 'right';
            ctx.fillText(`LVL ${level}`, W - PAD - 10, y + (ROW_H - 6) / 2 - 8);

            // XP
            ctx.font = '12px Arial';
            ctx.fillStyle = '#888888';
            ctx.fillText(`${r.xp.toLocaleString()} XP`, W - PAD - 10, y + (ROW_H - 6) / 2 + 8);
        }

        // Watermark
        ctx.font = '11px Arial'; ctx.fillStyle = '#ffffff15';
        ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
        ctx.fillText('made with Sigil', W - PAD, H - 8);

        const buf        = canvas.toBuffer('image/png');
        const attachment = new AttachmentBuilder(buf, { name: 'xpleaderboard.png' });

        const embed = new EmbedBuilder()
            .setTitle(`🏆 XP Leaderboard — ${interaction.guild.name}`)
            .setImage('attachment://xpleaderboard.png')
            .setColor('#39FF14')
            .setFooter({ text: `Sigil • xpleaderboard • Top ${rows.length} members` });

        await interaction.editReply({ embeds: [embed], files: [attachment] });
    },
};
