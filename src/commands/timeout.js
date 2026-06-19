const {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionFlagsBits,
} = require('discord.js');
const { addModCase, getConfig } = require('../utils/db.js');

const DURATION_MAP = {
    '60':    60,
    '300':   300,
    '600':   600,
    '1800':  1800,
    '3600':  3600,
    '21600': 21600,
    '43200': 43200,
    '86400': 86400,
    '604800': 604800,
};

function humanDuration(seconds) {
    if (seconds < 60)   return `${seconds}s`;
    if (seconds < 3600) return `${seconds / 60}m`;
    if (seconds < 86400) return `${seconds / 3600}h`;
    return `${seconds / 86400}d`;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('timeout')
        .setDescription('Timeout (mute) a member for a set duration')
        .addUserOption(opt => opt.setName('user').setDescription('Member to timeout').setRequired(true))
        .addStringOption(opt =>
            opt.setName('duration')
                .setDescription('How long to timeout for')
                .setRequired(true)
                .addChoices(
                    { name: '1 minute',   value: '60' },
                    { name: '5 minutes',  value: '300' },
                    { name: '10 minutes', value: '600' },
                    { name: '30 minutes', value: '1800' },
                    { name: '1 hour',     value: '3600' },
                    { name: '6 hours',    value: '21600' },
                    { name: '12 hours',   value: '43200' },
                    { name: '1 day',      value: '86400' },
                    { name: '1 week',     value: '604800' },
                )
        )
        .addStringOption(opt => opt.setName('reason').setDescription('Reason for the timeout').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

    async execute(interaction) {
        const target   = interaction.options.getMember('user');
        const durKey   = interaction.options.getString('duration');
        const reason   = interaction.options.getString('reason') ?? 'No reason provided';
        const seconds  = DURATION_MAP[durKey];
        const guildId  = interaction.guild.id;

        if (!target) {
            return interaction.reply({ content: '❌ Member not found in this server.', ephemeral: true });
        }
        if (target.id === interaction.user.id) {
            return interaction.reply({ content: '❌ You cannot timeout yourself.', ephemeral: true });
        }
        if (target.id === interaction.guild.ownerId) {
            return interaction.reply({ content: '❌ Cannot timeout the server owner.', ephemeral: true });
        }
        if (!target.moderatable) {
            return interaction.reply({ content: '❌ I cannot timeout this member — their role is too high.', ephemeral: true });
        }
        if (target.roles.highest.position >= interaction.member.roles.highest.position) {
            return interaction.reply({ content: '❌ You cannot timeout someone with an equal or higher role.', ephemeral: true });
        }

        await interaction.deferReply();

        try {
            await target.timeout(seconds * 1000, reason);
        } catch (err) {
            return interaction.editReply({ content: `❌ Failed to timeout: ${err.message}` });
        }

        const caseNum = addModCase(guildId, 'TIMEOUT', target.id, target.user.tag, interaction.user.id, interaction.user.tag, reason);
        const label   = humanDuration(seconds);

        const embed = new EmbedBuilder()
            .setTitle(`⏱️ Member Timed Out — Case #${caseNum}`)
            .setColor('#FAA61A')
            .addFields(
                { name: 'Member',    value: `<@${target.id}> (${target.user.tag})`,    inline: true },
                { name: 'Duration',  value: label,                                      inline: true },
                { name: 'Moderator', value: `<@${interaction.user.id}>`,               inline: true },
                { name: 'Reason',    value: reason },
            )
            .setThumbnail(target.user.displayAvatarURL())
            .setFooter({ text: `User ID: ${target.id}` })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });

        // DM the user
        await target.send({
            embeds: [
                new EmbedBuilder()
                    .setTitle(`⏱️ You have been timed out in ${interaction.guild.name}`)
                    .setColor('#FAA61A')
                    .addFields(
                        { name: 'Duration', value: label,  inline: true },
                        { name: 'Reason',   value: reason, inline: true },
                    )
                    .setTimestamp(),
            ],
        }).catch(() => {});

        // Log
        const cfg = getConfig(guildId);
        if (!cfg.mod_log_channel) return;
        const logCh = await interaction.guild.channels.fetch(cfg.mod_log_channel).catch(() => null);
        if (!logCh?.isTextBased()) return;
        await logCh.send({ embeds: [embed] }).catch(() => {});
    },
};
