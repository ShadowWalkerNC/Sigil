const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, GuildScheduledEventStatus } = require('discord.js');
const { getConfig } = require('../utils/db.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('eventrecap')
        .setDescription('Manually post a recap or banner for a server event')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents)
        .addStringOption(opt => opt
            .setName('event')
            .setDescription('Event to recap (autocomplete)')
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addStringOption(opt => opt
            .setName('type')
            .setDescription('Banner type to post')
            .setRequired(false)
            .addChoices(
                { name: '📌 Teaser (Coming Soon)', value: 'teaser' },
                { name: '🔴 Live Banner',          value: 'live'   },
                { name: '✅ Recap (Ended)',          value: 'recap'  },
            )
        ),

    async autocomplete(interaction) {
        try {
            const focused = interaction.options.getFocused().toLowerCase();
            const events  = await interaction.guild.scheduledEvents.fetch();
            const choices = events
                .filter(e => e.name.toLowerCase().includes(focused))
                .first(25);

            await interaction.respond(
                (choices?.map ? [...choices.values()] : Object.values(choices ?? {}))
                    .map(e => ({ name: `${e.name} (${e.status === GuildScheduledEventStatus.Active ? 'LIVE' : e.status})`, value: e.id }))
            );
        } catch { await interaction.respond([]); }
    },

    async execute(interaction) {
        const cfg = getConfig(interaction.guild.id);
        if (!cfg.event_banner_channel) {
            return interaction.reply({
                content: '❌ No event banner channel configured. Set one with `/sigilconfig event_banner enabled:true channel:#your-channel`.',
                ephemeral: true,
            });
        }

        const eventId   = interaction.options.getString('event');
        const bannerType = interaction.options.getString('type') ?? 'recap';

        await interaction.deferReply({ ephemeral: true });

        let scheduledEvent;
        try {
            scheduledEvent = await interaction.guild.scheduledEvents.fetch(eventId);
        } catch {
            return interaction.editReply({ content: '❌ Could not fetch that event. It may have been deleted.' });
        }

        const postChannel = await interaction.client.channels.fetch(cfg.event_banner_channel);
        if (!postChannel?.isTextBased()) {
            return interaction.editReply({ content: '❌ The configured event banner channel is invalid or I lack permission to post there.' });
        }

        const startTs = scheduledEvent.scheduledStartAt
            ? Math.floor(scheduledEvent.scheduledStartAt.getTime() / 1000)
            : null;

        let embed;

        if (bannerType === 'teaser') {
            embed = new EmbedBuilder()
                .setTitle(`📌 Upcoming Event — ${scheduledEvent.name}`)
                .setColor('#F5A623')
                .setURL(`https://discord.com/events/${interaction.guild.id}/${scheduledEvent.id}`)
                .setFooter({ text: 'Sigil • Event Alerts — mark yourself as interested!' })
                .setTimestamp();
            if (scheduledEvent.description) embed.setDescription(scheduledEvent.description);
            if (scheduledEvent.coverImageURL()) embed.setImage(scheduledEvent.coverImageURL({ size: 1024 }));
            embed.addFields(
                { name: '🗓️ Starts',   value: startTs ? `<t:${startTs}:F> (<t:${startTs}:R>)` : 'TBD', inline: true },
                { name: '📍 Location', value: scheduledEvent.entityMetadata?.location ?? scheduledEvent.channel?.name ?? 'See event details', inline: true },
            );
        } else if (bannerType === 'live') {
            embed = new EmbedBuilder()
                .setTitle(`🔴 NOW LIVE — ${scheduledEvent.name}`)
                .setColor('#FF0000')
                .setURL(`https://discord.com/events/${interaction.guild.id}/${scheduledEvent.id}`)
                .setFooter({ text: 'Sigil • Event is live — join in!' })
                .setTimestamp();
            if (scheduledEvent.description) embed.setDescription(scheduledEvent.description);
            if (scheduledEvent.coverImageURL()) embed.setImage(scheduledEvent.coverImageURL({ size: 1024 }));
            embed.addFields(
                { name: '📍 Where', value: scheduledEvent.entityMetadata?.location ?? scheduledEvent.channel?.name ?? 'See event', inline: true },
            );
        } else {
            // recap
            let durationStr = 'N/A';
            if (scheduledEvent.scheduledStartAt) {
                const diffMins = Math.round((Date.now() - scheduledEvent.scheduledStartAt.getTime()) / 60_000);
                const h = Math.floor(Math.abs(diffMins) / 60);
                const m = Math.abs(diffMins) % 60;
                durationStr = h > 0 ? `~${h}h ${m}m` : `~${m} minutes`;
            }
            embed = new EmbedBuilder()
                .setTitle(`✅ Event Recap — ${scheduledEvent.name}`)
                .setColor('#43B581')
                .setFooter({ text: 'Sigil • Thanks to everyone who joined!' })
                .setTimestamp();
            if (scheduledEvent.description) embed.setDescription(scheduledEvent.description);
            if (scheduledEvent.coverImageURL()) embed.setThumbnail(scheduledEvent.coverImageURL({ size: 512 }));
            embed.addFields(
                { name: '⏱️ Duration', value: durationStr, inline: true },
                { name: '📍 Where',    value: scheduledEvent.entityMetadata?.location ?? scheduledEvent.channel?.name ?? 'N/A', inline: true },
            );
        }

        await postChannel.send({ embeds: [embed] });
        await interaction.editReply({ content: `✅ ${bannerType.charAt(0).toUpperCase() + bannerType.slice(1)} posted in <#${postChannel.id}>.` });
    },
};
