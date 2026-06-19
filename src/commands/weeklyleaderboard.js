const { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } = require('discord.js');
const { createCanvas } = require('canvas');
const { getWeeklyTopXP } = require('../utils/db.js');
const { registerAllFonts } = require('../utils/canvas.js');
const { DEFAULT_FONT } = require('../utils/fonts.js');

registerAllFonts();

const F = DEFAULT_FONT;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('weeklyleaderboard')
        .setDescription('View the top XP earners this week for this server'),

    async execute(interaction) {
        await interaction.deferReply();

        const guildId = interaction.guild.id;
        const rows    = getWeeklyTopXP(guildId, 10);

        if (!rows || rows.length === 0) {
            return interaction.editReply({ content: 'No weekly XP data yet. Members earn weekly XP by chatting. Resets every Sunday at midnight UTC.' });
        }

        const members = await Promise.all(
            rows.map(r => interaction.guild.members.fetch(r.user_id).catch(() => null))
        );

        const W = 600, ROW_H = 54, PAD = 20;
        const H = PAD * 2 + rows.length * ROW_H + 60;
        const canvas = createCanvas(W, H);
        const ctx    = canvas.getContext('2d');

        // Background
        ctx.fillStyle = '#0f0f1a';
        ctx.fillRect(0, 0, W, H);

        // Header
        ctx.font = `bold 22px "${F}"`;
        ctx.fillStyle = '#39FF14';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.shadowColor = '#39FF14'; ctx.shadowBlur = 8;
        ctx.fillText('WEEKLY XP LEADERBOARD', W / 2, PAD);
        ctx.shadowBlur = 0;

        // Reset label
        ctx.font = `11px "${F}"`;
        ctx.fillStyle = '#555555';
        ctx.fillText('resets every Sunday at 00:00 UTC', W / 2, PAD + 28);

        const startY = PAD + 54;
        const rankColors = ['#FFD700', '#C0C0C0', '#CD7F32'];

        for (let i = 0; i < rows.length; i++) {
            const r      = rows[i];
            const member = members[i];
            const name   = member?.displayName ?? `User ${r.user_id.slice(-4)}`;
            const y      = startY + i * ROW_H;

            // Row background
            ctx.fillStyle = i % 2 === 0 ? '#ffffff08' : '#ffffff04';
            ctx.beginPath();
            ctx.roundRect(PAD, y, W - PAD * 2, ROW_H - 6, 8);
            ctx.fill();

            // Rank
            ctx.font = `bold 16px "${F}"`;
            ctx.fillStyle = rankColors[i] ?? '#aaaaaa';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(`#${i + 1}`, PAD + 10, y + (ROW_H - 6) / 2);

            // Name
            ctx.font = `15px "${F}"`;
            ctx.fillStyle = '#ffffff';
            ctx.fillText(name.length > 18 ? name.slice(0, 16) + '\u2026' : name, PAD + 42, y + (ROW_H - 6) / 2);

            // Weekly XP (top-right)
            ctx.font = `bold 13px "${F}"`;
            ctx.fillStyle = '#39FF14';
            ctx.textAlign = 'right';
            ctx.fillText(`${r.weekly_xp.toLocaleString()} XP`, W - PAD - 10, y + (ROW_H - 6) / 2 - 8);

            // Label (bottom-right)
            ctx.font = `11px "${F}"`;
            ctx.fillStyle = '#555555';
            ctx.fillText('this week', W - PAD - 10, y + (ROW_H - 6) / 2 + 8);
        }

        // Watermark
        ctx.font = `11px "${F}"`; ctx.fillStyle = '#ffffff15';
        ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
        ctx.fillText('made with Sigil', W - PAD, H - 8);

        const buf        = canvas.toBuffer('image/png');
        const attachment = new AttachmentBuilder(buf, { name: 'weeklyleaderboard.png' });

        const embed = new EmbedBuilder()
            .setTitle(`\uD83D\uDCC5 Weekly XP Leaderboard \u2014 ${interaction.guild.name}`)
            .setImage('attachment://weeklyleaderboard.png')
            .setColor('#39FF14')
            .setFooter({ text: `Sigil \u2022 Weekly XP \u2022 Top ${rows.length} this week \u2022 Resets Sunday 00:00 UTC` });

        await interaction.editReply({ embeds: [embed], files: [attachment] });
    },
};
