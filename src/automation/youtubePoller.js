/**
 * YouTube upload poller — checks configured channels every 15 minutes.
 * Uses the YouTube Data API v3 "Search" endpoint (free tier: 10,000 units/day).
 * Requires env: YOUTUBE_API_KEY
 */
const { getGuildsWithFeature, setConfig } = require('../utils/db.js');
const { handleYouTubeUpload } = require('./webhookHandler.js');

const YT_API_KEY    = process.env.YOUTUBE_API_KEY;
const POLL_INTERVAL = 15 * 60 * 1000; // 15 minutes

/**
 * Resolves a YouTube handle (@channel) or channel ID to a numeric channel ID.
 */
async function resolveChannelId(handleOrId) {
    // If it already looks like a UC... channel ID, use it directly
    if (/^UC[\w-]{22}$/.test(handleOrId)) return handleOrId;

    const handle = handleOrId.startsWith('@') ? handleOrId.slice(1) : handleOrId;
    const url    = `https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=${encodeURIComponent(handle)}&key=${YT_API_KEY}`;
    const res    = await fetch(url);
    const data   = await res.json();
    return data.items?.[0]?.id || null;
}

async function fetchLatestVideo(channelId) {
    const url  = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&order=date&maxResults=1&type=video&key=${YT_API_KEY}`;
    const res  = await fetch(url);
    const data = await res.json();
    const item = data.items?.[0];
    if (!item) return null;
    return {
        videoId:      item.id.videoId,
        title:        item.snippet.title,
        channelTitle: item.snippet.channelTitle,
        thumbnailURL: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url,
        videoURL:     `https://www.youtube.com/watch?v=${item.id.videoId}`,
    };
}

async function tick(client) {
    const guilds = getGuildsWithFeature('youtube_enabled');
    for (const cfg of guilds) {
        try {
            if (!cfg.youtube_channel || !cfg.youtube_handles) continue;
            const handles = JSON.parse(cfg.youtube_handles || '[]');
            if (!handles.length) continue;

            const lastSeen = new Set(JSON.parse(cfg.youtube_last_video_id || '[]'));
            const newSeen  = new Set(lastSeen);

            for (const handle of handles) {
                const channelId = await resolveChannelId(handle);
                if (!channelId) {
                    console.warn(`[youtubePoller] Could not resolve channel: ${handle}`);
                    continue;
                }

                const video = await fetchLatestVideo(channelId);
                if (!video || lastSeen.has(video.videoId)) continue;

                newSeen.add(video.videoId);

                await handleYouTubeUpload({
                    guildId:      cfg.guild_id,
                    channelName:  video.channelTitle,
                    videoTitle:   video.title,
                    videoURL:     video.videoURL,
                    thumbnailURL: video.thumbnailURL,
                    client,
                });
            }

            setConfig(cfg.guild_id, { youtube_last_video_id: JSON.stringify([...newSeen].slice(-50)) });

        } catch (err) {
            console.error(`[youtubePoller] Guild ${cfg.guild_id}:`, err.message);
        }
    }
}

function startYouTubePoller(client) {
    if (!YT_API_KEY) {
        console.warn('[youtubePoller] YOUTUBE_API_KEY not set — YouTube poller disabled.');
        return;
    }
    tick(client);
    setInterval(() => tick(client), POLL_INTERVAL);
    console.log('[youtubePoller] Started (15 min interval)');
}

module.exports = { startYouTubePoller };
