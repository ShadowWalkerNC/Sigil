const {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionFlagsBits,
} = require('discord.js');
const { addAutoRole, removeAutoRole, getAutoRoles } = require('../utils/db.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('levelroles')
        .setDescription('Configure roles automatically awarded at XP levels')
        .addSubcommand(sub => sub
            .setName('add')
            .setDescription('Award a role when a member reaches a level')
            .addIntegerOption(opt => opt.setName('level').setDescription('Level that triggers the role (1–500)').setMinValue(1).setMaxValue(500).setRequired(true))
            .addRoleOption(opt => opt.setName('role').setDescription('Role to assign').setRequired(true))
        )
        .addSubcommand(sub => sub
            .setName('remove')
            .setDescription('Remove a level role reward')
            .addIntegerOption(opt => opt.setName('level').setDescription('Level trigger to remove').setMinValue(1).setMaxValue(500).setRequired(true))
            .addRoleOption(opt => opt.setName('role').setDescription('Role to remove from this level').setRequired(true))
        )
        .addSubcommand(sub => sub
            .setName('list')
            .setDescription('Show all configured level role rewards')
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

    async execute(interaction) {
        const sub     = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        if (sub === 'add') {
            const level = interaction.options.getInteger('level');
            const role  = interaction.options.getRole('role');

            if (role.managed) {
                return interaction.reply({ content: '❌ Cannot assign managed/integration roles.', ephemeral: true });
            }
            if (role.id === interaction.guild.id) {
                return interaction.reply({ content: '❌ Cannot assign @everyone.', ephemeral: true });
            }
            if (role.position >= interaction.guild.members.me.roles.highest.position) {
                return interaction.reply({ content: '❌ That role is higher than my highest role — I can\'t assign it.', ephemeral: true });
            }

            addAutoRole(guildId, role.id, `level:${level}`);

            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('✅ Level Role Added')
                        .setDescription(`<@&${role.id}> will be awarded when a member reaches **Level ${level}**.`)
                        .setColor('#39FF14')
                        .setTimestamp(),
                ],
                ephemeral: true,
            });
        }

        if (sub === 'remove') {
            const level   = interaction.options.getInteger('level');
            const role    = interaction.options.getRole('role');
            const removed = removeAutoRole(guildId, role.id, `level:${level}`);

            if (!removed) {
                return interaction.reply({ content: `❌ No level role found for <@&${role.id}> at Level ${level}.`, ephemeral: true });
            }

            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('🗑️ Level Role Removed')
                        .setDescription(`<@&${role.id}> will no longer be awarded at **Level ${level}**.`)
                        .setColor('#F04747')
                        .setTimestamp(),
                ],
                ephemeral: true,
            });
        }

        if (sub === 'list') {
            const all    = getAutoRoles(guildId).filter(r => r.trigger.startsWith('level:'));
            if (!all.length) {
                return interaction.reply({ content: '📋 No level role rewards configured yet.\nUse `/levelroles add` to set one up.', ephemeral: true });
            }

            // Group by level, sort ascending
            const grouped = {};
            for (const r of all) {
                const lvl = r.trigger.replace('level:', '');
                if (!grouped[lvl]) grouped[lvl] = [];
                grouped[lvl].push(r.role_id);
            }
            const lines = Object.entries(grouped)
                .sort(([a], [b]) => Number(a) - Number(b))
                .map(([lvl, roleIds]) => `**Level ${lvl}** — ${roleIds.map(id => `<@&${id}>`).join(', ')}`);

            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('🏆 Level Role Rewards')
                        .setDescription(lines.join('\n'))
                        .setColor('#5865F2')
                        .setFooter({ text: `${all.length} role reward${all.length !== 1 ? 's' : ''} configured` })
                        .setTimestamp(),
                ],
                ephemeral: true,
            });
        }
    },
};
