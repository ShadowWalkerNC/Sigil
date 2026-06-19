/**
 * Lightweight SQLite wrapper using better-sqlite3.
 * Stores per-guild automation config, scheduled posts, mod cases, and XP.
 */
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
        updated_at              TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS scheduled_posts (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id    TEXT NOT NULL,
        channel_id  TEXT NOT NULL,
        post_at     TEXT NOT NULL,
        payload     TEXT NOT NULL,
        created_at  TEXT DEFAULT (datetime('now'))
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
        guild_id    TEXT NOT NULL,
        user_id     TEXT NOT NULL,
        xp          INTEGER DEFAULT 0,
        level       INTEGER DEFAULT 0,
        last_xp_at  TEXT DEFAULT (datetime('now')),
        PRIMARY KEY (guild_id, user_id)
    );
`);

// Runtime migrations
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
];
for (const [col, sql] of migrations) {
    if (!existingCols.includes(col)) db.exec(sql);
}

// ── Guild config helpers ──────────────────────────────────────────────────────
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

// ── Scheduled posts helpers ───────────────────────────────────────────────────
function addScheduledPost(guildId, channelId, postAt, payload) {
    return db.prepare(
        'INSERT INTO scheduled_posts (guild_id, channel_id, post_at, payload) VALUES (?, ?, ?, ?)'
    ).run(guildId, channelId, postAt, JSON.stringify(payload));
}

function getDueScheduledPosts() {
    return db.prepare(
        "SELECT * FROM scheduled_posts WHERE post_at <= datetime('now')"
    ).all().map(r => ({ ...r, payload: JSON.parse(r.payload) }));
}

function deleteScheduledPost(id) {
    db.prepare('DELETE FROM scheduled_posts WHERE id = ?').run(id);
}

function getScheduledPosts(guildId) {
    return db.prepare('SELECT * FROM scheduled_posts WHERE guild_id = ? ORDER BY post_at ASC').all(guildId)
        .map(r => ({ ...r, payload: JSON.parse(r.payload) }));
}

// ── Mod case helpers ──────────────────────────────────────────────────────────
function getNextCaseNumber(guildId) {
    const row = db.prepare('SELECT MAX(case_number) as max FROM mod_cases WHERE guild_id = ?').get(guildId);
    return (row?.max ?? 0) + 1;
}

function addModCase(guildId, type, userId, userTag, modId, modTag, reason) {
    const caseNumber = getNextCaseNumber(guildId);
    db.prepare(
        'INSERT INTO mod_cases (guild_id, case_number, type, user_id, user_tag, mod_id, mod_tag, reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(guildId, caseNumber, type, userId, userTag, modId, modTag, reason);
    return caseNumber;
}

function getModCases(guildId, userId, limit = 10, offset = 0) {
    return db.prepare(
        'SELECT * FROM mod_cases WHERE guild_id = ? AND user_id = ? ORDER BY case_number DESC LIMIT ? OFFSET ?'
    ).all(guildId, userId, limit, offset);
}

function countModCases(guildId, userId) {
    return db.prepare('SELECT COUNT(*) as count FROM mod_cases WHERE guild_id = ? AND user_id = ?').get(guildId, userId)?.count ?? 0;
}

// ── XP helpers ───────────────────────────────────────────────────────────────
function getXP(guildId, userId) {
    let row = db.prepare('SELECT * FROM user_xp WHERE guild_id = ? AND user_id = ?').get(guildId, userId);
    if (!row) {
        db.prepare('INSERT OR IGNORE INTO user_xp (guild_id, user_id) VALUES (?, ?)').run(guildId, userId);
        row = db.prepare('SELECT * FROM user_xp WHERE guild_id = ? AND user_id = ?').get(guildId, userId);
    }
    return row;
}

function setXP(guildId, userId, xp, level) {
    db.prepare(
        'INSERT INTO user_xp (guild_id, user_id, xp, level, last_xp_at) VALUES (?, ?, ?, ?, datetime(\'now\')) ' +
        'ON CONFLICT(guild_id, user_id) DO UPDATE SET xp = ?, level = ?, last_xp_at = datetime(\'now\')'
    ).run(guildId, userId, xp, level, xp, level);
}

function updateLastXpAt(guildId, userId) {
    db.prepare("UPDATE user_xp SET last_xp_at = datetime('now') WHERE guild_id = ? AND user_id = ?").run(guildId, userId);
}

function getLeaderboard(guildId, limit = 10) {
    return db.prepare(
        'SELECT * FROM user_xp WHERE guild_id = ? ORDER BY xp DESC LIMIT ?'
    ).all(guildId, limit);
}

function getUserRank(guildId, userId) {
    const row = db.prepare(
        'SELECT COUNT(*) + 1 as rank FROM user_xp WHERE guild_id = ? AND xp > (SELECT xp FROM user_xp WHERE guild_id = ? AND user_id = ?)'
    ).get(guildId, guildId, userId);
    return row?.rank ?? 1;
}

module.exports = {
    getConfig, setConfig, getGuildsWithFeature,
    addScheduledPost, getDueScheduledPosts, deleteScheduledPost, getScheduledPosts,
    addModCase, getModCases, countModCases,
    getXP, setXP, updateLastXpAt, getLeaderboard, getUserRank,
};
