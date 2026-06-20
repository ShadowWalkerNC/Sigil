'use strict';

/**
 * src/util/logBuffer.js
 * In-memory ring buffer that captures all console output from gui-server.js.
 * Exposes:
 *   logBuffer.push(level, ...args)  — add a line
 *   logBuffer.tail(n, level)        — last N lines, optional level filter
 *   logBuffer.subscribe(fn)         — register a live-stream listener
 *   logBuffer.unsubscribe(fn)       — remove a listener
 *   logBuffer.patch()               — monkey-patch console.log/warn/error
 */

const MAX_LINES = 500;

const _lines     = [];   // { ts, level, text }
const _listeners = new Set();

function push(level, ...args) {
    const text = args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
    const entry = { ts: Date.now(), level, text };
    _lines.push(entry);
    if (_lines.length > MAX_LINES) _lines.shift();
    for (const fn of _listeners) {
        try { fn(entry); } catch {}
    }
}

function tail(n = 50, level = null) {
    const src = level ? _lines.filter(l => l.level === level) : _lines;
    return src.slice(-Math.max(1, Math.min(n, MAX_LINES)));
}

function subscribe(fn)   { _listeners.add(fn); }
function unsubscribe(fn) { _listeners.delete(fn); }

/** Monkey-patch console so all gui-server output flows through the buffer. */
function patch() {
    const _log   = console.log.bind(console);
    const _warn  = console.warn.bind(console);
    const _error = console.error.bind(console);

    console.log   = (...a) => { _log(...a);   push('info',  ...a); };
    console.warn  = (...a) => { _warn(...a);  push('warn',  ...a); };
    console.error = (...a) => { _error(...a); push('error', ...a); };
}

module.exports = { push, tail, subscribe, unsubscribe, patch };
