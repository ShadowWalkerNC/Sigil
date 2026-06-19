const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { getConfig, setConfig } = require('../utils/db.js');

function parseList(str) {
    try { return JSON.parse(str || '[]'); } catch { return []; }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('integrations')
        .setDescription('Configure Twitch and YouTube live / upload notifications (admin only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)

        .addSubcommandGroup(group => group
            .setName('twitch')
            .setDescription('Twitch live notifications')
            .addSubcommand(sub => sub
                .setName('setup')
                .setDescription('Enable Twitch live alerts and set the notification channel')
                .addChannelOption(opt => opt
                    .setName('channel')
                    .setDescription('Channel to post live alerts in')
                    .addChannelTypes(ChannelType.GuildText)
                    .setRequired(true)
                )
            )
            .addSubcommand(sub => sub
                .setName('add')
                .setDescription('Add a Twitch streamer to watch')
                .addStringOption(opt => opt
                    .setName('streamer')
                    .setDescription('Twitch username (e.g. shroud)')
                    .setRequired(true)
                )
            )
            .addSubcommand(sub => sub
                .setName('remove')
                .setDescription('Stop watching a Twitch streamer')
                .addStringOption(opt => opt
                    .setName('streamer')
                    .setDescription('Twitch username to remove')
                    .setRequired(true)
                    .setAutocomplete(true)
                )
            )
            .addSubcommand(sub => sub
                .setName('disable')
                .setDescription('Disable Twitch live alerts for this server')
            )
        )

        .addSubcommandGroup(group => group
            .setName('youtube')
            .setDescription('YouTube upload notifications')
            .addSubcommand(sub => sub
                .setName('setup')
                .setDescription('Enable YouTube upload alerts and set the notification channel')
                .addChannelOption(opt => opt
                    .setName('channel')
                    .setDescription('Channel to post upload alerts in')
                    .addChannelTypes(ChannelType.GuildText)
                    .setRequired(true)
                )
            )
            .addSubcommand(sub => sub
                .setName('add')
                .setDescription('Add a YouTube channel to watch')
                .addStringOption(opt => opt
                    .setName('handle')
                    .setDescription('YouTube handle or channel ID (e.g. @MrBeast or UCX6OQ3DkcsbYNE6H8uQQuVA)')
                    .setRequired(true)
                )
            )
            .addSubcommand(sub => sub
                .setName('remove')
                .setDescription('Stop watching a YouTube channel')
                .addStringOption(opt => opt
                    .setName('handle')
                    .setDescription('YouTube handle or channel ID to remove')
                    .setRequired(true)
                    .setAutocomplete(true)
                )
            )
            .addSubcommand(sub => sub
                .setName('disable')
                .setDescription('Disable YouTube upload alerts for this server')
            )
        )

        .addSubcommand(sub => sub
            .setName('status')
            .setDescription('Show current integration status for this server')
        ),

    async autocomplete(interaction) {
        const group   = interaction.options.getSubcommandGroup(false);
        const focused = interaction.options.getFocused().toLowerCase();
        const cfg     = getConfig(interaction.guild.id);

        if (group === 'twitch') {
            const streamers = parseList(cfg.twitch_streamers)
                .filter(s => s.includes(focused))
                .slice(0, 25)
                .map(s => ({ name: s, value: s }));
            return interaction.respond(streamers);
        }

        if (group === 'youtube') {
            const handles = parseList(cfg.youtube_handles)
                .filter(h => h.toLowerCase().includes(focused))
                .slice(0, 25)
                .map(h => ({ name: h, value: h }));
            return interaction.respond(handles);
        }

        await interaction.respond([]);
    },

    async execute(interaction) {
        const group   = interaction.options.getSubcommandGroup(false);
        const sub     = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        // ── STATUS ───────────────────────────────────────────────────────────
        if (sub === 'status') {
            const cfg       = getConfig(guildId);
            const streamers = parseList(cfg.twitch_streamers);
            const ytHandles = parseList(cfg.youtube_handles);

            const embed = new EmbedBuilder()
                .setTitle('🔗 Integrations Status')
                .setColor('#5865F2')
                .addFields(
                    {
                        name: '🟣 Twitch',
                        value: cfg.twitch_enabled
                            ? `🟢 On — <#${cfg.twitch_channel}>\nWatching: ${streamers.length ? streamers.map(s => `\`${s}\``).join(', ') : '*(none)*'}`
                            : '🔴 Off',
                        inline: false,
                    },
                    {
                        name: '📹 YouTube',
                        value: cfg.youtube_enabled
                            ? `🟢 On — <#${cfg.youtube_channel}>\nWatching: ${ytHandles.length ? ytHandles.map(h => `\`${h}\``).join(', ') : '*(none)*'}`
                            : '🔴 Off',
                        inline: false,
                    },
                )
                .setFooter({ text: 'Sigil • integrations status' });

            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        // ── TWITCH ───────────────────────────────────────────────────────────
        if (group === 'twitch') {
            const cfg = getConfig(guildId);

            if (sub === 'setup') {
                const channel = interaction.options.getChannel('channel');
                setConfig(guildId, { twitch_enabled: 1, twitch_channel: channel.id });
                return interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setTitle('✅ Twitch Alerts Enabled')
                        .setDescription(`Live alerts will post in <#${channel.id}>.\n\nUse \`/integrations twitch add\` to add streamers to watch.`)
                        .setColor('#9146FF')
                        .setFooter({ text: 'Sigil • integrations twitch setup' })],
                    ephemeral: true,
                });
            }

            if (sub === 'add') {
                const streamer  = interaction.options.getString('streamer').toLowerCase().trim();
                const streamers = parseList(cfg.twitch_streamers);
                if (streamers.includes(streamer)) {
                    return interaction.reply({ content: `\`${streamer}\` is already in your watch list.`, ephemeral: true });
                }
                if (streamers.length >= 25) {
                    return interaction.reply({ content: '❌ Maximum of 25 streamers per server.', ephemeral: true });
                }
                streamers.push(streamer);
                setConfig(guildId, { twitch_streamers: JSON.stringify(streamers) });
                return interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setTitle('✅ Streamer Added')
                        .setDescription(`Now watching **${streamer}** on Twitch.\nCurrent list: ${streamers.map(s => `\`${s}\``).join(', ')}`)
                        .setColor('#9146FF')
                        .setFooter({ text: 'Sigil • integrations twitch add' })],
                    ephemeral: true,
                });
            }

            if (sub === 'remove') {
                const streamer  = interaction.options.getString('streamer').toLowerCase().trim();
                const streamers = parseList(cfg.twitch_streamers);
                if (!streamers.includes(streamer)) {
                    return interaction.reply({ content: `❌ \`${streamer}\` is not in your watch list.`, ephemeral: true });
                }
                const updated = streamers.filter(s => s !== streamer);
                setConfig(guildId, { twitch_streamers: JSON.stringify(updated) });
                return interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setTitle('✅ Streamer Removed')
                        .setDescription(`Removed **${streamer}** from watch list.${updated.length ? `\nRemaining: ${updated.map(s => `\`${s}\``).join(', ')}` : '\nWatch list is now empty.'}`)
                        .setColor('#9146FF')
                        .setFooter({ text: 'Sigil • integrations twitch remove' })],
                    ephemeral: true,
                });
            }

            if (sub === 'disable') {
                setConfig(guildId, { twitch_enabled: 0 });
                return interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setTitle('🔴 Twitch Alerts Disabled')
                        .setDescription('Twitch live alerts have been turned off. Your streamer list is preserved.')
                        .setColor('#ff4444')
                        .setFooter({ text: 'Sigil • integrations twitch disable' })],
                    ephemeral: true,
                });
            }
        }

        // ── YOUTUBE ──────────────────────────────────────────────────────────
        if (group === 'youtube') {
            const cfg = getConfig(guildId);

            if (sub === 'setup') {
                const channel = interaction.options.getChannel('channel');
                setConfig(guildId, { youtube_enabled: 1, youtube_channel: channel.id });
                return interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setTitle('✅ YouTube Alerts Enabled')
                        .setDescription(`Upload alerts will post in <#${channel.id}>.\n\nUse \`/integrations youtube add\` to add channels to watch.`)
                        .setColor('#FF0000')
                        .setFooter({ text: 'Sigil • integrations youtube setup' })],
                    ephemeral: true,
                });
            }

            if (sub === 'add') {
                const handle  = interaction.options.getString('handle').trim();
                const handles = parseList(cfg.youtube_handles);
                if (handles.includes(handle)) {
                    return interaction.reply({ content: `\`${handle}\` is already in your watch list.`, ephemeral: true });
                }
                if (handles.length >= 10) {
                    return interaction.reply({ content: '❌ Maximum of 10 YouTube channels per server (API quota).', ephemeral: true });
                }
                handles.push(handle);
                setConfig(guildId, { youtube_handles: JSON.stringify(handles) });
                return interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setTitle('✅ YouTube Channel Added')
                        .setDescription(`Now watching **${handle}** on YouTube.\nCurrent list: ${handles.map(h => `\`${h}\``).join(', ')}`)
                        .setColor('#FF0000')
                        .setFooter({ text: 'Sigil • integrations youtube add' })],
                    ephemeral: true,
                });
            }

            if (sub === 'remove') {
                const handle  = interaction.options.getString('handle').trim();
                const handles = parseList(cfg.youtube_handles);
                if (!handles.includes(handle)) {
                    return interaction.reply({ content: `❌ \`${handle}\` is not in your watch list.`, ephemeral: true });
                }
                const updated = handles.filter(h => h !== handle);
                setConfig(guildId, { youtube_handles: JSON.stringify(updated) });
                return interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setTitle('✅ YouTube Channel Removed')
                        .setDescription(`Removed **${handle}** from watch list.${updated.length ? `\nRemaining: ${updated.map(h => `\`${h}\``).join(', ')}` : '\nWatch list is now empty.'}`)
                        .setColor('#FF0000')
                        .setFooter({ text: 'Sigil • integrations youtube remove' })],
                    ephemeral: true,
                });
            }

            if (sub === 'disable') {
                setConfig(guildId, { youtube_enabled: 0 });
                return interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setTitle('🔴 YouTube Alerts Disabled')
                        .setDescription('YouTube upload alerts have been turned off. Your channel list is preserved.')
                        .setColor('#ff4444')
                        .setFooter({ text: 'Sigil • integrations youtube disable' })],
                    ephemeral: true,
                });
            }
        }
    },
};
