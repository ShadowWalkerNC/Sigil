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
        mod_log_channel         TEXT,
        xp_enabled              INTEGER DEFAULT 0,
        xp_channel              TEXT,
        xp_rate                 INTEGER DEFAULT 15,
        xp_cooldown             INTEGER DEFAULT 60,
        last_stats_at           TEXT,
        ticket_category_id      TEXT,
        ticket_support_role     TEXT,
        ticket_log_channel      TEXT,
        automod_anti_spam       INTEGER DEFAULT 0,
        automod_anti_links      INTEGER DEFAULT 0,
        automod_anti_mentions   INTEGER DEFAULT 0,
        automod_anti_caps       INTEGER DEFAULT 0,
        automod_bad_words       INTEGER DEFAULT 0,
        automod_spam_threshold    INTEGER DEFAULT 5,
        automod_mention_threshold INTEGER DEFAULT 5,
        automod_caps_threshold    INTEGER DEFAULT 70,
        automod_log_channel     TEXT,
        automod_bypass_role     TEXT,
        automod_badwords        TEXT,
        automod_allowed_domains TEXT,
        starboard_enabled       INTEGER DEFAULT 0,
        starboard_channel       TEXT,
        starboard_threshold     INTEGER DEFAULT 3,
        starboard_emoji         TEXT DEFAULT '⭐',
        starboard_ignored       TEXT,
        bump_enabled            INTEGER DEFAULT 0,
        bump_channel            TEXT,
        bump_message            TEXT,
        bump_last_bump_at       TEXT,
        bump_last_reminded_at   TEXT,
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
        weekly_xp  INTEGER DEFAULT 0,
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
    CREATE TABLE IF NOT EXISTS tickets (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id     TEXT NOT NULL,
        user_id      TEXT NOT NULL,
        thread_id    TEXT,
        subject      TEXT NOT NULL DEFAULT 'Support request',
        status       TEXT NOT NULL DEFAULT 'open',
        closed_by    TEXT,
        close_reason TEXT,
        created_at   TEXT DEFAULT (datetime('now')),
        closed_at    TEXT
    );
    CREATE TABLE IF NOT EXISTS starboard_entries (
        guild_id      TEXT NOT NULL,
        message_id    TEXT NOT NULL,
        sb_message_id TEXT,
        created_at    TEXT DEFAULT (datetime('now')),
        PRIMARY KEY (guild_id, message_id)
    );
    CREATE TABLE IF NOT EXISTS custom_commands (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id        TEXT NOT NULL,
        trigger         TEXT NOT NULL,
        response        TEXT NOT NULL,
        embed           INTEGER NOT NULL DEFAULT 0,
        embed_color     TEXT DEFAULT '#5865F2',
        delete_trigger  INTEGER NOT NULL DEFAULT 0,
        created_by      TEXT NOT NULL,
        created_at      TEXT DEFAULT (datetime('now')),
        UNIQUE(guild_id, trigger)
    );

    -- Indexes for high-frequency guild_id lookups
    CREATE INDEX IF NOT EXISTS idx_mod_cases_guild_user    ON mod_cases (guild_id, user_id);
    CREATE INDEX IF NOT EXISTS idx_user_xp_guild           ON user_xp (guild_id, xp DESC);
    CREATE INDEX IF NOT EXISTS idx_user_xp_guild_weekly    ON user_xp (guild_id, weekly_xp DESC);
    CREATE INDEX IF NOT EXISTS idx_scheduled_posts_guild   ON scheduled_posts (guild_id);
    CREATE INDEX IF NOT EXISTS idx_polls_guild             ON polls (guild_id, closed);
    CREATE INDEX IF NOT EXISTS idx_giveaways_guild         ON giveaways (guild_id, ended);
    CREATE INDEX IF NOT EXISTS idx_auto_roles_guild        ON auto_roles (guild_id, trigger);
    CREATE INDEX IF NOT EXISTS idx_tickets_guild           ON tickets (guild_id, status);
    CREATE INDEX IF NOT EXISTS idx_custom_commands_guild   ON custom_commands (guild_id, trigger);
    CREATE INDEX IF NOT EXISTS idx_reaction_panels_guild   ON reaction_role_panels (guild_id);
`);

// ── Column migrations (existing DBs) ────────────────────────────────────────
const existingCols = db.prepare('PRAGMA table_info(guild_config)').all().map(r => r.name);
const migrations = [
    ['event_banner_enabled',    'ALTER TABLE guild_config ADD COLUMN event_banner_enabled    INTEGER DEFAULT 0'],
    ['event_banner_channel',    'ALTER TABLE guild_config ADD COLUMN event_banner_channel    TEXT'],
    ['webhook_channel',         'ALTER TABLE guild_config ADD COLUMN webhook_channel         TEXT'],
    ['webhook_secret',          'ALTER TABLE guild_config ADD COLUMN webhook_secret          TEXT'],
    ['mod_log_channel',         'ALTER TABLE guild_config ADD COLUMN mod_log_channel         TEXT'],
    ['xp_enabled',              'ALTER TABLE guild_config ADD COLUMN xp_enabled              INTEGER DEFAULT 0'],
    ['xp_channel',              'ALTER TABLE guild_config ADD COLUMN xp_channel              TEXT'],
    ['xp_rate',                 'ALTER TABLE guild_config ADD COLUMN xp_rate                 INTEGER DEFAULT 15'],
    ['xp_cooldown',             'ALTER TABLE guild_config ADD COLUMN xp_cooldown             INTEGER DEFAULT 60'],
    ['last_stats_at',           'ALTER TABLE guild_config ADD COLUMN last_stats_at           TEXT'],
    ['ticket_category_id',      'ALTER TABLE guild_config ADD COLUMN ticket_category_id      TEXT'],
    ['ticket_support_role',     'ALTER TABLE guild_config ADD COLUMN ticket_support_role     TEXT'],
    ['ticket_log_channel',      'ALTER TABLE guild_config ADD COLUMN ticket_log_channel      TEXT'],
    ['automod_anti_spam',       'ALTER TABLE guild_config ADD COLUMN automod_anti_spam       INTEGER DEFAULT 0'],
    ['automod_anti_links',      'ALTER TABLE guild_config ADD COLUMN automod_anti_links      INTEGER DEFAULT 0'],
    ['automod_anti_mentions',   'ALTER TABLE guild_config ADD COLUMN automod_anti_mentions   INTEGER DEFAULT 0'],
    ['automod_anti_caps',       'ALTER TABLE guild_config ADD COLUMN automod_anti_caps       INTEGER DEFAULT 0'],
    ['automod_bad_words',       'ALTER TABLE guild_config ADD COLUMN automod_bad_words       INTEGER DEFAULT 0'],
    ['automod_spam_threshold',    'ALTER TABLE guild_config ADD COLUMN automod_spam_threshold    INTEGER DEFAULT 5'],
    ['automod_mention_threshold', 'ALTER TABLE guild_config ADD COLUMN automod_mention_threshold INTEGER DEFAULT 5'],
    ['automod_caps_threshold',    'ALTER TABLE guild_config ADD COLUMN automod_caps_threshold    INTEGER DEFAULT 70'],
    ['automod_log_channel',     'ALTER TABLE guild_config ADD COLUMN automod_log_channel     TEXT'],
    ['automod_bypass_role',     'ALTER TABLE guild_config ADD COLUMN automod_bypass_role     TEXT'],
    ['automod_badwords',        'ALTER TABLE guild_config ADD COLUMN automod_badwords        TEXT'],
    ['automod_allowed_domains', 'ALTER TABLE guild_config ADD COLUMN automod_allowed_domains TEXT'],
    ['starboard_enabled',       'ALTER TABLE guild_config ADD COLUMN starboard_enabled       INTEGER DEFAULT 0'],
    ['starboard_channel',       'ALTER TABLE guild_config ADD COLUMN starboard_channel       TEXT'],
    ['starboard_threshold',     'ALTER TABLE guild_config ADD COLUMN starboard_threshold     INTEGER DEFAULT 3'],
    ['starboard_emoji',         "ALTER TABLE guild_config ADD COLUMN starboard_emoji         TEXT DEFAULT '⭐'"],
    ['starboard_ignored',       'ALTER TABLE guild_config ADD COLUMN starboard_ignored       TEXT'],
    ['bump_enabled',            'ALTER TABLE guild_config ADD COLUMN bump_enabled            INTEGER DEFAULT 0'],
    ['bump_channel',            'ALTER TABLE guild_config ADD COLUMN bump_channel            TEXT'],
    ['bump_message',            'ALTER TABLE guild_config ADD COLUMN bump_message            TEXT'],
    ['bump_last_bump_at',       'ALTER TABLE guild_config ADD COLUMN bump_last_bump_at       TEXT'],
    ['bump_last_reminded_at',   'ALTER TABLE guild_config ADD COLUMN bump_last_reminded_at   TEXT'],
];
for (const [col, sql] of migrations) {
    if (!existingCols.includes(col)) db.exec(sql);
}

// ── user_xp column migrations ────────────────────────────────────────────────
const xpCols = db.prepare('PRAGMA table_info(user_xp)').all().map(r => r.name);
if (!xpCols.includes('weekly_xp')) {
    db.exec('ALTER TABLE user_xp ADD COLUMN weekly_xp INTEGER DEFAULT 0');
    db.exec('CREATE INDEX IF NOT EXISTS idx_user_xp_guild_weekly ON user_xp (guild_id, weekly_xp DESC)');
}

// ── Drop dead integration config columns (requires SQLite >= 3.35) ──────────
const deadCols = [
    'twitch_enabled', 'twitch_channel', 'twitch_streamers', 'twitch_last_stream_id',
    'youtube_enabled', 'youtube_channel', 'youtube_handles', 'youtube_last_video_id',
];
for (const col of deadCols) {
    if (existingCols.includes(col)) {
        try { db.exec(`ALTER TABLE guild_config DROP COLUMN ${col}`); }
        catch { /* SQLite < 3.35 — column stays but is inert */ }
    }
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
/**
 * Increment both lifetime XP and weekly_xp in one statement.
 * weekly_xp is reset to 0 by resetWeeklyXP() — call that from a Sunday midnight cron.
 */
function addXP(guildId, userId, amount) {
    db.prepare(`
        INSERT INTO user_xp (guild_id, user_id, xp, weekly_xp, last_xp_at)
        VALUES (?, ?, ?, ?, datetime('now'))
        ON CONFLICT(guild_id, user_id) DO UPDATE SET
            xp        = xp + excluded.xp,
            weekly_xp = weekly_xp + excluded.weekly_xp,
            last_xp_at = datetime('now')
    `).run(guildId, userId, amount, amount);
}
function resetWeeklyXP(guildId) {
    if (guildId) {
        db.prepare('UPDATE user_xp SET weekly_xp = 0 WHERE guild_id = ?').run(guildId);
    } else {
        db.prepare('UPDATE user_xp SET weekly_xp = 0').run();
    }
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
/**
 * Returns the top N users by XP earned this week (weekly_xp column).
 * weekly_xp is incremented by addXP() and reset every Sunday via resetWeeklyXP().
 */
function getWeeklyTopXP(guildId, limit = 3) {
    return db.prepare('SELECT * FROM user_xp WHERE guild_id = ? AND weekly_xp > 0 ORDER BY weekly_xp DESC LIMIT ?').all(guildId, limit);
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
function createTicket(guildId, userId, subject) {
    return db.prepare('INSERT INTO tickets (guild_id, user_id, subject) VALUES (?, ?, ?)').run(guildId, userId, subject);
}
function getTicket(id) {
    return db.prepare('SELECT * FROM tickets WHERE id = ?').get(id) ?? null;
}
function getTicketByThread(threadId) {
    return db.prepare('SELECT * FROM tickets WHERE thread_id = ?').get(threadId) ?? null;
}
function setTicketThreadId(id, threadId) {
    db.prepare('UPDATE tickets SET thread_id = ? WHERE id = ?').run(threadId, id);
}
function closeTicket(id, reason, closedBy) {
    db.prepare("UPDATE tickets SET status = 'closed', close_reason = ?, closed_by = ?, closed_at = datetime('now') WHERE id = ?").run(reason, closedBy, id);
}
function getGuildTickets(guildId, status) {
    if (status) return db.prepare('SELECT * FROM tickets WHERE guild_id = ? AND status = ? ORDER BY created_at DESC').all(guildId, status);
    return db.prepare('SELECT * FROM tickets WHERE guild_id = ? ORDER BY created_at DESC').all(guildId);
}
function getStarboardEntry(guildId, messageId) {
    return db.prepare('SELECT * FROM starboard_entries WHERE guild_id = ? AND message_id = ?').get(guildId, messageId) ?? null;
}
function setStarboardEntry(guildId, messageId, sbMessageId) {
    db.prepare('INSERT OR REPLACE INTO starboard_entries (guild_id, message_id, sb_message_id) VALUES (?, ?, ?)').run(guildId, messageId, sbMessageId);
}
function addCustomCommand(guildId, trigger, response, embed, embedColor, deleteTrigger, createdBy) {
    return db.prepare(
        'INSERT OR REPLACE INTO custom_commands (guild_id, trigger, response, embed, embed_color, delete_trigger, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(guildId, trigger.toLowerCase(), response, embed ? 1 : 0, embedColor ?? '#5865F2', deleteTrigger ? 1 : 0, createdBy);
}
function removeCustomCommand(guildId, trigger) {
    return db.prepare('DELETE FROM custom_commands WHERE guild_id = ? AND trigger = ?').run(guildId, trigger.toLowerCase()).changes;
}
function getCustomCommand(guildId, trigger) {
    return db.prepare('SELECT * FROM custom_commands WHERE guild_id = ? AND trigger = ?').get(guildId, trigger.toLowerCase()) ?? null;
}
function getCustomCommands(guildId) {
    return db.prepare('SELECT * FROM custom_commands WHERE guild_id = ? ORDER BY trigger ASC').all(guildId);
}

module.exports = {
    getConfig, setConfig, getGuildsWithFeature,
    addScheduledPost, getDueScheduledPosts, deleteScheduledPost, getScheduledPosts,
    addModCase, getModCases, countModCases,
    getXP, setXP, addXP, updateLastXpAt, getLeaderboard, getUserRank, getWeeklyTopXP, resetWeeklyXP,
    getTwitchSubs, getAllTwitchSubs, addTwitchSub, removeTwitchSub, setTwitchLastStream,
    getYoutubeSubs, getAllYoutubeSubs, addYoutubeSub, removeYoutubeSub, setYoutubeLastVideo,
    createPoll, setPollMessageId, getPoll, getPollByMessageId, updatePollVotes, closePoll, getExpiredPolls, getActiveGuildPolls,
    createGiveaway, setGiveawayMessageId, getGiveaway, toggleGiveawayEntry, endGiveaway, getExpiredGiveaways, getActiveGuildGiveaways,
    addAutoRole, removeAutoRole, getAutoRoles, getAutoRolesByTrigger, getLevelAutoRoles,
    createPanel, getPanel, getGuildPanels, setPanelMessageId, deletePanel, addPanelButton, removePanelButton, getPanelButtons,
    createTicket, getTicket, getTicketByThread, setTicketThreadId, closeTicket, getGuildTickets,
    getStarboardEntry, setStarboardEntry,
    addCustomCommand, removeCustomCommand, getCustomCommand, getCustomCommands,
};
