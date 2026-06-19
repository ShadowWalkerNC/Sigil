const { Events, EmbedBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const { AttachmentBuilder } = require('discord.js');
const {
    getConfig, getXP, addXP, updateLastXpAt, getUserRank, getLevelAutoRoles,
    getCustomCommand,
} = require('../utils/db.js');
const { calculateLevel, xpForLevel } = require('../utils/xp.js');
const { getBackgroundById } = require('../utils/backgrounds.js');
const { registerAllFonts } = require('../utils/canvas.js');
const { DEFAULT_FONT } = require('../utils/fonts.js');

registerAllFonts();

const cooldowns = new Map();

function resolveTemplate(text, message) {
    return text
        .replace(/\{user\}/gi,     `<@${message.author.id}>`)
        .replace(/\{username\}/gi,  message.author.username)
        .replace(/\{server\}/gi,   message.guild?.name ?? 'this server')
        .replace(/\{count\}/gi,    String(message.guild?.memberCount ?? ''));
}

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        if (message.author.bot || !message.guild) return;

        // ── Custom Commands ────────────────────────────────────────────
        const content = message.content.trim();
        if (content.length > 0) {
            const firstWord = content.split(/\s+/)[0].toLowerCase();
            const cmd = getCustomCommand(message.guild.id, firstWord)
                     ?? getCustomCommand(message.guild.id, content.toLowerCase());

            if (cmd) {
                const resolved = resolveTemplate(cmd.response, message);
                if (cmd.delete_trigger) await message.delete().catch(() => {});
                if (cmd.embed) {
                    await message.channel.send({
                        embeds: [
                            new EmbedBuilder()
                                .setDescription(resolved)
                                .setColor(cmd.embed_color ?? '#5865F2'),
                        ],
                    }).catch(() => {});
                } else {
                    await message.channel.send(resolved).catch(() => {});
                }
            }
        }

        // ── XP System ─────────────────────────────────────────────────
        const cfg = getConfig(message.guild.id);
        if (!cfg.xp_enabled) return;

        const key     = `${message.guild.id}:${message.author.id}`;
        const now     = Date.now();
        const cdMs    = (cfg.xp_cooldown ?? 60) * 1000;
        const lastMsg = cooldowns.get(key) ?? 0;

        if (now - lastMsg < cdMs) return;
        cooldowns.set(key, now);

        const rate   = cfg.xp_rate ?? 15;
        const award  = Math.floor(rate * 0.8 + Math.random() * rate * 0.4);
        const row    = getXP(message.guild.id, message.author.id);

        const before = calculateLevel(row.xp);

        // addXP increments both lifetime xp and weekly_xp atomically
        addXP(message.guild.id, message.author.id, award);

        const newXp = row.xp + award;
        const after = calculateLevel(newXp);

        if (after.level <= before.level) return;

        // Level auto-roles
        try {
            const member = message.member ?? await message.guild.members.fetch(message.author.id).catch(() => null);
            if (member) {
                for (let lvl = before.level + 1; lvl <= after.level; lvl++) {
                    const levelRoles = getLevelAutoRoles(message.guild.id, lvl);
                    for (const rule of levelRoles) {
                        try {
                            await member.roles.add(rule.role_id, `Auto-role: level:${lvl} trigger`);
                        } catch (err) {
                            console.error(`[AutoRole] Failed to assign role ${rule.role_id} at level ${lvl}:`, err.message);
                        }
                    }
                }
            }
        } catch (err) {
            console.error('[AutoRole] Level auto-role error:', err.message);
        }

        if (!cfg.xp_channel) return;

        // Level-up card
        try {
            const channel = await message.guild.channels.fetch(cfg.xp_channel);
            if (!channel?.isTextBased()) return;

            const rank      = getUserRank(message.guild.id, message.author.id);
            const member    = message.member ?? await message.guild.members.fetch(message.author.id).catch(() => null);
            const avatarURL = message.author.displayAvatarURL({ extension: 'png', size: 128 });
            const primary   = '#39FF14';
            const F         = DEFAULT_FONT;

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

            ctx.font = `bold 13px "${F}"`;
            ctx.fillStyle = primary;
            ctx.fillText(`RANK #${rank}`, TX, H * 0.28);

            ctx.font = `bold 28px "${F}"`;
            ctx.fillStyle = '#ffffff';
            ctx.fillText(member?.displayName ?? message.author.username, TX, H * 0.28 + 26);

            ctx.textAlign = 'right';
            ctx.font = `bold 13px "${F}"`;
            ctx.fillStyle = primary;
            ctx.fillText('LEVEL UP!', W - 20, H * 0.28);
            ctx.font = `bold 32px "${F}"`;
            ctx.fillStyle = primary;
            ctx.shadowColor = primary; ctx.shadowBlur = 12;
            ctx.fillText(`${after.level}`, W - 20, H * 0.28 + 30);
            ctx.shadowBlur = 0;

            const barX = TX, barY = H * 0.68, barW = W - TX - 24, barH = 18;
            ctx.fillStyle = '#ffffff22';
            ctx.beginPath();
            ctx.roundRect(barX, barY, barW, barH, barH / 2);
            ctx.fill();

            const pct  = after.currentXp / after.requiredXp;
            const grad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
            grad.addColorStop(0, primary);
            grad.addColorStop(1, primary + '88');
            ctx.fillStyle = grad;
            ctx.shadowColor = primary; ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.roundRect(barX, barY, Math.max(barH, barW * pct), barH, barH / 2);
            ctx.fill();
            ctx.shadowBlur = 0;

            ctx.font = `13px "${F}"`; ctx.fillStyle = '#aaaaaa';
            ctx.textAlign = 'left';
            ctx.fillText(`${after.currentXp} / ${after.requiredXp} XP`, barX, barY + barH + 18);

            ctx.font = `12px "${F}"`; ctx.fillStyle = '#ffffff18';
            ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
            ctx.fillText('made with Sigil', W - 12, H - 6);

            const buf        = canvas.toBuffer('image/png');
            const attachment = new AttachmentBuilder(buf, { name: 'levelup.png' });

            await channel.send({
                content: `\uD83C\uDF89 <@${message.author.id}> leveled up to **Level ${after.level}**!`,
                files: [attachment],
            });
        } catch (err) {
            console.error('[XP] Level-up card error:', err);
        }
    },
};
