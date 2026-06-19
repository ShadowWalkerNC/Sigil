const Database = require('better-sqlite3');
const path     = require('path');
const fs       = require('fs');

const DB_DIR  = path.join(__dirname, '../../data');
const DB_PATH = path.join(DB_DIR, 'sigil.db');

if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

const db = new Database(DB_PATH);

db.exec(`
    CREATE TABLE IF NOT EXISTS guild_config (
        guild_id                TEXT PRIMARY KEY,
        welcome_enabled         INTEGER DEFAULT 0,
        welcome_channel         TEXT,
        welcome_color           TEXT DEFAULT '#39FF14',
        welcome_bg              TEXT DEFAULT 'gradient-purple',
        welcome_font            TEXT DEFAULT 'Arial',
        goodbye_enabled         INTEGER DEFAULT 0,
        goodbye_channel         TEXT,
        milestone_enabled       INTEGER DEFAULT 0,
        milestone_channel       TEXT,
        boost_enabled           INTEGER DEFAULT 0,
        boost_channel           TEXT,
        stats_channel           TEXT,
        event_banner_enabled    INTEGER DEFAULT 0,
        event_banner_channel    TEXT,
        webhook_channel         TEXT,
        webhook_secret          TEXT,
        twitch_enabled          INTEGER DEFAULT 0,
        twitch_channel          TEXT,
        twitch_streamers        TEXT,
        twitch_last_stream_id   TEXT,
        youtube_enabled         INTEGER DEFAULT 0,
        youtube_channel         TEXT,
        youtube_handles         TEXT,
        youtube_last_video_id   TEXT,
        mod_log_channel         TEXT,
        xp_enabled              INTEGER DEFAULT 0,
        xp_channel              TEXT,
        xp_rate                 INTEGER DEFAULT 15,
        xp_cooldown             INTEGER DEFAULT 60,
        last_stats_at           TEXT,
        updated_at              TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS scheduled_posts (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id   TEXT NOT NULL,
        channel_id TEXT NOT NULL,
        post_at    TEXT NOT NULL,
        payload    TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS mod_cases (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id    TEXT NOT NULL,
        case_number INTEGER NOT NULL,
        type        TEXT NOT NULL,
        user_id     TEXT NOT NULL,
        user_tag    TEXT NOT NULL,
        mod_id      TEXT NOT NULL,
        mod_tag     TEXT NOT NULL,
        reason      TEXT NOT NULL,
        created_at  TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS user_xp (
        guild_id   TEXT NOT NULL,
        user_id    TEXT NOT NULL,
        xp         INTEGER DEFAULT 0,
        level      INTEGER DEFAULT 0,
        last_xp_at TEXT DEFAULT (datetime('now')),
        PRIMARY KEY (guild_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS twitch_subs (
        guild_id        TEXT NOT NULL,
        streamer_login  TEXT NOT NULL,
        streamer_name   TEXT NOT NULL,
        post_channel_id TEXT NOT NULL,
        live_message    TEXT,
        last_stream_id  TEXT,
        PRIMARY KEY (guild_id, streamer_login)
    );
    CREATE TABLE IF NOT EXISTS youtube_subs (
        guild_id        TEXT NOT NULL,
        yt_channel_id   TEXT NOT NULL,
        channel_name    TEXT NOT NULL,
        post_channel_id TEXT NOT NULL,
        last_video_id   TEXT,
        PRIMARY KEY (guild_id, yt_channel_id)
    );
    CREATE TABLE IF NOT EXISTS polls (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id   TEXT NOT NULL,
        channel_id TEXT NOT NULL,
        message_id TEXT,
        question   TEXT NOT NULL,
        options    TEXT NOT NULL,
        votes      TEXT NOT NULL DEFAULT '{}',
        ends_at    TEXT NOT NULL,
        closed     INTEGER DEFAULT 0,
        created_by TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS giveaways (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id     TEXT NOT NULL,
        channel_id   TEXT NOT NULL,
        message_id   TEXT,
        prize        TEXT NOT NULL,
        winner_count INTEGER NOT NULL,
        entries      TEXT NOT NULL DEFAULT '[]',
        ends_at      TEXT NOT NULL,
        ended        INTEGER DEFAULT 0,
        winners      TEXT NOT NULL DEFAULT '[]',
        host_id      TEXT NOT NULL,
        created_at   TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS auto_roles (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id   TEXT NOT NULL,
        role_id    TEXT NOT NULL,
        trigger    TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        UNIQUE(guild_id, role_id, trigger)
    );
    CREATE TABLE IF NOT EXISTS reaction_role_panels (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id    TEXT NOT NULL,
        channel_id  TEXT,
        message_id  TEXT,
        title       TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        created_by  TEXT NOT NULL,
        created_at  TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS reaction_role_buttons (
        id       INTEGER PRIMARY KEY AUTOINCREMENT,
        panel_id INTEGER NOT NULL REFERENCES reaction_role_panels(id) ON DELETE CASCADE,
        role_id  TEXT NOT NULL,
        label    TEXT NOT NULL,
        color    TEXT NOT NULL DEFAULT 'primary',
        UNIQUE(panel_id, role_id)
    );
`);

const existingCols = db.prepare('PRAGMA table_info(guild_config)').all().map(r => r.name);
const migrations = [
    ['event_banner_enabled',  'ALTER TABLE guild_config ADD COLUMN event_banner_enabled  INTEGER DEFAULT 0'],
    ['event_banner_channel',  'ALTER TABLE guild_config ADD COLUMN event_banner_channel  TEXT'],
    ['webhook_channel',       'ALTER TABLE guild_config ADD COLUMN webhook_channel        TEXT'],
    ['webhook_secret',        'ALTER TABLE guild_config ADD COLUMN webhook_secret         TEXT'],
    ['twitch_enabled',        'ALTER TABLE guild_config ADD COLUMN twitch_enabled         INTEGER DEFAULT 0'],
    ['twitch_channel',        'ALTER TABLE guild_config ADD COLUMN twitch_channel         TEXT'],
    ['twitch_streamers',      'ALTER TABLE guild_config ADD COLUMN twitch_streamers       TEXT'],
    ['twitch_last_stream_id', 'ALTER TABLE guild_config ADD COLUMN twitch_last_stream_id  TEXT'],
    ['youtube_enabled',       'ALTER TABLE guild_config ADD COLUMN youtube_enabled        INTEGER DEFAULT 0'],
    ['youtube_channel',       'ALTER TABLE guild_config ADD COLUMN youtube_channel        TEXT'],
    ['youtube_handles',       'ALTER TABLE guild_config ADD COLUMN youtube_handles        TEXT'],
    ['youtube_last_video_id', 'ALTER TABLE guild_config ADD COLUMN youtube_last_video_id  TEXT'],
    ['mod_log_channel',       'ALTER TABLE guild_config ADD COLUMN mod_log_channel        TEXT'],
    ['xp_enabled',            'ALTER TABLE guild_config ADD COLUMN xp_enabled             INTEGER DEFAULT 0'],
    ['xp_channel',            'ALTER TABLE guild_config ADD COLUMN xp_channel             TEXT'],
    ['xp_rate',               'ALTER TABLE guild_config ADD COLUMN xp_rate                INTEGER DEFAULT 15'],
    ['xp_cooldown',           'ALTER TABLE guild_config ADD COLUMN xp_cooldown            INTEGER DEFAULT 60'],
    ['last_stats_at',         'ALTER TABLE guild_config ADD COLUMN last_stats_at          TEXT'],
];
for (const [col, sql] of migrations) {
    if (!existingCols.includes(col)) db.exec(sql);
}

function getConfig(guildId) {
    let row = db.prepare('SELECT * FROM guild_config WHERE guild_id = ?').get(guildId);
    if (!row) {
        db.prepare('INSERT OR IGNORE INTO guild_config (guild_id) VALUES (?)').run(guildId);
        row = db.prepare('SELECT * FROM guild_config WHERE guild_id = ?').get(guildId);
    }
    return row;
}
function setConfig(guildId, fields) {
    const current = getConfig(guildId);
    const merged  = { ...current, ...fields, guild_id: guildId, updated_at: new Date().toISOString() };
    const cols    = Object.keys(merged).filter(k => k !== 'guild_id');
    const sets    = cols.map(c => `${c} = @${c}`).join(', ');
    db.prepare(`UPDATE guild_config SET ${sets} WHERE guild_id = @guild_id`).run(merged);
}
function getGuildsWithFeature(column) {
    return db.prepare(`SELECT * FROM guild_config WHERE ${column} = 1`).all();
}
function addScheduledPost(guildId, channelId, postAt, payload) {
    return db.prepare('INSERT INTO scheduled_posts (guild_id, channel_id, post_at, payload) VALUES (?, ?, ?, ?)').run(guildId, channelId, postAt, JSON.stringify(payload));
}
function getDueScheduledPosts() {
    return db.prepare("SELECT * FROM scheduled_posts WHERE post_at <= datetime('now')").all().map(r => ({ ...r, payload: JSON.parse(r.payload) }));
}
function deleteScheduledPost(id) { db.prepare('DELETE FROM scheduled_posts WHERE id = ?').run(id); }
function getScheduledPosts(guildId) {
    return db.prepare('SELECT * FROM scheduled_posts WHERE guild_id = ? ORDER BY post_at ASC').all(guildId).map(r => ({ ...r, payload: JSON.parse(r.payload) }));
}
function getNextCaseNumber(guildId) {
    const row = db.prepare('SELECT MAX(case_number) as max FROM mod_cases WHERE guild_id = ?').get(guildId);
    return (row?.max ?? 0) + 1;
}
function addModCase(guildId, type, userId, userTag, modId, modTag, reason) {
    const caseNumber = getNextCaseNumber(guildId);
    db.prepare('INSERT INTO mod_cases (guild_id, case_number, type, user_id, user_tag, mod_id, mod_tag, reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(guildId, caseNumber, type, userId, userTag, modId, modTag, reason);
    return caseNumber;
}
function getModCases(guildId, userId, limit = 10, offset = 0) {
    return db.prepare('SELECT * FROM mod_cases WHERE guild_id = ? AND user_id = ? ORDER BY case_number DESC LIMIT ? OFFSET ?').all(guildId, userId, limit, offset);
}
function countModCases(guildId, userId) {
    return db.prepare('SELECT COUNT(*) as count FROM mod_cases WHERE guild_id = ? AND user_id = ?').get(guildId, userId)?.count ?? 0;
}
function getXP(guildId, userId) {
    let row = db.prepare('SELECT * FROM user_xp WHERE guild_id = ? AND user_id = ?').get(guildId, userId);
    if (!row) {
        db.prepare('INSERT OR IGNORE INTO user_xp (guild_id, user_id) VALUES (?, ?)').run(guildId, userId);
        row = db.prepare('SELECT * FROM user_xp WHERE guild_id = ? AND user_id = ?').get(guildId, userId);
    }
    return row;
}
function setXP(guildId, userId, xp, level) {
    db.prepare("INSERT INTO user_xp (guild_id, user_id, xp, level, last_xp_at) VALUES (?, ?, ?, ?, datetime('now')) ON CONFLICT(guild_id, user_id) DO UPDATE SET xp = ?, level = ?, last_xp_at = datetime('now')").run(guildId, userId, xp, level, xp, level);
}
function updateLastXpAt(guildId, userId) {
    db.prepare("UPDATE user_xp SET last_xp_at = datetime('now') WHERE guild_id = ? AND user_id = ?").run(guildId, userId);
}
function getLeaderboard(guildId, limit = 10) {
    return db.prepare('SELECT * FROM user_xp WHERE guild_id = ? ORDER BY xp DESC LIMIT ?').all(guildId, limit);
}
function getUserRank(guildId, userId) {
    return db.prepare('SELECT COUNT(*) + 1 as rank FROM user_xp WHERE guild_id = ? AND xp > (SELECT xp FROM user_xp WHERE guild_id = ? AND user_id = ?)').get(guildId, guildId, userId)?.rank ?? 1;
}
function getWeeklyTopXP(guildId, limit = 3) {
    const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
    return db.prepare('SELECT * FROM user_xp WHERE guild_id = ? AND last_xp_at >= ? ORDER BY xp DESC LIMIT ?').all(guildId, since, limit);
}
function getTwitchSubs(guildId) { return db.prepare('SELECT * FROM twitch_subs WHERE guild_id = ?').all(guildId); }
function getAllTwitchSubs() { return db.prepare('SELECT * FROM twitch_subs').all(); }
function addTwitchSub(guildId, streamerLogin, streamerName, postChannelId) {
    db.prepare('INSERT OR REPLACE INTO twitch_subs (guild_id, streamer_login, streamer_name, post_channel_id) VALUES (?, ?, ?, ?)').run(guildId, streamerLogin.toLowerCase(), streamerName, postChannelId);
}
function removeTwitchSub(guildId, streamerLogin) {
    return db.prepare('DELETE FROM twitch_subs WHERE guild_id = ? AND streamer_login = ?').run(guildId, streamerLogin.toLowerCase()).changes;
}
function setTwitchLastStream(guildId, streamerLogin, streamId) {
    db.prepare('UPDATE twitch_subs SET last_stream_id = ? WHERE guild_id = ? AND streamer_login = ?').run(streamId, guildId, streamerLogin);
}
function getYoutubeSubs(guildId) { return db.prepare('SELECT * FROM youtube_subs WHERE guild_id = ?').all(guildId); }
function getAllYoutubeSubs() { return db.prepare('SELECT * FROM youtube_subs').all(); }
function addYoutubeSub(guildId, ytChannelId, channelName, postChannelId) {
    db.prepare('INSERT OR REPLACE INTO youtube_subs (guild_id, yt_channel_id, channel_name, post_channel_id) VALUES (?, ?, ?, ?)').run(guildId, ytChannelId, channelName, postChannelId);
}
function removeYoutubeSub(guildId, ytChannelId) {
    return db.prepare('DELETE FROM youtube_subs WHERE guild_id = ? AND yt_channel_id = ?').run(guildId, ytChannelId).changes;
}
function setYoutubeLastVideo(guildId, ytChannelId, videoId) {
    db.prepare('UPDATE youtube_subs SET last_video_id = ? WHERE guild_id = ? AND yt_channel_id = ?').run(videoId, guildId, ytChannelId);
}
function createPoll(guildId, channelId, question, options, endsAt, createdBy) {
    return db.prepare('INSERT INTO polls (guild_id, channel_id, question, options, votes, ends_at, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)').run(guildId, channelId, question, JSON.stringify(options), '{}', endsAt, createdBy);
}
function setPollMessageId(pollId, messageId) { db.prepare('UPDATE polls SET message_id = ? WHERE id = ?').run(messageId, pollId); }
function getPoll(pollId) {
    const row = db.prepare('SELECT * FROM polls WHERE id = ?').get(pollId);
    return row ? { ...row, options: JSON.parse(row.options), votes: JSON.parse(row.votes) } : null;
}
function getPollByMessageId(messageId) {
    const row = db.prepare('SELECT * FROM polls WHERE message_id = ?').get(messageId);
    return row ? { ...row, options: JSON.parse(row.options), votes: JSON.parse(row.votes) } : null;
}
function updatePollVotes(pollId, votes) { db.prepare('UPDATE polls SET votes = ? WHERE id = ?').run(JSON.stringify(votes), pollId); }
function closePoll(pollId) { db.prepare('UPDATE polls SET closed = 1 WHERE id = ?').run(pollId); }
function getExpiredPolls() {
    return db.prepare("SELECT * FROM polls WHERE closed = 0 AND ends_at <= datetime('now')").all().map(r => ({ ...r, options: JSON.parse(r.options), votes: JSON.parse(r.votes) }));
}
function getActiveGuildPolls(guildId) {
    return db.prepare('SELECT * FROM polls WHERE guild_id = ? AND closed = 0 ORDER BY created_at DESC').all(guildId).map(r => ({ ...r, options: JSON.parse(r.options), votes: JSON.parse(r.votes) }));
}
function createGiveaway(guildId, channelId, prize, winnerCount, endsAt, hostId) {
    return db.prepare('INSERT INTO giveaways (guild_id, channel_id, prize, winner_count, ends_at, host_id) VALUES (?, ?, ?, ?, ?, ?)').run(guildId, channelId, prize, winnerCount, endsAt, hostId);
}
function setGiveawayMessageId(giveawayId, messageId) { db.prepare('UPDATE giveaways SET message_id = ? WHERE id = ?').run(messageId, giveawayId); }
function getGiveaway(giveawayId) {
    const row = db.prepare('SELECT * FROM giveaways WHERE id = ?').get(giveawayId);
    return row ? { ...row, entries: JSON.parse(row.entries), winners: JSON.parse(row.winners) } : null;
}
function toggleGiveawayEntry(giveawayId, userId) {
    const giveaway = getGiveaway(giveawayId);
    if (!giveaway || giveaway.ended) return false;
    const entries = new Set(giveaway.entries);
    let entered = true;
    if (entries.has(userId)) { entries.delete(userId); entered = false; } else { entries.add(userId); }
    db.prepare('UPDATE giveaways SET entries = ? WHERE id = ?').run(JSON.stringify([...entries]), giveawayId);
    return entered;
}
function endGiveaway(giveawayId, winners) { db.prepare('UPDATE giveaways SET ended = 1, winners = ? WHERE id = ?').run(JSON.stringify(winners), giveawayId); }
function getExpiredGiveaways() {
    return db.prepare("SELECT * FROM giveaways WHERE ended = 0 AND ends_at <= datetime('now')").all().map(r => ({ ...r, entries: JSON.parse(r.entries), winners: JSON.parse(r.winners) }));
}
function getActiveGuildGiveaways(guildId) {
    return db.prepare('SELECT * FROM giveaways WHERE guild_id = ? AND ended = 0 ORDER BY created_at DESC').all(guildId).map(r => ({ ...r, entries: JSON.parse(r.entries), winners: JSON.parse(r.winners) }));
}
function addAutoRole(guildId, roleId, trigger) {
    return db.prepare('INSERT OR IGNORE INTO auto_roles (guild_id, role_id, trigger) VALUES (?, ?, ?)').run(guildId, roleId, trigger);
}
function removeAutoRole(guildId, roleId, trigger) {
    return db.prepare('DELETE FROM auto_roles WHERE guild_id = ? AND role_id = ? AND trigger = ?').run(guildId, roleId, trigger).changes;
}
function getAutoRoles(guildId) {
    return db.prepare('SELECT * FROM auto_roles WHERE guild_id = ? ORDER BY trigger, created_at').all(guildId);
}
function getAutoRolesByTrigger(guildId, trigger) {
    return db.prepare('SELECT * FROM auto_roles WHERE guild_id = ? AND trigger = ?').all(guildId, trigger);
}
function getLevelAutoRoles(guildId, level) {
    return db.prepare('SELECT * FROM auto_roles WHERE guild_id = ? AND trigger = ?').all(guildId, `level:${level}`);
}
function createPanel(guildId, title, description, createdBy) {
    return db.prepare('INSERT INTO reaction_role_panels (guild_id, title, description, created_by) VALUES (?, ?, ?, ?)').run(guildId, title, description, createdBy);
}
function getPanel(panelId) {
    return db.prepare('SELECT * FROM reaction_role_panels WHERE id = ?').get(panelId) ?? null;
}
function getGuildPanels(guildId) {
    return db.prepare('SELECT * FROM reaction_role_panels WHERE guild_id = ? ORDER BY created_at DESC').all(guildId);
}
function setPanelMessageId(panelId, channelId, messageId) {
    db.prepare('UPDATE reaction_role_panels SET channel_id = ?, message_id = ? WHERE id = ?').run(channelId, messageId, panelId);
}
function deletePanel(panelId) { db.prepare('DELETE FROM reaction_role_panels WHERE id = ?').run(panelId); }
function addPanelButton(panelId, roleId, label, color) {
    return db.prepare('INSERT OR IGNORE INTO reaction_role_buttons (panel_id, role_id, label, color) VALUES (?, ?, ?, ?)').run(panelId, roleId, label, color);
}
function removePanelButton(panelId, roleId) {
    return db.prepare('DELETE FROM reaction_role_buttons WHERE panel_id = ? AND role_id = ?').run(panelId, roleId).changes;
}
function getPanelButtons(panelId) {
    return db.prepare('SELECT * FROM reaction_role_buttons WHERE panel_id = ? ORDER BY id').all(panelId);
}

module.exports = {
    getConfig, setConfig, getGuildsWithFeature,
    addScheduledPost, getDueScheduledPosts, deleteScheduledPost, getScheduledPosts,
    addModCase, getModCases, countModCases,
    getXP, setXP, updateLastXpAt, getLeaderboard, getUserRank, getWeeklyTopXP,
    getTwitchSubs, getAllTwitchSubs, addTwitchSub, removeTwitchSub, setTwitchLastStream,
    getYoutubeSubs, getAllYoutubeSubs, addYoutubeSub, removeYoutubeSub, setYoutubeLastVideo,
    createPoll, setPollMessageId, getPoll, getPollByMessageId, updatePollVotes, closePoll, getExpiredPolls, getActiveGuildPolls,
    createGiveaway, setGiveawayMessageId, getGiveaway, toggleGiveawayEntry, endGiveaway, getExpiredGiveaways, getActiveGuildGiveaways,
    addAutoRole, removeAutoRole, getAutoRoles, getAutoRolesByTrigger, getLevelAutoRoles,
    createPanel, getPanel, getGuildPanels, setPanelMessageId, deletePanel, addPanelButton, removePanelButton, getPanelButtons,
};
