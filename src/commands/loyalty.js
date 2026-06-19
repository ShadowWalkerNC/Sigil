const {
    SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits,
} = require('discord.js');
const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../../data/sigil.db'));

// Init loyalty table
db.exec(`
    CREATE TABLE IF NOT EXISTS loyalty (
        guild_id TEXT NOT NULL,
        user_id  TEXT NOT NULL,
        points   INTEGER NOT NULL DEFAULT 0,
        total    INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (guild_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS loyalty_tiers (
        guild_id   TEXT NOT NULL,
        name       TEXT NOT NULL,
        threshold  INTEGER NOT NULL,
        role_id    TEXT,
        PRIMARY KEY (guild_id, name)
    );
`);

// Prepared statements
const getUser    = db.prepare('SELECT * FROM loyalty WHERE guild_id = ? AND user_id = ?');
const upsertUser = db.prepare(`
    INSERT INTO loyalty (guild_id, user_id, points, total)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(guild_id, user_id) DO UPDATE SET
        points = points + excluded.points,
        total  = total  + excluded.points
`);
const deductPoints = db.prepare('UPDATE loyalty SET points = MAX(0, points - ?) WHERE guild_id = ? AND user_id = ?');
const resetPoints  = db.prepare('UPDATE loyalty SET points = 0 WHERE guild_id = ? AND user_id = ?');
const getTop       = db.prepare('SELECT user_id, points, total FROM loyalty WHERE guild_id = ? ORDER BY points DESC LIMIT 10');
const getTier      = db.prepare('SELECT * FROM loyalty_tiers WHERE guild_id = ? AND threshold <= ? ORDER BY threshold DESC LIMIT 1');
const upsertTier   = db.prepare(`
    INSERT INTO loyalty_tiers (guild_id, name, threshold, role_id)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(guild_id, name) DO UPDATE SET threshold = excluded.threshold, role_id = excluded.role_id
`);
const getTiers     = db.prepare('SELECT * FROM loyalty_tiers WHERE guild_id = ? ORDER BY threshold ASC');

async function checkAndAwardTier(interaction, guildId, userId, points) {
    const tier = getTier.get(guildId, points);
    if (!tier || !tier.role_id) return;
    const member = await interaction.guild.members.fetch(userId).catch(() => null);
    if (!member) return;
    const role = interaction.guild.roles.cache.get(tier.role_id);
    if (role && !member.roles.cache.has(tier.role_id)) {
        await member.roles.add(role, `Loyalty tier: ${tier.name}`).catch(() => {});
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('loyalty')
        .setDescription('Manage the loyalty points system')
        .addSubcommand(sub =>
            sub.setName('add')
                .setDescription('Add points to a member')
                .addUserOption(opt => opt.setName('member').setDescription('Member to reward').setRequired(true))
                .addIntegerOption(opt => opt.setName('points').setDescription('Points to add').setRequired(true).setMinValue(1))
                .addStringOption(opt => opt.setName('reason').setDescription('Reason for points').setRequired(false))
        )
        .addSubcommand(sub =>
            sub.setName('deduct')
                .setDescription('Deduct points from a member')
                .addUserOption(opt => opt.setName('member').setDescription('Member').setRequired(true))
                .addIntegerOption(opt => opt.setName('points').setDescription('Points to deduct').setRequired(true).setMinValue(1))
        )
        .addSubcommand(sub =>
            sub.setName('check')
                .setDescription('Check a member\'s loyalty points')
                .addUserOption(opt => opt.setName('member').setDescription('Member to check (defaults to you)').setRequired(false))
        )
        .addSubcommand(sub =>
            sub.setName('leaderboard')
                .setDescription('Show the top 10 loyalty point holders')
        )
        .addSubcommand(sub =>
            sub.setName('reset')
                .setDescription('Reset a member\'s current points to 0 (keeps lifetime total)')
                .addUserOption(opt => opt.setName('member').setDescription('Member to reset').setRequired(true))
        )
        .addSubcommand(sub =>
            sub.setName('tier')
                .setDescription('Create or update a loyalty reward tier')
                .addStringOption(opt => opt.setName('name').setDescription('Tier name (e.g. Gold, VIP)').setRequired(true))
                .addIntegerOption(opt => opt.setName('threshold').setDescription('Points needed to reach this tier').setRequired(true).setMinValue(1))
                .addRoleOption(opt => opt.setName('role').setDescription('Role to award at this tier').setRequired(false))
        )
        .addSubcommand(sub =>
            sub.setName('tiers')
                .setDescription('List all configured loyalty tiers')
        ),

    async execute(interaction) {
        const sub     = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        // ── ADD ────────────────────────────────────────────────────
        if (sub === 'add') {
            if (!interaction.memberPermissions.has('ManageRoles')) {
                return interaction.reply({ content: '\u274C You need **Manage Roles** to award points.', ephemeral: true });
            }
            const target = interaction.options.getUser('member');
            const pts    = interaction.options.getInteger('points');
            const reason = interaction.options.getString('reason');

            upsertUser.run(guildId, target.id, pts, pts);
            const row = getUser.get(guildId, target.id);
            await checkAndAwardTier(interaction, guildId, target.id, row.points);

            const embed = new EmbedBuilder()
                .setTitle('\uD83C\uDF1F Loyalty Points Added')
                .setColor('#FEE75C')
                .setDescription(
                    `\u2795 **+${pts} points** awarded to <@${target.id}>\n` +
                    (reason ? `\uD83D\uDCDD **Reason:** ${reason}\n` : '') +
                    `\n**Current balance:** ${row.points} pts\n**Lifetime total:** ${row.total} pts`
                )
                .setFooter({ text: `Sigil \u2022 Loyalty \u2022 ${interaction.guild.name}` })
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });
        }

        // ── DEDUCT ───────────────────────────────────────────────
        if (sub === 'deduct') {
            if (!interaction.memberPermissions.has('ManageRoles')) {
                return interaction.reply({ content: '\u274C You need **Manage Roles** to deduct points.', ephemeral: true });
            }
            const target = interaction.options.getUser('member');
            const pts    = interaction.options.getInteger('points');

            deductPoints.run(pts, guildId, target.id);
            const row = getUser.get(guildId, target.id);
            const balance = row?.points ?? 0;

            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setTitle('\uD83D\uDCC9 Points Deducted')
                    .setColor('#ED4245')
                    .setDescription(`\u2796 **-${pts} points** deducted from <@${target.id}>\n\n**Current balance:** ${balance} pts`)
                    .setFooter({ text: `Sigil \u2022 Loyalty \u2022 ${interaction.guild.name}` })
                    .setTimestamp()],
            });
        }

        // ── CHECK ────────────────────────────────────────────────
        if (sub === 'check') {
            const target = interaction.options.getUser('member') ?? interaction.user;
            const row    = getUser.get(guildId, target.id);
            const pts    = row?.points ?? 0;
            const total  = row?.total  ?? 0;
            const tier   = getTier.get(guildId, pts);

            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setTitle(`\uD83C\uDFC5 Loyalty Points \u2014 ${target.username}`)
                    .setColor('#5865F2')
                    .setDescription(
                        `**Current balance:** ${pts} pts\n` +
                        `**Lifetime total:** ${total} pts\n` +
                        (tier ? `**Current tier:** ${tier.name}${tier.role_id ? ` (<@&${tier.role_id}>)` : ''}` : '*No tier reached yet.*')
                    )
                    .setFooter({ text: `Sigil \u2022 Loyalty \u2022 ${interaction.guild.name}` })
                    .setTimestamp()],
                ephemeral: true,
            });
        }

        // ── LEADERBOARD ─────────────────────────────────────────
        if (sub === 'leaderboard') {
            const rows  = getTop.all(guildId);
            const medals = ['\uD83E\uDD47','\uD83E\uDD48','\uD83E\uDD49'];

            const desc = rows.length === 0
                ? '*No loyalty points recorded yet.*'
                : rows.map((r, i) =>
                    `${medals[i] ?? `**${i + 1}.**`} <@${r.user_id}> \u2014 **${r.points} pts** *(${r.total} lifetime)*`
                  ).join('\n');

            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setTitle(`\uD83C\uDF1F Loyalty Leaderboard \u2014 ${interaction.guild.name}`)
                    .setDescription(desc)
                    .setColor('#FEE75C')
                    .setFooter({ text: 'Sigil \u2022 Loyalty' })
                    .setTimestamp()],
            });
        }

        // ── RESET ────────────────────────────────────────────────
        if (sub === 'reset') {
            if (!interaction.memberPermissions.has('ManageRoles')) {
                return interaction.reply({ content: '\u274C You need **Manage Roles** to reset points.', ephemeral: true });
            }
            const target = interaction.options.getUser('member');
            resetPoints.run(guildId, target.id);
            return interaction.reply({
                content: `\u2705 Reset <@${target.id}>'s current points to **0**. Lifetime total preserved.`,
                ephemeral: true,
            });
        }

        // ── TIER (create/update) ───────────────────────────────
        if (sub === 'tier') {
            if (!interaction.memberPermissions.has('ManageGuild')) {
                return interaction.reply({ content: '\u274C You need **Manage Server** to configure tiers.', ephemeral: true });
            }
            const name      = interaction.options.getString('name');
            const threshold = interaction.options.getInteger('threshold');
            const role      = interaction.options.getRole('role');

            upsertTier.run(guildId, name, threshold, role?.id ?? null);

            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setTitle('\uD83C\uDFF7\uFE0F Loyalty Tier Saved')
                    .setColor('#57F287')
                    .setDescription(
                        `**Tier:** ${name}\n` +
                        `**Points required:** ${threshold}\n` +
                        (role ? `**Role awarded:** <@&${role.id}>` : '*No role configured.*')
                    )
                    .setFooter({ text: `Sigil \u2022 Loyalty \u2022 ${interaction.guild.name}` })
                    .setTimestamp()],
                ephemeral: true,
            });
        }

        // ── TIERS (list) ──────────────────────────────────────
        if (sub === 'tiers') {
            const rows = getTiers.all(guildId);
            const desc = rows.length === 0
                ? '*No tiers configured yet. Use `/loyalty tier` to create one.*'
                : rows.map(r =>
                    `\uD83C\uDFF7\uFE0F **${r.name}** \u2014 ${r.threshold} pts${r.role_id ? ` \u2192 <@&${r.role_id}>` : ''}`
                  ).join('\n');

            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setTitle(`\uD83C\uDFC5 Loyalty Tiers \u2014 ${interaction.guild.name}`)
                    .setDescription(desc)
                    .setColor('#5865F2')
                    .setFooter({ text: 'Sigil \u2022 Loyalty' })
                    .setTimestamp()],
                ephemeral: true,
            });
        }
    },
};
