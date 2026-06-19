const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getConfig, addModCase } = require('../utils/db.js');
const { buildCaseEmbed, postToModLog, dmTarget } = require('../utils/mod.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kick a member from the server')
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
        .addUserOption(opt => opt.setName('user').setDescription('Member to kick').setRequired(true))
        .addStringOption(opt => opt.setName('reason').setDescription('Reason for the kick').setRequired(true)),

    async execute(interaction) {
        const target = interaction.options.getMember('user');
        const reason = interaction.options.getString('reason');
        const cfg    = getConfig(interaction.guild.id);

        if (!target) return interaction.reply({ content: 'Member not found.', ephemeral: true });
        if (target.id === interaction.user.id) return interaction.reply({ content: "You can't kick yourself.", ephemeral: true });
        if (target.id === interaction.client.user.id) return interaction.reply({ content: "I can't kick myself.", ephemeral: true });
        if (!target.kickable) return interaction.reply({ content: "I don't have permission to kick that member.", ephemeral: true });

        const caseNumber = addModCase(
            interaction.guild.id, 'kick',
            target.id, target.user.tag,
            interaction.user.id, interaction.user.tag,
            reason
        );

        await dmTarget(target, 'kick', reason, interaction.guild);
        await target.kick(reason);

        const embed = buildCaseEmbed('kick', caseNumber, target.user, interaction.user, reason);
        await postToModLog(interaction.guild, cfg, embed);

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },
};
