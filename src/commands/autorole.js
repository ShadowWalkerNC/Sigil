const {
    SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits,
} = require('discord.js');
const Database = require('better-sqlite3');
const path     = require('path');

const db = new Database(path.join(__dirname, '../../data/sigil.db'));
db.exec(`
    CREATE TABLE IF NOT EXISTS autorole_config (
        guild_id TEXT NOT NULL,
        role_id  TEXT NOT NULL,
        PRIMARY KEY (guild_id, role_id)
    );
`);

const addRole    = db.prepare('INSERT OR IGNORE INTO autorole_config (guild_id, role_id) VALUES (?,?)');
const removeRole = db.prepare('DELETE FROM autorole_config WHERE guild_id = ? AND role_id = ?');
const getRoles   = db.prepare('SELECT role_id FROM autorole_config WHERE guild_id = ?');
const clearAll   = db.prepare('DELETE FROM autorole_config WHERE guild_id = ?');

async function applyAutoRoles(member) {
    const rows = getRoles.all(member.guild.id);
    if (!rows.length) return;
    for (const row of rows) {
        const role = member.guild.roles.cache.get(row.role_id);
        if (role) await member.roles.add(role).catch(() => {});
    }
}

module.exports = {
    applyAutoRoles,

    data: new SlashCommandBuilder()
        .setName('autorole')
        .setDescription('Assign roles automatically when someone joins')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
        .addSubcommand(sub =>
            sub.setName('add')
                .setDescription('Add a role to be auto-assigned on join')
                .addRoleOption(opt => opt.setName('role').setDescription('Role to add').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('remove')
                .setDescription('Remove a role from auto-assign')
                .addRoleOption(opt => opt.setName('role').setDescription('Role to remove').setRequired(true))
        )
        .addSubcommand(sub => sub.setName('list').setDescription('View all auto-assigned roles'))
        .addSubcommand(sub => sub.setName('clear').setDescription('Remove all auto-assigned roles')),

    async execute(interaction) {
        const sub  = interaction.options.getSubcommand();
        const gId  = interaction.guild.id;

        if (sub === 'add') {
            const role = interaction.options.getRole('role');
            if (role.managed) return interaction.reply({ content: '\u274C Cannot auto-assign bot-managed roles.', ephemeral: true });
            addRole.run(gId, role.id);
            return interaction.reply({ content: `\u2705 <@&${role.id}> will now be assigned to all new members.`, ephemeral: true });
        }

        if (sub === 'remove') {
            const role = interaction.options.getRole('role');
            removeRole.run(gId, role.id);
            return interaction.reply({ content: `\u2705 <@&${role.id}> removed from auto-assign.`, ephemeral: true });
        }

        if (sub === 'clear') {
            clearAll.run(gId);
            return interaction.reply({ content: '\u2705 All auto-assign roles cleared.', ephemeral: true });
        }

        if (sub === 'list') {
            const rows = getRoles.all(gId);
            if (!rows.length) return interaction.reply({ content: 'No auto-assign roles configured.', ephemeral: true });
            const lines = rows.map(r => `<@&${r.role_id}>`);
            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setTitle('\uD83C\uDF9F\uFE0F Auto-Assigned Roles')
                    .setDescription(lines.join('\n'))
                    .setColor('#5865F2')
                    .setFooter({ text: `Sigil \u2022 ${interaction.guild.name}` })],
                ephemeral: true,
            });
        }
    },
};
