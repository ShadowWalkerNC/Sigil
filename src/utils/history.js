/**
 * history.js — per-user icon history store.
 *
 * Storage layout:
 *   data/history/<userId>.json
 *   [ { label, timestamp, command, params: { text, size, color, color2, glow, background, opacity, border, font } } ]
 *
 * Max 5 entries per user (oldest dropped first).
 */

const fs   = require('fs');
const path = require('path');

const DATA_DIR  = path.resolve(__dirname, '..', '..', 'data', 'history');
const MAX_ITEMS = 5;

function ensureDir() {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function filePath(userId) {
    return path.join(DATA_DIR, `${userId}.json`);
}

/**
 * Load a user's history array. Returns [] if none exists.
 * @param {string} userId
 * @returns {Array}
 */
function loadHistory(userId) {
    ensureDir();
    const fp = filePath(userId);
    if (!fs.existsSync(fp)) return [];
    try {
        return JSON.parse(fs.readFileSync(fp, 'utf8'));
    } catch {
        return [];
    }
}

/**
 * Save one entry to a user's history. Trims to MAX_ITEMS.
 * @param {string} userId
 * @param {object} entry  — { label, command, params }
 */
function saveEntry(userId, entry) {
    ensureDir();
    const history = loadHistory(userId);
    const record  = {
        label:     entry.label || new Date().toISOString().slice(0, 16).replace('T', ' '),
        timestamp: Date.now(),
        command:   entry.command,
        params:    entry.params,
    };
    history.unshift(record);          // newest first
    const trimmed = history.slice(0, MAX_ITEMS);
    fs.writeFileSync(filePath(userId), JSON.stringify(trimmed, null, 2), 'utf8');
}

/**
 * Delete a user's entire history.
 * @param {string} userId
 */
function clearHistory(userId) {
    const fp = filePath(userId);
    if (fs.existsSync(fp)) fs.unlinkSync(fp);
}

module.exports = { loadHistory, saveEntry, clearHistory, MAX_ITEMS };
