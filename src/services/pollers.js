/**
 * Background pollers for Twitch live alerts and YouTube upload alerts.
 * Called once in index.js client.once('ready').
 */
const { EmbedBuilder } = require('discord.js');
const { getAllTwitchSubs, setTwitchLastStream, getAllYoutubeSubs, setYoutubeLastVideo } = require('../utils/db.js');
const { getLiveStreams } = require('./twitch.js');
const { getLatestVideoAPI } = require('./youtube.js');

const TWITCH_INTERVAL  = 15_000;
const YOUTUBE_INTERVAL = 60_000;
const MAX_BACKOFF      = 10;    // caps at 2^10 skipped ticks (~15 min Twitch, ~17 hr YouTube at max)

let twitchFailures  = 0;
let twitchTick      = 0;
let youtubeFailures = 0;
let youtubeTick     = 0;

// ── Twitch poller ─────────────────────────────────────────────────────────────
function buildTwitchEmbed(stream) {
    const thumbnail = (stream.thumbnail_url || '')
        .replace('{width}', '1280')
        .replace('{height}', '720');

    return new EmbedBuilder()
        .setTitle(`🟥 ${stream.user_name} is live on Twitch!`)
        .setURL(`https://twitch.tv/${stream.user_login}`)
        .setDescription(
            `**${stream.title || 'Untitled stream'}**\n` +
            `🎮 Playing: **${stream.game_name || 'Unknown'}**\n` +
            `👀 ${(stream.viewer_count ?? 0).toLocaleString()} viewers`
        )
        .setImage(thumbnail || null)
        .setColor('#9146FF')
        .setTimestamp(new Date(stream.started_at))
        .setFooter({ text: 'Twitch • Sigil Alerts' });
}

async function runTwitchPoller(client) {
    if (!process.env.TWITCH_CLIENT_ID || !process.env.TWITCH_CLIENT_SECRET) return;

    // Exponential backoff: skip ticks after repeated failures
    if (twitchFailures > 0) {
        const skipTicks = Math.min(2 ** (twitchFailures - 1), 2 ** MAX_BACKOFF);
        twitchTick++;
        if (twitchTick < skipTicks) return;
        twitchTick = 0;
    }

    const subs = getAllTwitchSubs();
    if (!subs.length) return;

    const logins = [...new Set(subs.map(s => s.streamer_login))];
    let liveStreams;
    try {
        liveStreams = await getLiveStreams(logins);
        twitchFailures = 0;
    } catch (err) {
        twitchFailures = Math.min(twitchFailures + 1, MAX_BACKOFF);
        console.error(`[Twitch Poller] API error (backoff x${twitchFailures}):`, err.message);
        return;
    }

    for (const sub of subs) {
        const stream = liveStreams.get(sub.streamer_login);
        if (!stream) continue;
        if (stream.id === sub.last_stream_id) continue;

        setTwitchLastStream(sub.guild_id, sub.streamer_login, stream.id);

        try {
            const channel = await client.channels.fetch(sub.post_channel_id);
            if (!channel?.isTextBased()) continue;
            const embed   = buildTwitchEmbed(stream);
            const content = sub.live_message
                ? sub.live_message.replace('{streamer}', stream.user_name)
                : `🟥 **${stream.user_name}** just went live!`;
            await channel.send({ content, embeds: [embed] });
        } catch (err) {
            console.error(`[Twitch Poller] Failed to post for ${sub.streamer_login}:`, err.message);
        }
    }
}

// ── YouTube poller ──────────────────────────────────────────────────────────
function buildYoutubeEmbed(video) {
    return new EmbedBuilder()
        .setTitle(`📥 ${video.author} uploaded a new video!`)
        .setURL(video.url)
        .setDescription(`**${video.title}**`)
        .setImage(video.thumbnail || null)
        .setColor('#FF0000')
        .setTimestamp()
        .setFooter({ text: 'YouTube • Sigil Alerts' });
}

async function runYoutubePoller(client) {
    // Exponential backoff
    if (youtubeFailures > 0) {
        const skipTicks = Math.min(2 ** (youtubeFailures - 1), 2 ** MAX_BACKOFF);
        youtubeTick++;
        if (youtubeTick < skipTicks) return;
        youtubeTick = 0;
    }

    const subs = getAllYoutubeSubs();
    if (!subs.length) return;

    let anyError = false;
    for (const sub of subs) {
        let video;
        try {
            video = await getLatestVideoAPI(sub.yt_channel_id);
        } catch (err) {
            anyError = true;
            console.error(`[YouTube Poller] Error for ${sub.yt_channel_id}:`, err.message);
            continue;
        }

        if (!video) continue;
        if (video.videoId === sub.last_video_id) continue;

        setYoutubeLastVideo(sub.guild_id, sub.yt_channel_id, video.videoId);

        // Skip first-run to avoid spamming old videos on bot startup
        if (!sub.last_video_id) continue;

        try {
            const channel = await client.channels.fetch(sub.post_channel_id);
            if (!channel?.isTextBased()) continue;
            const embed = buildYoutubeEmbed(video);
            await channel.send({
                content: `📥 **${video.author}** just uploaded: **${video.title}**`,
                embeds: [embed],
            });
        } catch (err) {
            console.error(`[YouTube Poller] Failed to post for ${sub.yt_channel_id}:`, err.message);
        }
    }

    youtubeFailures = anyError ? Math.min(youtubeFailures + 1, MAX_BACKOFF) : 0;
}

// ── Start ───────────────────────────────────────────────────────────────────
function startPollers(client) {
    setTimeout(() => {
        runTwitchPoller(client);
        setInterval(() => runTwitchPoller(client), TWITCH_INTERVAL);
    }, 5_000);

    setTimeout(() => {
        runYoutubePoller(client);
        setInterval(() => runYoutubePoller(client), YOUTUBE_INTERVAL);
    }, 15_000);

    console.log('[Pollers] Twitch (15s) and YouTube (60s) pollers started.');
}

module.exports = { startPollers };
