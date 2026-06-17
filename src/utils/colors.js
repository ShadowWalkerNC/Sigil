/**
 * Sigil — Named Color Presets
 *
 * Used by autocomplete handlers across all commands.
 * Each entry: { name: 'Display Name', value: '#HEXCODE' }
 *
 * - name   : shown in the Discord dropdown  (max 100 chars)
 * - value  : passed to the command as the option value
 *
 * Users can also skip the dropdown entirely and type a raw hex
 * code (e.g. #A3FF00) — the command validates it on execute.
 */

const COLOR_PRESETS = [
    // ── Reds & Pinks ──────────────────────────────────────────
    { name: '🔴 Crimson',          value: '#DC143C' },
    { name: '🔴 Scarlet',          value: '#FF2400' },
    { name: '🔴 Blood Red',        value: '#8B0000' },
    { name: '🔴 Rose Red',         value: '#C21807' },
    { name: '🩷 Hot Pink',         value: '#FF69B4' },
    { name: '🩷 Deep Pink',        value: '#FF1493' },
    { name: '🩷 Blush',            value: '#DE5D83' },
    { name: '🩷 Magenta',          value: '#FF00FF' },

    // ── Oranges ───────────────────────────────────────────────
    { name: '🟠 Inferno',          value: '#FF4500' },
    { name: '🟠 Ember',            value: '#FF6B35' },
    { name: '🟠 Sunset Orange',    value: '#FD5E53' },
    { name: '🟠 Tangerine',        value: '#F28500' },

    // ── Yellows & Golds ───────────────────────────────────────
    { name: '🟡 Gold',             value: '#FFD700' },
    { name: '🟡 Solar Yellow',     value: '#FFC200' },
    { name: '🟡 Pale Yellow',      value: '#FFFF99' },
    { name: '🟡 Amber',            value: '#FFBF00' },

    // ── Greens ────────────────────────────────────────────────
    { name: '🟢 Neon Green',       value: '#39FF14' },
    { name: '🟢 Lime',             value: '#32CD32' },
    { name: '🟢 Forest Green',     value: '#228B22' },
    { name: '🟢 Mint',             value: '#98FF98' },
    { name: '🟢 Emerald',          value: '#50C878' },
    { name: '🟢 Sage',             value: '#8FBC8F' },

    // ── Cyans & Teals ─────────────────────────────────────────
    { name: '🩵 Aqua',             value: '#00FFFF' },
    { name: '🩵 Teal',             value: '#008080' },
    { name: '🩵 Cyan',             value: '#00CED1' },
    { name: '🩵 Ice Blue',         value: '#99C5C4' },
    { name: '🩵 Seafoam',          value: '#2EFFE8' },

    // ── Blues ─────────────────────────────────────────────────
    { name: '🔵 Electric Blue',    value: '#007FFF' },
    { name: '🔵 Royal Blue',       value: '#4169E1' },
    { name: '🔵 Deep Ocean',       value: '#003153' },
    { name: '🔵 Cobalt',           value: '#0047AB' },
    { name: '🔵 Sky Blue',         value: '#87CEEB' },
    { name: '🔵 Midnight Blue',    value: '#191970' },
    { name: '🔵 Neon Blue',        value: '#1F51FF' },

    // ── Purples & Violets ─────────────────────────────────────
    { name: '🟣 Purple',           value: '#800080' },
    { name: '🟣 Violet',           value: '#8B00FF' },
    { name: '🟣 Neon Purple',      value: '#BC13FE' },
    { name: '🟣 Lavender',         value: '#967BB6' },
    { name: '🟣 Indigo',           value: '#4B0082' },
    { name: '🟣 Plum',             value: '#DDA0DD' },

    // ── Whites & Silvers ──────────────────────────────────────
    { name: '⚪ Pure White',        value: '#FFFFFF' },
    { name: '⚪ Ghost White',       value: '#F8F8FF' },
    { name: '⚪ Silver',            value: '#C0C0C0' },
    { name: '⚪ Platinum',          value: '#E5E4E2' },

    // ── Blacks & Greys ────────────────────────────────────────
    { name: '⚫ Pure Black',        value: '#000000' },
    { name: '⚫ Graphite',          value: '#383838' },
    { name: '⚫ Charcoal',          value: '#36454F' },
    { name: '⚫ Ash Grey',          value: '#B2BEB5' },

    // ── Special / Metallic ────────────────────────────────────
    { name: '✨ Neon Pink',         value: '#FF00AA' },
    { name: '✨ Holographic',       value: '#A0E7FF' },
    { name: '✨ Rose Gold',         value: '#B76E79' },
    { name: '✨ Bronze',            value: '#CD7F32' },
];

/**
 * Returns up to 25 presets that match the user's typed input.
 * Matching is case-insensitive and checks both name and hex value.
 * If input is empty, returns the first 25 presets.
 * If input looks like a hex code, it's returned as a custom option at the top.
 *
 * @param {string} input — the current typed value from Discord
 * @returns {Array<{name: string, value: string}>} — max 25 items
 */
function getColorAutocomplete(input) {
    const query = (input || '').trim().toLowerCase();

    // If they're typing a raw hex code, show it as the first option
    const results = [];
    const hexPattern = /^#?[0-9a-f]{0,6}$/i;
    const isHexInput = hexPattern.test(query) && query.length > 1;

    if (isHexInput) {
        const normalized = query.startsWith('#') ? query.toUpperCase() : `#${query.toUpperCase()}`;
        // Only show as valid selectable option if it's a complete hex
        if (/^#[0-9A-F]{6}$/i.test(normalized)) {
            results.push({ name: `🎨 Custom: ${normalized}`, value: normalized });
        }
    }

    // Filter presets by name or hex match
    const matched = query
        ? COLOR_PRESETS.filter(c =>
            c.name.toLowerCase().includes(query) ||
            c.value.toLowerCase().includes(query)
          )
        : COLOR_PRESETS;

    for (const c of matched) {
        if (results.length >= 25) break;
        results.push(c);
    }

    return results.slice(0, 25);
}

module.exports = { COLOR_PRESETS, getColorAutocomplete };
