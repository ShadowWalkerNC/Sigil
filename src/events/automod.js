const { Events, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getConfig } = require('../utils/db.js');

// In-memory spam tracker: Map<guildId_userId, { count, resetAt }>
const spamTracker = new Map();

// Sweep stale entries every 60s to prevent memory leak
setInterval(() => {
    const now = Date.now();
    for (const [key, val] of spamTracker) {
        if (now > val.resetAt) spamTracker.delete(key);
    }
}, 60_000);

const URL_PATTERN = /https?:\/\/[^\s]+|discord\.gg\/[^\s]+|www\.[^\s]+/gi;

module.exports = {
    name: Events.MessageCreate,
    async execute(message, client) {
        if (!message.guild || message.author.bot) return;
        if (!message.member) return;

        const cfg = getConfig(message.guild.id);

        // Bypass: admins + configured bypass role always skip
        const isAdmin   = message.member.permissions.has(PermissionFlagsBits.ManageMessages);
        const hasBypass = cfg.automod_bypass_role && message.member.roles.cache.has(cfg.automod_bypass_role);
        if (isAdmin || hasBypass) return;

        const actions = [];

        // ── 1. Anti-Spam ──────────────────────────────────────────────────────
        if (cfg.automod_anti_spam) {
            const key       = `${message.guild.id}_${message.author.id}`;
            const threshold = cfg.automod_spam_threshold ?? 5;
            const now       = Date.now();
            let tracker     = spamTracker.get(key) ?? { count: 0, resetAt: now + 5000 };

            if (now > tracker.resetAt) tracker = { count: 0, resetAt: now + 5000 };
            tracker.count++;
            spamTracker.set(key, tracker);

            if (tracker.count >= threshold) {
                tracker.count = 0;
                actions.push({ rule: 'Anti-Spam', detail: `${threshold}+ messages in 5 seconds` });
            }
        }

        // ── 2. Anti-Links ─────────────────────────────────────────────────────
        if (cfg.automod_anti_links) {
            // Create a fresh regex instance each time to avoid lastIndex state bugs
            const urlRegex = new RegExp(URL_PATTERN.source, 'gi');
            if (urlRegex.test(message.content)) {
                const allowed = cfg.automod_allowed_domains ? JSON.parse(cfg.automod_allowed_domains) : [];
                const urls    = message.content.match(new RegExp(URL_PATTERN.source, 'gi')) ?? [];
                const blocked = urls.filter(url => !allowed.some(d => url.toLowerCase().includes(d)));
                if (blocked.length) {
                    actions.push({ rule: 'Anti-Links', detail: 'Link posted by non-mod' });
                }
            }
        }

        // ── 3. Anti-Mentions ──────────────────────────────────────────────────
        if (cfg.automod_anti_mentions) {
            const threshold = cfg.automod_mention_threshold ?? 5;
            const total     = message.mentions.users.size + message.mentions.roles.size;
            if (total >= threshold) {
                actions.push({ rule: 'Anti-Mentions', detail: `${total} mentions in one message` });
            }
        }

        // ── 4. Anti-Caps ──────────────────────────────────────────────────────
        if (cfg.automod_anti_caps && message.content.length >= 8) {
            const threshold = cfg.automod_caps_threshold ?? 70;
            const letters   = message.content.replace(/[^a-zA-Z]/g, '');
            if (letters.length >= 6) {
                const upper = message.content.replace(/[^A-Z]/g, '').length;
                const pct   = Math.round((upper / letters.length) * 100);
                if (pct >= threshold) {
                    actions.push({ rule: 'Anti-Caps', detail: `${pct}% uppercase` });
                }
            }
        }

        // ── 5. Bad Words ──────────────────────────────────────────────────────
        if (cfg.automod_bad_words && cfg.automod_badwords) {
            const list    = JSON.parse(cfg.automod_badwords);
            const content = message.content.toLowerCase();
            const found   = list.find(w => content.includes(w));
            if (found) {
                actions.push({ rule: 'Bad Words', detail: `Matched word: ${found}` });
            }
        }

        if (!actions.length) return;

        // ── Take action: delete message + warn user ────────────────────────
        await message.delete().catch(() => {});

        const rule   = actions[0].rule;
        const detail = actions[0].detail;

        const warn = await message.channel.send({
            content: `<@${message.author.id}> Your message was removed — **${rule}**: ${detail}`,
        }).catch(() => null);

        // Auto-delete the warning after 6 seconds
        if (warn) setTimeout(() => warn.delete().catch(() => {}), 6000);

        // ── Log it ────────────────────────────────────────────────────────
        if (!cfg.automod_log_channel) return;
        const logCh = await client.channels.fetch(cfg.automod_log_channel).catch(() => null);
        if (!logCh?.isTextBased()) return;

        const embed = new EmbedBuilder()
            .setTitle('🛡️ AutoMod Action')
            .setColor('#FAA61A')
            .addFields(
                { name: 'User',    value: `<@${message.author.id}> (${message.author.tag})`, inline: true },
                { name: 'Channel', value: `<#${message.channelId}>`,                          inline: true },
                { name: 'Rule',    value: rule,                                                inline: true },
                { name: 'Detail',  value: detail,                                              inline: true },
                { name: 'Content', value: message.content?.slice(0, 512) || '*empty*' }
            )
            .setFooter({ text: `User ID: ${message.author.id}` })
            .setTimestamp();

        await logCh.send({ embeds: [embed] }).catch(() => {});
    },
};
