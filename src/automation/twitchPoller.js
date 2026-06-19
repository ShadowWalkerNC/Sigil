/**
 * Twitch live poller — checks configured streamers every 2 minutes.
 * Uses the Twitch Helix "Get Streams" endpoint.
 * Requires env: TWITCH_CLIENT_ID, TWITCH_CLIENT_SECRET
 */
const { getGuildsWithFeature, setConfig } = require('../utils/db.js');
const { handleTwitchLive } = require('./webhookHandler.js');

const CLIENT_ID     = process.env.TWITCH_CLIENT_ID;
const CLIENT_SECRET = process.env.TWITCH_CLIENT_SECRET;
const POLL_INTERVAL = 2 * 60 * 1000; // 2 minutes

let appToken     = null;
let tokenExpires = 0;

async function getAppToken() {
    if (appToken && Date.now() < tokenExpires) return appToken;
    const res  = await fetch(
        `https://id.twitch.tv/oauth2/token?client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&grant_type=client_credentials`,
        { method: 'POST' }
    );
    const data = await res.json();
    appToken     = data.access_token;
    tokenExpires = Date.now() + (data.expires_in - 60) * 1000;
    return appToken;
}

async function fetchLiveStreams(logins) {
    if (!logins.length) return [];
    const token   = await getAppToken();
    const query   = logins.map(l => `user_login=${encodeURIComponent(l)}`).join('&');
    const res     = await fetch(`https://api.twitch.tv/helix/streams?${query}`, {
        headers: { 'Client-ID': CLIENT_ID, 'Authorization': `Bearer ${token}` },
    });
    const data = await res.json();
    return data.data || [];
}

async function tick(client) {
    const guilds = getGuildsWithFeature('twitch_enabled');
    for (const cfg of guilds) {
        try {
            if (!cfg.twitch_channel || !cfg.twitch_streamers) continue;
            const logins  = JSON.parse(cfg.twitch_streamers || '[]');
            if (!logins.length) continue;

            const streams = await fetchLiveStreams(logins);
            const seen    = new Set(JSON.parse(cfg.twitch_last_stream_id || '[]'));
            const newSeen = new Set(seen);

            for (const stream of streams) {
                if (seen.has(stream.id)) continue; // already notified
                newSeen.add(stream.id);

                await handleTwitchLive({
                    guildId:      cfg.guild_id,
                    streamer:     stream.user_name,
                    title:        stream.title,
                    game:         stream.game_name,
                    thumbnailURL: stream.thumbnail_url?.replace('{width}', '640').replace('{height}', '360'),
                    streamURL:    `https://twitch.tv/${stream.user_login}`,
                    client,
                });
            }

            // Prune IDs for streams that are no longer live to avoid unbounded growth
            const liveIds = new Set(streams.map(s => s.id));
            const pruned  = [...newSeen].filter(id => liveIds.has(id));
            setConfig(cfg.guild_id, { twitch_last_stream_id: JSON.stringify(pruned) });

        } catch (err) {
            console.error(`[twitchPoller] Guild ${cfg.guild_id}:`, err.message);
        }
    }
}

function startTwitchPoller(client) {
    if (!CLIENT_ID || !CLIENT_SECRET) {
        console.warn('[twitchPoller] TWITCH_CLIENT_ID / TWITCH_CLIENT_SECRET not set — Twitch poller disabled.');
        return;
    }
    tick(client);
    setInterval(() => tick(client), POLL_INTERVAL);
    console.log('[twitchPoller] Started (2 min interval)');
}

module.exports = { startTwitchPoller };
