const { getConfig, getAutoRolesByTrigger } = require('../utils/db.js');
const { createCanvas, loadImage } = require('canvas');
const { AttachmentBuilder } = require('discord.js');
const { registerAllFonts } = require('../utils/canvas.js');
const { DEFAULT_FONT } = require('../utils/fonts.js');

registerAllFonts();

module.exports = {
    name: 'guildMemberAdd',
    async execute(member) {
        const { guild } = member;
        const config = getConfig(guild.id);
        const F      = DEFAULT_FONT;

        // Auto-roles: join
        const joinRoles = getAutoRolesByTrigger(guild.id, 'join');
        for (const rule of joinRoles) {
            try {
                await member.roles.add(rule.role_id, 'Auto-role: join trigger');
            } catch (err) {
                console.error(`[AutoRole] Failed to assign role ${rule.role_id} on join:`, err.message);
            }
        }

        if (!config.welcome_enabled || !config.welcome_channel) return;

        const channel = guild.channels.cache.get(config.welcome_channel);
        if (!channel?.isTextBased()) return;

        try {
            const canvas = createCanvas(800, 250);
            const ctx = canvas.getContext('2d');

            const gradient = ctx.createLinearGradient(0, 0, 800, 250);
            gradient.addColorStop(0, '#1a1a2e');
            gradient.addColorStop(1, '#16213e');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, 800, 250);

            ctx.strokeStyle = config.welcome_color || '#39FF14';
            ctx.lineWidth = 4;
            ctx.strokeRect(8, 8, 784, 234);

            const avatarURL = member.user.displayAvatarURL({ extension: 'png', size: 128 });
            const avatar = await loadImage(avatarURL);
            ctx.save();
            ctx.beginPath();
            ctx.arc(110, 125, 75, 0, Math.PI * 2);
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(avatar, 35, 50, 150, 150);
            ctx.restore();

            ctx.font = `bold 36px "${F}"`;
            ctx.fillStyle = '#ffffff';
            ctx.fillText(`Welcome, ${member.user.username}!`, 210, 110);

            ctx.font = `22px "${F}"`;
            ctx.fillStyle = '#aaaaaa';
            ctx.fillText(`You are member #${guild.memberCount}`, 210, 150);

            ctx.font = `18px "${F}"`;
            ctx.fillStyle = config.welcome_color || '#39FF14';
            ctx.fillText(guild.name, 210, 185);

            const attachment = new AttachmentBuilder(canvas.toBuffer('image/png'), { name: 'welcome.png' });
            await channel.send({ files: [attachment] });
        } catch (err) {
            console.error('[Welcome] Failed to send welcome image:', err.message);
        }
    },
};
