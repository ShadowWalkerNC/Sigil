const { EmbedBuilder } = require('discord.js');

const TYPE_META = {
    warn: { emoji: '⚠️', color: '#FFA500', label: 'Warned' },
    kick: { emoji: '👢', color: '#FF6B35', label: 'Kicked' },
    ban:  { emoji: '🔨', color: '#FF4444', label: 'Banned' },
};

/**
 * Build the standard mod case embed used in log channel + ephemeral confirm.
 */
function buildCaseEmbed(type, caseNumber, target, mod, reason, extra = {}) {
    const meta = TYPE_META[type];
    const embed = new EmbedBuilder()
        .setTitle(`${meta.emoji} ${meta.label} — Case #${caseNumber}`)
        .setColor(meta.color)
        .addFields(
            { name: 'User',      value: `<@${target.id}> (\`${target.tag}\`)`, inline: true  },
            { name: 'Moderator', value: `<@${mod.id}>`,                         inline: true  },
            { name: '\u200b',    value: '\u200b',                               inline: true  },
            { name: 'Reason',    value: reason,                                 inline: false },
        )
        .setThumbnail(target.displayAvatarURL?.({ size: 64 }) ?? null)
        .setTimestamp()
        .setFooter({ text: `Sigil Mod • Case #${caseNumber}` });

    if (extra.deleteDays !== undefined) {
        embed.addFields({ name: 'Messages Deleted', value: `${extra.deleteDays}d`, inline: true });
    }

    return embed;
}

/**
 * Post the case embed to the guild's mod log channel if configured.
 */
async function postToModLog(guild, cfg, embed) {
    if (!cfg.mod_log_channel) return;
    try {
        const channel = await guild.channels.fetch(cfg.mod_log_channel);
        if (channel?.isTextBased()) await channel.send({ embeds: [embed] });
    } catch { /* channel deleted or no perms — fail silently */ }
}

/**
 * Attempt to DM the target user before the action is taken.
 */
async function dmTarget(member, type, reason, guild) {
    const meta = TYPE_META[type];
    try {
        const embed = new EmbedBuilder()
            .setTitle(`${meta.emoji} You have been ${meta.label.toLowerCase()} from ${guild.name}`)
            .setColor(meta.color)
            .addFields({ name: 'Reason', value: reason })
            .setTimestamp()
            .setFooter({ text: 'Sigil Mod' });
        await member.send({ embeds: [embed] });
    } catch { /* DMs closed — fail silently */ }
}

module.exports = { buildCaseEmbed, postToModLog, dmTarget, TYPE_META };
