/**
 * Fires when a Discord Scheduled Event is created.
 * Posts a "Coming Soon" teaser banner to the configured event_banner_channel.
 */
const { EmbedBuilder } = require('discord.js');
const { getConfig } = require('../utils/db.js');

module.exports = {
    name: 'guildScheduledEventCreate',
    async execute(event, client) {
        const cfg = getConfig(event.guild.id);
        if (!cfg.event_banner_enabled || !cfg.event_banner_channel) return;

        try {
            const channel = await client.channels.fetch(cfg.event_banner_channel);
            if (!channel?.isTextBased()) return;

            const startTs = event.scheduledStartAt
                ? Math.floor(event.scheduledStartAt.getTime() / 1000)
                : null;

            const embed = new EmbedBuilder()
                .setTitle(`📌 Upcoming Event — ${event.name}`)
                .setColor('#F5A623')
                .setTimestamp();

            if (event.description) embed.setDescription(event.description);
            if (event.coverImageURL()) embed.setImage(event.coverImageURL({ size: 1024 }));

            embed.addFields(
                { name: '🗓️ Starts',   value: startTs ? `<t:${startTs}:F> (<t:${startTs}:R>)` : 'TBD', inline: true },
                { name: '📍 Location', value: event.entityMetadata?.location ?? event.channel?.name ?? 'See event details', inline: true },
            );

            embed.setURL(`https://discord.com/events/${event.guild.id}/${event.id}`);
            embed.setFooter({ text: 'Sigil • Event Alerts — mark yourself as interested!' });

            await channel.send({ embeds: [embed] });
        } catch (err) {
            console.error('[EventBanner] Create handler error:', err.message);
        }
    },
};
