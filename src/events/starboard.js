const { Events, EmbedBuilder } = require('discord.js');
const { getConfig, getStarboardEntry, setStarboardEntry } = require('../utils/db.js');

// ── Shared helpers ────────────────────────────────────────────────────────────

function buildEmbed(msg, emoji, count) {
    const embed = new EmbedBuilder()
        .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() })
        .setColor('#FAA61A')
        .setTimestamp(msg.createdAt)
        .setFooter({ text: `Message ID: ${msg.id}` });

    if (msg.content) embed.setDescription(msg.content.slice(0, 2048));

    const img = msg.attachments.find(a => a.contentType?.startsWith('image/'));
    if (img) embed.setImage(img.url);

    embed.addFields({ name: '\u200b', value: `[Jump to message](${msg.url})`, inline: false });
    return embed;
}

function matchesEmoji(reaction, emoji) {
    const reactionName = reaction.emoji.id
        ? `<:${reaction.emoji.name}:${reaction.emoji.id}>`
        : reaction.emoji.name;
    return reactionName === emoji;
}

async function resolveReaction(reaction) {
    if (reaction.partial) {
        try { await reaction.fetch(); } catch { return false; }
    }
    if (reaction.message.partial) {
        try { await reaction.message.fetch(); } catch { return false; }
    }
    return true;
}

// ── MessageReactionAdd ────────────────────────────────────────────────────────

module.exports = [
    {
        name: Events.MessageReactionAdd,
        async execute(reaction, user, client) {
            if (user.bot) return;
            if (!await resolveReaction(reaction)) return;

            const msg = reaction.message;
            if (!msg.guild) return;

            const cfg = getConfig(msg.guild.id);
            if (!cfg.starboard_enabled || !cfg.starboard_channel) return;
            if (msg.channelId === cfg.starboard_channel) return;

            const ignored = cfg.starboard_ignored ? JSON.parse(cfg.starboard_ignored) : [];
            if (ignored.includes(msg.channelId)) return;

            const emoji     = cfg.starboard_emoji     ?? '⭐';
            const threshold = cfg.starboard_threshold ?? 3;

            if (!matchesEmoji(reaction, emoji)) return;

            // Prevent self-starring
            if (msg.author.id === user.id) return;

            const count = reaction.count;
            if (count < threshold) return;

            const sbChannel = await client.channels.fetch(cfg.starboard_channel).catch(() => null);
            if (!sbChannel?.isTextBased()) return;

            const existing = getStarboardEntry(msg.guild.id, msg.id);
            const embed    = buildEmbed(msg, emoji, count);
            const content  = `${emoji} **${count}** | <#${msg.channelId}>`;

            if (existing?.sb_message_id) {
                const sbMsg = await sbChannel.messages.fetch(existing.sb_message_id).catch(() => null);
                if (sbMsg) await sbMsg.edit({ content, embeds: [embed] }).catch(() => {});
            } else {
                const posted = await sbChannel.send({ content, embeds: [embed] }).catch(() => null);
                if (posted) setStarboardEntry(msg.guild.id, msg.id, posted.id);
            }
        },
    },

    // ── MessageReactionRemove ─────────────────────────────────────────────────
    {
        name: Events.MessageReactionRemove,
        async execute(reaction, user, client) {
            if (user.bot) return;
            if (!await resolveReaction(reaction)) return;

            const msg = reaction.message;
            if (!msg.guild) return;

            const cfg = getConfig(msg.guild.id);
            if (!cfg.starboard_enabled || !cfg.starboard_channel) return;
            if (msg.channelId === cfg.starboard_channel) return;

            const emoji = cfg.starboard_emoji ?? '⭐';
            if (!matchesEmoji(reaction, emoji)) return;

            const existing = getStarboardEntry(msg.guild.id, msg.id);
            if (!existing?.sb_message_id) return;

            const sbChannel = await client.channels.fetch(cfg.starboard_channel).catch(() => null);
            if (!sbChannel?.isTextBased()) return;

            const count     = reaction.count;
            const threshold = cfg.starboard_threshold ?? 3;

            const sbMsg = await sbChannel.messages.fetch(existing.sb_message_id).catch(() => null);
            if (!sbMsg) return;

            if (count < threshold) {
                // Drop below threshold — remove from starboard
                await sbMsg.delete().catch(() => {});
                setStarboardEntry(msg.guild.id, msg.id, null);
            } else {
                // Still above threshold — update count
                const embed   = buildEmbed(msg, emoji, count);
                const content = `${emoji} **${count}** | <#${msg.channelId}>`;
                await sbMsg.edit({ content, embeds: [embed] }).catch(() => {});
            }
        },
    },

    // ── MessageDelete — clean up orphaned starboard posts ─────────────────────
    {
        name: Events.MessageDelete,
        async execute(message, client) {
            if (!message.guild) return;

            const cfg = getConfig(message.guild.id);
            if (!cfg.starboard_enabled || !cfg.starboard_channel) return;

            const existing = getStarboardEntry(message.guild.id, message.id);
            if (!existing?.sb_message_id) return;

            const sbChannel = await client.channels.fetch(cfg.starboard_channel).catch(() => null);
            if (!sbChannel?.isTextBased()) return;

            await sbChannel.messages.fetch(existing.sb_message_id)
                .then(m => m.delete())
                .catch(() => {});

            setStarboardEntry(message.guild.id, message.id, null);
        },
    },
];
