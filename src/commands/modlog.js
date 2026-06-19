const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { getModCases, countModCases } = require('../utils/db.js');
const { TYPE_META } = require('../utils/mod.js');

const PAGE_SIZE = 5;

function buildModLogEmbed(targetUser, cases, page, total) {
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const embed = new EmbedBuilder()
        .setTitle(`📋 Mod Log — ${targetUser.tag}`)
        .setColor('#5865F2')
        .setThumbnail(targetUser.displayAvatarURL({ size: 64 }))
        .setFooter({ text: `Sigil Mod • Page ${page + 1}/${totalPages} • ${total} case${total !== 1 ? 's' : ''} total` })
        .setTimestamp();

    if (cases.length === 0) {
        embed.setDescription('No mod cases found for this user.');
    } else {
        for (const c of cases) {
            const meta = TYPE_META[c.type] ?? { emoji: '❓' };
            embed.addFields({
                name:  `${meta.emoji} Case #${c.case_number} — ${c.type.toUpperCase()}`,
                value: `**Reason:** ${c.reason}\n**Mod:** <@${c.mod_id}>\n**Date:** <t:${Math.floor(new Date(c.created_at).getTime() / 1000)}:R>`,
                inline: false,
            });
        }
    }
    return embed;
}

function buildRow(page, total, targetId) {
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`modlog_prev_${targetId}_${page}`)
            .setLabel('◀ Prev')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page === 0),
        new ButtonBuilder()
            .setCustomId(`modlog_next_${targetId}_${page}`)
            .setLabel('Next ▶')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page >= totalPages - 1),
    );
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('modlog')
        .setDescription('View mod case history for a member')
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption(opt => opt.setName('user').setDescription('Member to look up').setRequired(true)),

    async execute(interaction) {
        const targetUser = interaction.options.getUser('user');
        const guildId    = interaction.guild.id;
        const page       = 0;
        const total      = countModCases(guildId, targetUser.id);
        const cases      = getModCases(guildId, targetUser.id, PAGE_SIZE, page * PAGE_SIZE);

        const embed = buildModLogEmbed(targetUser, cases, page, total);
        const row   = buildRow(page, total, targetUser.id);

        const reply = await interaction.reply({
            embeds: [embed],
            components: total > PAGE_SIZE ? [row] : [],
            ephemeral: true,
            fetchReply: true,
        });

        if (total <= PAGE_SIZE) return;

        const collector = reply.createMessageComponentCollector({ time: 120_000 });

        collector.on('collect', async btn => {
            if (btn.user.id !== interaction.user.id) {
                return btn.reply({ content: 'Only the command user can paginate.', ephemeral: true });
            }

            const parts   = btn.customId.split('_');
            let newPage    = parseInt(parts[parts.length - 1], 10);
            if (btn.customId.startsWith('modlog_next')) newPage += 1;
            else newPage -= 1;

            const newCases = getModCases(guildId, targetUser.id, PAGE_SIZE, newPage * PAGE_SIZE);
            const newEmbed = buildModLogEmbed(targetUser, newCases, newPage, total);
            const newRow   = buildRow(newPage, total, targetUser.id);

            await btn.update({ embeds: [newEmbed], components: [newRow] });
        });

        collector.on('end', async () => {
            try { await reply.edit({ components: [] }); } catch { /* expired */ }
        });
    },
};
