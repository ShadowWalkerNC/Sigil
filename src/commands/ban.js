const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { getConfig, addModCase } = require('../utils/db.js');
const { buildCaseEmbed, postToModLog, dmTarget } = require('../utils/mod.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Ban a member from the server')
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addUserOption(opt => opt.setName('user').setDescription('Member to ban').setRequired(true))
        .addStringOption(opt => opt.setName('reason').setDescription('Reason for the ban').setRequired(true))
        .addIntegerOption(opt => opt
            .setName('delete_days')
            .setDescription('Delete message history (days, 0–7)')
            .setMinValue(0)
            .setMaxValue(7)
        ),

    async execute(interaction) {
        const target     = interaction.options.getMember('user');
        const reason     = interaction.options.getString('reason');
        const deleteDays = interaction.options.getInteger('delete_days') ?? 0;
        const cfg        = getConfig(interaction.guild.id);

        if (!target) return interaction.reply({ content: 'Member not found.', ephemeral: true });
        if (target.id === interaction.user.id) return interaction.reply({ content: "You can't ban yourself.", ephemeral: true });
        if (target.id === interaction.client.user.id) return interaction.reply({ content: "I can't ban myself.", ephemeral: true });
        if (!target.bannable) return interaction.reply({ content: "I don't have permission to ban that member.", ephemeral: true });

        const caseNumber = addModCase(
            interaction.guild.id, 'ban',
            target.id, target.user.tag,
            interaction.user.id, interaction.user.tag,
            reason
        );

        await dmTarget(target, 'ban', reason, interaction.guild);
        await target.ban({ deleteMessageDays: deleteDays, reason });

        const embed = buildCaseEmbed('ban', caseNumber, target.user, interaction.user, reason, { deleteDays });
        await postToModLog(interaction.guild, cfg, embed);

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },
};
