const { Events, EmbedBuilder } = require('discord.js');
const { getConfig, getStarboardEntry, setStarboardEntry } = require('../utils/db.js');

module.exports = {
    name: Events.MessageReactionAdd,
    async execute(reaction, user, client) {
        if (user.bot) return;
        if (reaction.partial) {
            try { await reaction.fetch(); } catch { return; }
        }
        if (reaction.message.partial) {
            try { await reaction.message.fetch(); } catch { return; }
        }

        const msg     = reaction.message;
        if (!msg.guild) return;

        const cfg     = getConfig(msg.guild.id);
        if (!cfg.starboard_enabled || !cfg.starboard_channel) return;
        if (msg.channelId === cfg.starboard_channel) return; // don't star starboard posts

        const ignored = cfg.starboard_ignored ? JSON.parse(cfg.starboard_ignored) : [];
        if (ignored.includes(msg.channelId)) return;

        const emoji     = cfg.starboard_emoji     ?? '⭐';
        const threshold = cfg.starboard_threshold ?? 3;

        // Match emoji (supports unicode + custom)
        const reactionName = reaction.emoji.id
            ? `<:${reaction.emoji.name}:${reaction.emoji.id}>`
            : reaction.emoji.name;
        if (reactionName !== emoji) return;

        const count = reaction.count;
        if (count < threshold) return;

        const sbChannel = await client.channels.fetch(cfg.starboard_channel).catch(() => null);
        if (!sbChannel?.isTextBased()) return;

        // Check if already posted
        const existing = getStarboardEntry(msg.guild.id, msg.id);

        const embed = buildEmbed(msg, emoji, count);
        const content = `${emoji} **${count}** | <#${msg.channelId}>`;

        if (existing?.sb_message_id) {
            // Update existing post
            const sbMsg = await sbChannel.messages.fetch(existing.sb_message_id).catch(() => null);
            if (sbMsg) {
                await sbMsg.edit({ content, embeds: [embed] }).catch(() => {});
            }
        } else {
            // First time — post it
            const posted = await sbChannel.send({ content, embeds: [embed] }).catch(() => null);
            if (posted) setStarboardEntry(msg.guild.id, msg.id, posted.id);
        }
    },
};

function buildEmbed(msg, emoji, count) {
    const embed = new EmbedBuilder()
        .setAuthor({ name: msg.author.tag, iconURL: msg.author.displayAvatarURL() })
        .setColor('#FAA61A')
        .setTimestamp(msg.createdAt)
        .setFooter({ text: `Message ID: ${msg.id}` });

    if (msg.content) embed.setDescription(msg.content.slice(0, 2048));

    // Attach first image if present
    const img = msg.attachments.find(a => a.contentType?.startsWith('image/'));
    if (img) embed.setImage(img.url);

    // Add jump link field
    embed.addFields({ name: '\u200b', value: `[Jump to message](${msg.url})`, inline: false });

    return embed;
}
