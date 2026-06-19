const {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionFlagsBits,
} = require('discord.js');
const { addAutoRole, removeAutoRole, getAutoRoles } = require('../utils/db.js');

const VALID_TRIGGERS = ['join', 'boost'];

function parseTrigger(raw) {
    const t = raw.trim().toLowerCase();
    if (VALID_TRIGGERS.includes(t)) return t;
    const lvl = t.match(/^level:(\d+)$/);
    if (lvl) {
        const n = parseInt(lvl[1], 10);
        if (n >= 1 && n <= 500) return `level:${n}`;
    }
    return null;
}

module.exports.data = new SlashCommandBuilder()
    .setName('autorole')
    .setDescription('Manage automatic role assignment')
    .addSubcommand(sub => sub
        .setName('add')
        .setDescription('Add an auto-role rule')
        .addRoleOption(opt => opt.setName('role').setDescription('Role to assign').setRequired(true))
        .addStringOption(opt => opt
            .setName('trigger')
            .setDescription('When to assign: join | boost | level:<n> (e.g. level:5)')
            .setRequired(true)
        )
    )
    .addSubcommand(sub => sub
        .setName('remove')
        .setDescription('Remove an auto-role rule')
        .addRoleOption(opt => opt.setName('role').setDescription('Role to remove').setRequired(true))
        .addStringOption(opt => opt
            .setName('trigger')
            .setDescription('Trigger to remove: join | boost | level:<n>')
            .setRequired(true)
        )
    )
    .addSubcommand(sub => sub
        .setName('list')
        .setDescription('List all auto-role rules in this server')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles);

module.exports.execute = async function execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    if (sub === 'add') {
        const role = interaction.options.getRole('role');
        const triggerRaw = interaction.options.getString('trigger');
        const trigger = parseTrigger(triggerRaw);

        if (!trigger) {
            return interaction.reply({
                content: '❌ Invalid trigger. Use `join`, `boost`, or `level:<n>` (e.g. `level:5`). Level must be 1–500.',
                ephemeral: true,
            });
        }

        if (role.managed || role.id === interaction.guild.id) {
            return interaction.reply({ content: '❌ That role cannot be assigned by the bot.', ephemeral: true });
        }

        const botMember = interaction.guild.members.me;
        if (role.position >= botMember.roles.highest.position) {
            return interaction.reply({ content: '❌ That role is higher than my highest role. Please move my role above it.', ephemeral: true });
        }

        const existing = getAutoRoles(guildId).find(r => r.role_id === role.id && r.trigger === trigger);
        if (existing) {
            return interaction.reply({ content: `❌ <@&${role.id}> is already set to auto-assign on **${trigger}**.`, ephemeral: true });
        }

        addAutoRole(guildId, role.id, trigger);
        return interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setTitle('✅ Auto-Role Added')
                    .setDescription(`<@&${role.id}> will be assigned on trigger: **${trigger}**`)
                    .setColor('#43B581')
                    .setTimestamp(),
            ],
            ephemeral: true,
        });
    }

    if (sub === 'remove') {
        const role = interaction.options.getRole('role');
        const triggerRaw = interaction.options.getString('trigger');
        const trigger = parseTrigger(triggerRaw);

        if (!trigger) {
            return interaction.reply({
                content: '❌ Invalid trigger. Use `join`, `boost`, or `level:<n>`.',
                ephemeral: true,
            });
        }

        const removed = removeAutoRole(guildId, role.id, trigger);
        if (!removed) {
            return interaction.reply({ content: `❌ No auto-role rule found for <@&${role.id}> on trigger **${trigger}**.`, ephemeral: true });
        }

        return interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setTitle('🗑️ Auto-Role Removed')
                    .setDescription(`<@&${role.id}> will no longer be assigned on trigger: **${trigger}**`)
                    .setColor('#F04747')
                    .setTimestamp(),
            ],
            ephemeral: true,
        });
    }

    if (sub === 'list') {
        const rules = getAutoRoles(guildId);
        if (!rules.length) {
            return interaction.reply({ content: 'No auto-role rules configured for this server.', ephemeral: true });
        }

        const grouped = {};
        for (const r of rules) {
            if (!grouped[r.trigger]) grouped[r.trigger] = [];
            grouped[r.trigger].push(`<@&${r.role_id}>`);
        }

        const embed = new EmbedBuilder()
            .setTitle('⚙️ Auto-Role Rules')
            .setColor('#5865F2')
            .setFooter({ text: `Sigil • ${rules.length} rule${rules.length !== 1 ? 's' : ''}` })
            .setTimestamp();

        for (const [trigger, roles] of Object.entries(grouped)) {
            embed.addFields({ name: `Trigger: ${trigger}`, value: roles.join(', '), inline: false });
        }

        return interaction.reply({ embeds: [embed], ephemeral: true });
    }
};
