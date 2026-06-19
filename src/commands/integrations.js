const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getTwitchSubs, getYoutubeSubs } = require('../utils/db.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('integrations')
        .setDescription('Show the status of Twitch and YouTube alert integrations for this server')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(sub => sub
            .setName('status')
            .setDescription('Show all active Twitch and YouTube alert subscriptions')
        ),

    async execute(interaction) {
        const guildId  = interaction.guild.id;
        const twitchSubs = getTwitchSubs(guildId);
        const youtubeSubs = getYoutubeSubs(guildId);

        const twitchValue = twitchSubs.length
            ? twitchSubs.map(s => `• [${s.streamer_name}](https://twitch.tv/${s.streamer_login}) → <#${s.post_channel_id}>`).join('\n')
            : '*None — use `/twitch add` to set one up.*';

        const youtubeValue = youtubeSubs.length
            ? youtubeSubs.map(s => `• **${s.channel_name}** (\`${s.yt_channel_id}\`) → <#${s.post_channel_id}>`).join('\n')
            : '*None — use `/youtube add` to set one up.*';

        const embed = new EmbedBuilder()
            .setTitle('🔗 Integrations Status')
            .setColor('#5865F2')
            .addFields(
                {
                    name: '🟣 Twitch Live Alerts',
                    value: twitchValue,
                    inline: false,
                },
                {
                    name: '📹 YouTube Upload Alerts',
                    value: youtubeValue,
                    inline: false,
                },
            )
            .addFields({
                name: '🛠️ Manage Subscriptions',
                value: '`/twitch add|remove|list` • `/youtube add|remove|list`',
                inline: false,
            })
            .setFooter({ text: 'Sigil • integrations status' });

        return interaction.reply({ embeds: [embed], ephemeral: true });
    },
};
