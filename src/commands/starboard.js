const {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionFlagsBits,
    ChannelType,
} = require('discord.js');
const { getConfig, setConfig } = require('../utils/db.js');

module.exports.data = new SlashCommandBuilder()
    .setName('starboard')
    .setDescription('Configure the Starboard system')
    .addSubcommand(sub => sub
        .setName('setup')
        .setDescription('Set up or update Starboard settings')
        .addChannelOption(opt => opt
            .setName('channel')
            .setDescription('Channel to post starred messages in')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
        .addIntegerOption(opt => opt
            .setName('threshold')
            .setDescription('Number of ⭐ reactions needed (default 3)')
            .setMinValue(1).setMaxValue(50)
            .setRequired(false)
        )
        .addStringOption(opt => opt
            .setName('emoji')
            .setDescription('Reaction emoji to watch (default ⭐)')
            .setRequired(false)
        )
    )
    .addSubcommand(sub => sub
        .setName('ignore')
        .setDescription('Toggle ignoring a channel from Starboard')
        .addChannelOption(opt => opt
            .setName('channel')
            .setDescription('Channel to ignore or un-ignore')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand(sub => sub
        .setName('status')
        .setDescription('Show current Starboard configuration')
    )
    .addSubcommand(sub => sub
        .setName('disable')
        .setDescription('Disable the Starboard')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

module.exports.execute = async function execute(interaction) {
    const sub     = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;
    const cfg     = getConfig(guildId);

    if (sub === 'setup') {
        const channel   = interaction.options.getChannel('channel');
        const threshold = interaction.options.getInteger('threshold');
        const emoji     = interaction.options.getString('emoji')?.trim();
        const updates   = { starboard_channel: channel.id, starboard_enabled: 1 };
        if (threshold !== null) updates.starboard_threshold = threshold;
        if (emoji)              updates.starboard_emoji     = emoji;
        setConfig(guildId, updates);

        const th  = threshold ?? cfg.starboard_threshold ?? 3;
        const em  = emoji     ?? cfg.starboard_emoji     ?? '⭐';
        return interaction.reply({
            embeds: [new EmbedBuilder()
                .setTitle('⭐ Starboard Enabled')
                .setDescription(`Starred messages will appear in <#${channel.id}>.`)
                .addFields(
                    { name: 'Threshold', value: `${th} ${em}`, inline: true },
                    { name: 'Emoji',     value: em,            inline: true }
                )
                .setColor('#FAA61A')
                .setTimestamp()],
            ephemeral: true,
        });
    }

    if (sub === 'ignore') {
        const channel = interaction.options.getChannel('channel');
        let ignored   = cfg.starboard_ignored ? JSON.parse(cfg.starboard_ignored) : [];
        let msg;
        if (ignored.includes(channel.id)) {
            ignored = ignored.filter(id => id !== channel.id);
            msg = `✅ <#${channel.id}> is **no longer ignored** by Starboard.`;
        } else {
            ignored.push(channel.id);
            msg = `✅ <#${channel.id}> is now **ignored** by Starboard.`;
        }
        setConfig(guildId, { starboard_ignored: JSON.stringify(ignored) });
        return interaction.reply({ content: msg, ephemeral: true });
    }

    if (sub === 'status') {
        const on      = cfg.starboard_enabled;
        const ch      = cfg.starboard_channel;
        const th      = cfg.starboard_threshold ?? 3;
        const em      = cfg.starboard_emoji     ?? '⭐';
        const ignored = cfg.starboard_ignored ? JSON.parse(cfg.starboard_ignored) : [];
        return interaction.reply({
            embeds: [new EmbedBuilder()
                .setTitle('⭐ Starboard Status')
                .setColor(on ? '#FAA61A' : '#747F8D')
                .addFields(
                    { name: 'Status',    value: on ? '✅ Enabled' : '❌ Disabled', inline: true },
                    { name: 'Channel',   value: ch ? `<#${ch}>` : 'Not set',       inline: true },
                    { name: 'Threshold', value: `${th} ${em}`,                     inline: true },
                    { name: 'Ignored Channels', value: ignored.length ? ignored.map(id => `<#${id}>`).join(', ') : 'None' }
                )
                .setTimestamp()],
            ephemeral: true,
        });
    }

    if (sub === 'disable') {
        setConfig(guildId, { starboard_enabled: 0 });
        return interaction.reply({
            embeds: [new EmbedBuilder()
                .setTitle('🔕 Starboard Disabled')
                .setDescription('The Starboard has been turned off.')
                .setColor('#F04747')
                .setTimestamp()],
            ephemeral: true,
        });
    }
};
