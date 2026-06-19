const { SlashCommandBuilder, AttachmentBuilder, EmbedBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const { getXP, getUserRank } = require('../utils/db.js');
const { calculateLevel } = require('../utils/xp.js');
const { getBackgroundById } = require('../utils/backgrounds.js');
const { registerAllFonts } = require('../utils/canvas.js');

registerAllFonts();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('xprank')
        .setDescription('View your XP rank card (or another member\'s)')
        .addUserOption(opt => opt.setName('user').setDescription('Member to look up (default: you)')),

    async execute(interaction) {
        await interaction.deferReply();

        const target    = interaction.options.getUser('user') ?? interaction.user;
        const member    = await interaction.guild.members.fetch(target.id).catch(() => null);
        const guildId   = interaction.guild.id;
        const row       = getXP(guildId, target.id);
        const { level, currentXp, requiredXp } = calculateLevel(row.xp);
        const rank      = getUserRank(guildId, target.id);
        const primary   = '#39FF14';
        const font      = 'Arial';
        const avatarURL = target.displayAvatarURL({ extension: 'png', size: 128 });

        const W = 800, H = 200;
        const canvas = createCanvas(W, H);
        const ctx    = canvas.getContext('2d');

        try { getBackgroundById('gradient-purple').draw(ctx, W, H); }
        catch { ctx.fillStyle = '#1a1a2e'; ctx.fillRect(0, 0, W, H); }
        ctx.fillStyle = '#00000066'; ctx.fillRect(0, 0, W, H);

        const AR = 64, AX = 24, AY = H / 2;
        ctx.save();
        ctx.beginPath();
        ctx.arc(AX + AR, AY, AR, 0, Math.PI * 2);
        ctx.clip();
        try {
            const img = await loadImage(avatarURL);
            ctx.drawImage(img, AX, AY - AR, AR * 2, AR * 2);
        } catch {
            ctx.fillStyle = primary + '44'; ctx.fill();
        }
        ctx.restore();

        ctx.beginPath();
        ctx.arc(AX + AR, AY, AR + 3, 0, Math.PI * 2);
        ctx.strokeStyle = primary; ctx.lineWidth = 3; ctx.stroke();

        const TX = AX + AR * 2 + 24;
        ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';

        ctx.font = `bold 13px Arial`;
        ctx.fillStyle = primary;
        ctx.fillText(`RANK #${rank}`, TX, H * 0.28);

        ctx.font = `bold 28px "${font}"`;
        ctx.fillStyle = '#ffffff';
        ctx.fillText(member?.displayName ?? target.username, TX, H * 0.28 + 26);

        ctx.textAlign = 'right';
        ctx.font = `bold 13px Arial`;
        ctx.fillStyle = '#aaaaaa';
        ctx.fillText('LEVEL', W - 20, H * 0.28);
        ctx.font = `bold 32px "${font}"`;
        ctx.fillStyle = primary;
        ctx.fillText(`${level}`, W - 20, H * 0.28 + 30);

        const barX = TX, barY = H * 0.68, barW = W - TX - 24, barH = 18;
        ctx.fillStyle = '#ffffff22';
        ctx.beginPath();
        ctx.roundRect(barX, barY, barW, barH, barH / 2);
        ctx.fill();

        const pct  = Math.min(1, currentXp / requiredXp);
        const grad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
        grad.addColorStop(0, primary);
        grad.addColorStop(1, primary + '88');
        ctx.fillStyle = grad;
        ctx.shadowColor = primary; ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.roundRect(barX, barY, Math.max(barH, barW * pct), barH, barH / 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.font = '13px Arial'; ctx.fillStyle = '#aaaaaa';
        ctx.textAlign = 'left';
        ctx.fillText(`${currentXp.toLocaleString()} / ${requiredXp.toLocaleString()} XP`, barX, barY + barH + 18);

        ctx.font = '12px Arial'; ctx.fillStyle = '#ffffff18';
        ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
        ctx.fillText('made with Sigil', W - 12, H - 6);

        const buf        = canvas.toBuffer('image/png');
        const attachment = new AttachmentBuilder(buf, { name: 'xprank.png' });

        const embed = new EmbedBuilder()
            .setTitle(`⭐ XP Rank — ${member?.displayName ?? target.username}`)
            .setImage('attachment://xprank.png')
            .setColor(primary)
            .addFields(
                { name: 'Level',    value: `${level}`,                                  inline: true },
                { name: 'XP',       value: `${currentXp.toLocaleString()} / ${requiredXp.toLocaleString()}`, inline: true },
                { name: 'Rank',     value: `#${rank}`,                                  inline: true },
            )
            .setFooter({ text: 'Sigil • xprank' });

        await interaction.editReply({ embeds: [embed], files: [attachment] });
    },
};
