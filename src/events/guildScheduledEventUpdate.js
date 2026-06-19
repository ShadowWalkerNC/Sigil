/**
 * Fires when a Discord Scheduled Event is updated.
 * Handles two transitions:
 *   SCHEDULED -> ACTIVE   : post a "NOW LIVE" banner
 *   ACTIVE    -> COMPLETED: post a recap embed
 */
const { EmbedBuilder, GuildScheduledEventStatus } = require('discord.js');
const { getConfig } = require('../utils/db.js');

module.exports = {
    name: 'guildScheduledEventUpdate',
    async execute(oldEvent, newEvent, client) {
        const cfg = getConfig(newEvent.guild.id);
        if (!cfg.event_banner_enabled || !cfg.event_banner_channel) return;

        try {
            const channel = await client.channels.fetch(cfg.event_banner_channel);
            if (!channel?.isTextBased()) return;

            // ── NOW LIVE ──────────────────────────────────────────────────────────
            const wasScheduled = oldEvent.status === GuildScheduledEventStatus.Scheduled;
            const isNowActive  = newEvent.status === GuildScheduledEventStatus.Active;

            if (wasScheduled && isNowActive) {
                const embed = new EmbedBuilder()
                    .setTitle(`🔴 NOW LIVE — ${newEvent.name}`)
                    .setColor('#FF0000')
                    .setTimestamp();

                if (newEvent.description) embed.setDescription(newEvent.description);
                if (newEvent.coverImageURL()) embed.setImage(newEvent.coverImageURL({ size: 1024 }));

                embed.addFields(
                    { name: '📍 Where', value: newEvent.entityMetadata?.location ?? newEvent.channel?.name ?? 'See event', inline: true },
                );

                embed.setURL(`https://discord.com/events/${newEvent.guild.id}/${newEvent.id}`);
                embed.setFooter({ text: 'Sigil • Event is starting now — join in!' });

                await channel.send({
                    content: `🔔 **${newEvent.name}** is starting now!`,
                    embeds: [embed],
                });
                return;
            }

            // ── RECAP ──────────────────────────────────────────────────────────────
const wasActive     = oldEvent.status === GuildScheduledEventStatus.Active;
            const isNowComplete = newEvent.status === GuildScheduledEventStatus.Completed;

            if (wasActive && isNowComplete) {
                // Calculate duration
                let durationStr = 'Unknown duration';
                if (newEvent.scheduledStartAt) {
                    const endTime  = Date.now();
                    const startMs  = newEvent.scheduledStartAt.getTime();
                    const diffMins = Math.round((endTime - startMs) / 60_000);
                    const h = Math.floor(diffMins / 60);
                    const m = diffMins % 60;
                    durationStr = h > 0 ? `${h}h ${m}m` : `${m} minutes`;
                }

                const embed = new EmbedBuilder()
                    .setTitle(`✅ Event Recap — ${newEvent.name}`)
                    .setColor('#43B581')
                    .setTimestamp();

                if (newEvent.description) embed.setDescription(newEvent.description);
                if (newEvent.coverImageURL()) embed.setThumbnail(newEvent.coverImageURL({ size: 512 }));

                embed.addFields(
                    { name: '⏱️ Duration', value: durationStr, inline: true },
                    { name: '📍 Where',    value: newEvent.entityMetadata?.location ?? newEvent.channel?.name ?? 'N/A', inline: true },
                );

                embed.setFooter({ text: 'Sigil • Thanks to everyone who joined!' });

                await channel.send({ embeds: [embed] });
            }
        } catch (err) {
            console.error('[EventBanner] Update handler error:', err.message);
        }
    },
};
