/**
 * Lightweight SQLite wrapper using better-sqlite3.
 * Stores per-guild automation config and scheduled posts.
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
        guild_id              TEXT PRIMARY KEY,
        welcome_enabled       INTEGER DEFAULT 0,
        welcome_channel       TEXT,
        welcome_color         TEXT DEFAULT '#39FF14',
        welcome_bg            TEXT DEFAULT 'gradient-purple',
        welcome_font          TEXT DEFAULT 'Arial',
        goodbye_enabled       INTEGER DEFAULT 0,
        goodbye_channel       TEXT,
        milestone_enabled     INTEGER DEFAULT 0,
        milestone_channel     TEXT,
        boost_enabled         INTEGER DEFAULT 0,
        boost_channel         TEXT,
        stats_channel         TEXT,
        event_banner_enabled  INTEGER DEFAULT 0,
        event_banner_channel  TEXT,
        updated_at            TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS scheduled_posts (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id    TEXT NOT NULL,
        channel_id  TEXT NOT NULL,
        post_at     TEXT NOT NULL,
        payload     TEXT NOT NULL,
        created_at  TEXT DEFAULT (datetime('now'))
    );
`);

-- Migrate existing DBs: add event_banner columns if missing
PRAGMA table_info(guild_config);
`);

// Runtime migration — adds columns to existing DBs that predate this schema
const existingCols = db.prepare('PRAGMA table_info(guild_config)').all().map(r => r.name);
if (!existingCols.includes('event_banner_enabled')) {
    db.exec('ALTER TABLE guild_config ADD COLUMN event_banner_enabled INTEGER DEFAULT 0');
}
if (!existingCols.includes('event_banner_channel')) {
    db.exec('ALTER TABLE guild_config ADD COLUMN event_banner_channel TEXT');
}

// Guild config helpers
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

// Scheduled posts helpers
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

module.exports = { getConfig, setConfig, addScheduledPost, getDueScheduledPosts, deleteScheduledPost, getScheduledPosts };
