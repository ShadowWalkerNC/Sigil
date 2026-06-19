const { EmbedBuilder } = require('discord.js');
const { getConfig } = require('../utils/db.js');

async function handleWeeklyReport(client) {
    for (const [guildId, guild] of client.guilds.cache) {
        try {
            const config = getConfig(guildId);
            if (!config.stats_channel) continue;

            const channel = guild.channels.cache.get(config.stats_channel);
            if (!channel) continue;

            await guild.members.fetch().catch(() => {});
            const totalMembers  = guild.memberCount;
            const onlineMembers = guild.members.cache.filter(
                m => m.presence?.status && m.presence.status !== 'offline'
            ).size;
            const botCount   = guild.members.cache.filter(m => m.user.bot).size;
            const roleCount  = guild.roles.cache.size - 1;
            const chanCount  = guild.channels.cache.size;
            const boostTier  = guild.premiumTier;
            const boostCount = guild.premiumSubscriptionCount ?? 0;
            const ageDays    = Math.floor((Date.now() - guild.createdTimestamp) / 86400000);

            const embed = new EmbedBuilder()
                .setTitle(`📊 Weekly Server Report — ${guild.name}`)
                .setDescription('Here\'s your server health snapshot for the week.')
                .setColor(config.welcome_color || '#7B61FF')
                .setThumbnail(guild.iconURL({ size: 256 }) || null)
                .addFields(
                    { name: '👥 Total Members', value: totalMembers.toLocaleString(),              inline: true },
                    { name: '🟢 Online Now',    value: onlineMembers.toLocaleString(),             inline: true },
                    { name: '🤖 Bots',          value: botCount.toLocaleString(),                  inline: true },
                    { name: '🎭 Roles',         value: roleCount.toLocaleString(),                 inline: true },
                    { name: '📢 Channels',      value: chanCount.toLocaleString(),                 inline: true },
                    { name: '🚀 Boost Level',   value: `Tier ${boostTier} (${boostCount} boosts)`, inline: true },
                    { name: '📅 Server Age',    value: `${ageDays.toLocaleString()} days`,         inline: true }
                )
                .setFooter({ text: 'Sigil Weekly Report • Every Monday 9:00 UTC' })
                .setTimestamp();

            await channel.send({ embeds: [embed] });
        } catch (e) {
            console.error(`[weeklyReport] guild ${guildId}:`, e);
        }
    }
}

module.exports = { handleWeeklyReport };
