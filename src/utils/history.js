const fs   = require('fs');
const path = require('path');

const HISTORY_DIR = path.join(__dirname, '../../data/history');
const MAX_ENTRIES = 10;

fs.mkdirSync(HISTORY_DIR, { recursive: true });

function historyFile(userId) {
    return path.join(HISTORY_DIR, `${userId}.json`);
}

function loadHistory(userId) {
    const file = historyFile(userId);
    if (!fs.existsSync(file)) return [];
    try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return []; }
}

function saveEntry(userId, entry) {
    const history = loadHistory(userId);
    history.unshift({ ...entry, timestamp: Date.now() });
    if (history.length > MAX_ENTRIES) history.length = MAX_ENTRIES;
    fs.writeFileSync(historyFile(userId), JSON.stringify(history, null, 2));
}

function buildCopyCommand(entry) {
    const opts = [];
    if (entry.text)            opts.push(`text:${entry.text}`);
    if (entry.background)      opts.push(`background:${entry.background}`);
    if (entry.border)          opts.push(`border:${entry.border}`);
    if (entry.primary_color)   opts.push(`primary_color:${entry.primary_color}`);
    if (entry.secondary_color) opts.push(`secondary_color:${entry.secondary_color}`);
    if (entry.font)            opts.push(`font:${entry.font}`);
    if (entry.glow != null)    opts.push(`glow:${entry.glow}`);
    return `/${entry.command} ${opts.join(' ')}`;
}

module.exports = { loadHistory, saveEntry, buildCopyCommand };
