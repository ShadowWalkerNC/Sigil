const {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionFlagsBits,
} = require('discord.js');
const { getXP, getUserRank, countModCases, getModCases } = require('../utils/db.js');

const XP_PER_LEVEL = 100;
function xpForLevel(level) { return level * level * XP_PER_LEVEL; }
function xpProgress(xp) {
    let level = 0;
    while (xp >= xpForLevel(level + 1)) level++;
    const current = xp - xpForLevel(level);
    const needed  = xpForLevel(level + 1) - xpForLevel(level);
    return { level, current, needed };
}
function progressBar(current, needed, length = 12) {
    const filled = Math.round((current / needed) * length);
    return '█'.repeat(filled) + '░'.repeat(length - filled);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription('View detailed information about a user')
        .addUserOption(opt =>
            opt.setName('user')
                .setDescription('User to look up (defaults to you)')
                .setRequired(false)
        ),

    async execute(interaction) {
        await interaction.deferReply();

        const target = interaction.options.getMember('user') ?? interaction.member;
        const user   = target.user;
        const guild  = interaction.guild;

        // ─ Fetch full user to get banner ────────────────────────────────────────
        const fullUser = await user.fetch().catch(() => user);

        // ─ Dates ───────────────────────────────────────────────────────────────
        const createdTs = Math.floor(user.createdTimestamp / 1000);
        const joinedTs  = target.joinedTimestamp ? Math.floor(target.joinedTimestamp / 1000) : null;

        // ─ Roles (exclude @everyone, sort by position desc) ────────────────────
        const roles = [...target.roles.cache.values()]
            .filter(r => r.id !== guild.id)
            .sort((a, b) => b.position - a.position);
        const topRole    = roles[0] ?? null;
        const rolesStr   = roles.length
            ? roles.slice(0, 10).map(r => `<@&${r.id}>`).join(' ') + (roles.length > 10 ? ` +${roles.length - 10} more` : '')
            : '*None*';

        // ─ XP / Level ───────────────────────────────────────────────────────────
        const xpRow  = getXP(guild.id, user.id);
        const { level, current, needed } = xpProgress(xpRow.xp);
        const rank   = getUserRank(guild.id, user.id);
        const bar    = progressBar(current, needed);

        // ─ Mod cases ────────────────────────────────────────────────────────────
        const canSeeMod = interaction.member.permissions.has(PermissionFlagsBits.ModerateMembers);
        const caseCount = canSeeMod ? countModCases(guild.id, user.id) : null;
        const recentCases = canSeeMod && caseCount > 0
            ? getModCases(guild.id, user.id, 3)
            : [];

        // ─ Badges ───────────────────────────────────────────────────────────────
        const flagMap = {
            ActiveDeveloper:         '👨‍💻',
            BugHunterLevel1:         '🐛',
            BugHunterLevel2:         '🔷',
            CertifiedModerator:      '🛡️',
            HypeSquadOnlineHouse1:   '🏠',
            HypeSquadOnlineHouse2:   '🏠',
            HypeSquadOnlineHouse3:   '🏠',
            HypeSquadEvents:         '🎉',
            PremiumEarlySupporter:   '⭐',
            Staff:                   '🔧',
            Partner:                 '🤝',
            VerifiedDeveloper:       '✅',
        };
        const flags  = fullUser.flags?.toArray() ?? [];
        const badges = flags.map(f => flagMap[f] ?? '').filter(Boolean);
        if (target.premiumSince) badges.push('🚀'); // Nitro booster
        const badgeStr = badges.length ? badges.join(' ') : '*None*';

        // ─ Accent color fallback ────────────────────────────────────────────────────
        const color = topRole?.hexColor ?? fullUser.accentColor ?? '#5865F2';

        // ─ Build embed ────────────────────────────────────────────────────────────
        const embed = new EmbedBuilder()
            .setAuthor({ name: `${user.tag}`, iconURL: user.displayAvatarURL({ size: 64 }) })
            .setTitle(target.displayName !== user.username ? `${target.displayName}` : null)
            .setThumbnail(user.displayAvatarURL({ size: 256 }))
            .setColor(color)
            .addFields(
                { name: '🪪 User', value: `<@${user.id}>\n\`${user.id}\``, inline: true },
                { name: '🎖️ Top Role', value: topRole ? `<@&${topRole.id}>` : '*None*', inline: true },
                { name: '🏷️ Badges', value: badgeStr, inline: true },
                { name: '📅 Account Created', value: `<t:${createdTs}:D> (<t:${createdTs}:R>)`, inline: true },
                { name: '📥 Joined Server', value: joinedTs ? `<t:${joinedTs}:D> (<t:${joinedTs}:R>)` : 'Unknown', inline: true },
                { name: '\u200b', value: '\u200b', inline: true },
                {
                    name: `⚡ XP — Level ${level} (Rank #${rank})`,
                    value: `${bar} ${current}/${needed} XP\nTotal: **${xpRow.xp} XP**`,
                    inline: false,
                },
                { name: `🎭 Roles (${roles.length})`, value: rolesStr, inline: false },
            )
            .setFooter({ text: `Requested by ${interaction.user.tag}` })
            .setTimestamp();

        // Banner (if any)
        if (fullUser.bannerURL()) embed.setImage(fullUser.bannerURL({ size: 512 }));

        // Mod section — only visible to mods
        if (canSeeMod) {
            const caseLines = recentCases.length
                ? recentCases.map(c => `\`#${c.case_number}\` **${c.type}** — ${c.reason.slice(0, 40)}`).join('\n')
                : '*No cases found.*';
            embed.addFields(
                { name: `🔨 Mod Cases (${caseCount})`, value: caseLines, inline: false },
            );
        }

        await interaction.editReply({ embeds: [embed] });
    },
};
