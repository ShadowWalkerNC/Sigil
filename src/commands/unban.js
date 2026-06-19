const {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionFlagsBits,
} = require('discord.js');
const { addModCase, getConfig } = require('../utils/db.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unban')
        .setDescription('Unban a user from this server by their ID')
        .addStringOption(opt =>
            opt.setName('user_id')
                .setDescription('The ID of the user to unban')
                .setRequired(true)
        )
        .addStringOption(opt =>
            opt.setName('reason')
                .setDescription('Reason for the unban')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

    async execute(interaction) {
        const userId  = interaction.options.getString('user_id').trim();
        const reason  = interaction.options.getString('reason') ?? 'No reason provided';
        const guildId = interaction.guild.id;

        if (!/^\d{17,20}$/.test(userId)) {
            return interaction.reply({ content: '❌ Invalid user ID. Must be a valid Discord snowflake.', ephemeral: true });
        }

        await interaction.deferReply();

        // Verify they are actually banned
        const ban = await interaction.guild.bans.fetch(userId).catch(() => null);
        if (!ban) {
            return interaction.editReply({ content: `❌ No ban found for user ID \`${userId}\`.` });
        }

        try {
            await interaction.guild.members.unban(userId, reason);
        } catch (err) {
            return interaction.editReply({ content: `❌ Failed to unban: ${err.message}` });
        }

        const caseNum = addModCase(guildId, 'UNBAN', ban.user.id, ban.user.tag, interaction.user.id, interaction.user.tag, reason);

        const embed = new EmbedBuilder()
            .setTitle(`✅ User Unbanned — Case #${caseNum}`)
            .setColor('#43B581')
            .addFields(
                { name: 'User',      value: `${ban.user.tag} (\`${ban.user.id}\`)`, inline: true },
                { name: 'Moderator', value: `<@${interaction.user.id}>`,             inline: true },
                { name: 'Reason',    value: reason },
            )
            .setThumbnail(ban.user.displayAvatarURL())
            .setFooter({ text: `User ID: ${ban.user.id}` })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });

        // Log
        const cfg = getConfig(guildId);
        if (!cfg.mod_log_channel) return;
        const logCh = await interaction.guild.channels.fetch(cfg.mod_log_channel).catch(() => null);
        if (!logCh?.isTextBased()) return;
        await logCh.send({ embeds: [embed] }).catch(() => {});
    },
};
