const {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionFlagsBits,
    ChannelType,
} = require('discord.js');

const DURATION_CHOICES = [
    { name: 'Off',        value: 0 },
    { name: '5 seconds',  value: 5 },
    { name: '10 seconds', value: 10 },
    { name: '15 seconds', value: 15 },
    { name: '30 seconds', value: 30 },
    { name: '1 minute',   value: 60 },
    { name: '2 minutes',  value: 120 },
    { name: '5 minutes',  value: 300 },
    { name: '10 minutes', value: 600 },
    { name: '15 minutes', value: 900 },
    { name: '30 minutes', value: 1800 },
    { name: '1 hour',     value: 3600 },
    { name: '6 hours',    value: 21600 },
];

function humanDuration(secs) {
    if (secs === 0)    return 'Off';
    if (secs < 60)     return `${secs} second${secs !== 1 ? 's' : ''}`;
    if (secs < 3600)   return `${secs / 60} minute${secs / 60 !== 1 ? 's' : ''}`;
    return `${secs / 3600} hour${secs / 3600 !== 1 ? 's' : ''}`;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('slowmode')
        .setDescription('Set or remove slowmode in a channel')
        .addIntegerOption(opt =>
            opt.setName('duration')
                .setDescription('Slowmode interval (0 = off)')
                .setRequired(true)
                .addChoices(...DURATION_CHOICES)
        )
        .addChannelOption(opt =>
            opt.setName('channel')
                .setDescription('Channel to apply slowmode to (defaults to current)')
                .addChannelTypes(ChannelType.GuildText, ChannelType.GuildForum)
                .setRequired(false)
        )
        .addStringOption(opt =>
            opt.setName('reason')
                .setDescription('Reason for changing slowmode')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction) {
        const seconds = interaction.options.getInteger('duration');
        const channel = interaction.options.getChannel('channel') ?? interaction.channel;
        const reason  = interaction.options.getString('reason') ?? 'No reason provided';

        if (!channel.isTextBased()) {
            return interaction.reply({ content: '❌ Slowmode can only be set on text-based channels.', ephemeral: true });
        }

        try {
            await channel.setRateLimitPerUser(seconds, reason);
        } catch (err) {
            return interaction.reply({ content: `❌ Failed to set slowmode: ${err.message}`, ephemeral: true });
        }

        const isOff = seconds === 0;
        const embed = new EmbedBuilder()
            .setTitle(isOff ? '✅ Slowmode Disabled' : `🐢 Slowmode Set — ${humanDuration(seconds)}`)
            .setColor(isOff ? '#43B581' : '#FAA61A')
            .addFields(
                { name: 'Channel',  value: `<#${channel.id}>`,          inline: true },
                { name: 'Duration', value: humanDuration(seconds),       inline: true },
                { name: 'Set by',   value: `<@${interaction.user.id}>`,  inline: true },
                { name: 'Reason',   value: reason },
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};
