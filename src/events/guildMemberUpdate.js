const { getConfig, getAutoRolesByTrigger } = require('../utils/db.js');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'guildMemberUpdate',
    async execute(oldMember, newMember) {
        const { guild } = newMember;
        const config = getConfig(guild.id);

        // Boost auto-roles
        const wasBosting = oldMember.premiumSince !== null;
        const nowBoosting = newMember.premiumSince !== null;
        if (!wasBosting && nowBoosting) {
            const boostRoles = getAutoRolesByTrigger(guild.id, 'boost');
            for (const rule of boostRoles) {
                try {
                    await newMember.roles.add(rule.role_id, 'Auto-role: boost trigger');
                } catch (err) {
                    console.error(`[AutoRole] Failed to assign role ${rule.role_id} on boost:`, err.message);
                }
            }
        }

        // Boost announcement
        if (!config.boost_enabled || !config.boost_channel) return;
        if (wasBosting || !nowBoosting) return;

        const channel = guild.channels.cache.get(config.boost_channel);
        if (!channel?.isTextBased()) return;

        const embed = new EmbedBuilder()
            .setTitle('🚀 New Server Boost!')
            .setDescription(`**${newMember.user.tag}** just boosted the server! Thank you! 💜`)
            .setThumbnail(newMember.user.displayAvatarURL({ dynamic: true }))
            .setColor('#FF73FA')
            .setTimestamp();

        await channel.send({ embeds: [embed] }).catch(err =>
            console.error('[Boost] Failed to send boost announcement:', err.message)
        );
    },
};
