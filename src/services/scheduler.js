/**
 * Scheduled post runner + poll auto-closer + giveaway auto-closer + bump reminder. Fires every 60s.
 */
const { EmbedBuilder } = require('discord.js');
const {
    getDueScheduledPosts, deleteScheduledPost,
    getExpiredPolls, getExpiredGiveaways,
    getGuildsWithFeature, getConfig, setConfig,
} = require('../utils/db.js');

const BUMP_COOLDOWN_MS  = 2 * 60 * 60 * 1000; // 2 hours
const DISBOARD_BOT_ID   = '302050872383242240';

async function runBumpReminders(client) {
    const guilds = getGuildsWithFeature('bump_enabled');
    for (const cfg of guilds) {
        if (!cfg.bump_channel || !cfg.bump_last_bump_at) continue;

        const lastBump     = new Date(cfg.bump_last_bump_at).getTime();
        const lastReminded = cfg.bump_last_reminded_at ? new Date(cfg.bump_last_reminded_at).getTime() : 0;
        const now          = Date.now();

        // Only remind once per bump cycle: 2h must have passed since bump AND not yet reminded after this bump
        if (now - lastBump < BUMP_COOLDOWN_MS) continue;
        if (lastReminded > lastBump) continue;

        try {
            const channel = await client.channels.fetch(cfg.bump_channel).catch(() => null);
            if (!channel?.isTextBased()) continue;

            const text = cfg.bump_message ?? '📨 Time to bump the server! Use **/bump** on DISBOARD to keep us in the rankings.';

            await channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('⏰ Bump Reminder')
                        .setDescription(text)
                        .setColor('#5865F2')
                        .setFooter({ text: 'Bump with /bump • Next reminder in 2h after next bump' })
                        .setTimestamp(),
                ],
            });

            setConfig(cfg.guild_id, { bump_last_reminded_at: new Date().toISOString() });
        } catch (err) {
            console.error(`[BumpReminder] Failed for guild ${cfg.guild_id}:`, err.message);
        }
    }
}

async function runScheduler(client) {
    // Scheduled posts
    const due = getDueScheduledPosts();
    for (const post of due) {
        deleteScheduledPost(post.id);
        try {
            const channel = await client.channels.fetch(post.channel_id);
            if (!channel?.isTextBased()) continue;
            const { text, title, color, imageUrl, footer } = post.payload;
            let embed = null;
            if (title || color || imageUrl) {
                embed = new EmbedBuilder().setColor(color ?? '#5865F2').setTimestamp();
                if (title) embed.setTitle(title);
                if (text)  embed.setDescription(text);
                if (imageUrl) embed.setImage(imageUrl);
                embed.setFooter({ text: footer ?? 'Sigil Scheduled Post' });
            }
            await channel.send({ content: embed ? undefined : (text ?? '\u200b'), embeds: embed ? [embed] : [] });
        } catch (err) {
            console.error(`[Scheduler] Failed to send post #${post.id}:`, err.message);
        }
    }

    // Polls
    const expiredPolls = getExpiredPolls();
    if (expiredPolls.length) {
        const { finalizePoll } = require('../commands/poll.js');
        for (const poll of expiredPolls) await finalizePoll(client, poll);
    }

    // Giveaways
    const expiredGiveaways = getExpiredGiveaways();
    if (expiredGiveaways.length) {
        const { finalizeGiveaway } = require('../commands/giveaway.js');
        for (const giveaway of expiredGiveaways) await finalizeGiveaway(client, giveaway);
    }

    // Bump reminders
    await runBumpReminders(client);
}

function startScheduler(client) {
    setTimeout(() => {
        runScheduler(client);
        setInterval(() => runScheduler(client), 60_000);
    }, 3_000);
    console.log('[Scheduler] Scheduled post + poll + giveaway + bump reminder runner started (60s interval).');
}

module.exports = { startScheduler };
