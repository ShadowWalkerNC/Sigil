const path = require('path');
const fs   = require('fs');

/**
 * Central font registry.
 * To add a new font:
 *   1. Drop the real .otf or .ttf file into src/fonts/
 *   2. Add an entry below.
 *   3. It appears automatically in all commands and the GUI font picker.
 *
 * NOTE: Several fonts below ship as placeholder stubs in the repo to avoid
 * redistributing third-party font files. Replace each stub with the real file
 * downloaded from its source (see docs/FONTS.md).
 */
const FONTS = {
    'another-danger': {
        label:  'Another Danger',
        file:   path.resolve(__dirname, '..', 'fonts', 'font.otf'),
        family: 'Another Danger',
    },
    'bebas-neue': {
        label:  'Bebas Neue',
        file:   path.resolve(__dirname, '..', 'fonts', 'BebasNeue-Regular.ttf'),
        family: 'Bebas Neue',
    },
    'oswald': {
        label:  'Oswald',
        file:   path.resolve(__dirname, '..', 'fonts', 'Oswald-Bold.ttf'),
        family: 'Oswald',
    },
    'playfair': {
        label:  'Playfair Display',
        file:   path.resolve(__dirname, '..', 'fonts', 'PlayfairDisplay-Bold.ttf'),
        family: 'Playfair Display',
    },
    'dancing-script': {
        label:  'Dancing Script',
        file:   path.resolve(__dirname, '..', 'fonts', 'DancingScript-Bold.ttf'),
        family: 'Dancing Script',
    },
    'source-code-pro': {
        label:  'Source Code Pro',
        file:   path.resolve(__dirname, '..', 'fonts', 'SourceCodePro-Bold.ttf'),
        family: 'Source Code Pro',
    },
};

/**
 * Returns all font configs whose files exist on disk and are not stubs.
 * Stubs (< 1 KB) are skipped with a warning.
 * @returns {Array<{ label: string, file: string, family: string }>}
 */
function getAllFonts() {
    return Object.values(FONTS).filter(font => {
        if (!fs.existsSync(font.file)) {
            console.warn(`[fonts] Missing: ${font.file} — skipping '${font.family}'`);
            return false;
        }
        const size = fs.statSync(font.file).size;
        if (size < 1024) {
            console.warn(`[fonts] Stub detected (${size} bytes): ${font.file} — skipping '${font.family}'. Replace with real font file (see docs/FONTS.md).`);
            return false;
        }
        return true;
    });
}

/**
 * Get a single font config by key.
 * Falls back to 'another-danger' if the key is unknown or its file is a stub.
 * @param {string} key
 * @returns {{ label: string, file: string, family: string }}
 */
function getFont(key) {
    const font = FONTS[key];
    if (!font) {
        console.warn(`[fonts] Unknown key '${key}' — falling back to 'another-danger'.`);
        return FONTS['another-danger'];
    }
    if (!fs.existsSync(font.file) || fs.statSync(font.file).size < 1024) {
        console.warn(`[fonts] '${key}' is missing or a stub — falling back to 'another-danger'.`);
        return FONTS['another-danger'];
    }
    return font;
}

/**
 * Returns font choice objects for Discord SlashCommandBuilder.addChoices().
 * Only includes fonts whose files are present and not stubs.
 * @returns {Array<{ name: string, value: string }>}
 */
function getFontChoices() {
    const available = new Set(getAllFonts().map(f => f.family));
    return Object.entries(FONTS)
        .filter(([, font]) => available.has(font.family))
        .map(([value, font]) => ({ name: font.label, value }));
}

/**
 * Returns all registered font options regardless of stub status.
 * Used by the GUI to populate the full font picker.
 * @returns {Array<{ label: string, value: string }>}
 */
function getAllFontOptions() {
    return Object.entries(FONTS).map(([value, font]) => ({ label: font.label, value }));
}

module.exports = { getFont, getAllFonts, getFontChoices, getAllFontOptions };
