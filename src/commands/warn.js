const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getConfig, addModCase } = require('../utils/db.js');
const { buildCaseEmbed, postToModLog, dmTarget } = require('../utils/mod.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Issue a formal warning to a member')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(opt => opt.setName('user').setDescription('Member to warn').setRequired(true))
        .addStringOption(opt => opt.setName('reason').setDescription('Reason for the warning').setRequired(true)),

    async execute(interaction) {
        const target = interaction.options.getMember('user');
        const reason = interaction.options.getString('reason');
        const cfg    = getConfig(interaction.guild.id);

        if (!target) return interaction.reply({ content: 'Member not found.', ephemeral: true });
        if (target.id === interaction.user.id) return interaction.reply({ content: "You can't warn yourself.", ephemeral: true });
        if (target.id === interaction.client.user.id) return interaction.reply({ content: "I can't warn myself.", ephemeral: true });

        const caseNumber = addModCase(
            interaction.guild.id, 'warn',
            target.id, target.user.tag,
            interaction.user.id, interaction.user.tag,
            reason
        );

        await dmTarget(target, 'warn', reason, interaction.guild);

        const embed = buildCaseEmbed('warn', caseNumber, target.user, interaction.user, reason);
        await postToModLog(interaction.guild, cfg, embed);

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },
};
