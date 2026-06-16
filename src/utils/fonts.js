const path = require('path');
const fs = require('fs');

/**
 * Central font registry.
 * To add a new font:
 *   1. Drop the .otf or .ttf file into src/fonts/
 *   2. Add an entry below.
 *   3. It appears automatically in all commands.
 */
const FONTS = {
    'another-danger': {
        label: 'Another Danger',
        file: path.resolve(__dirname, '..', 'fonts', 'AnotherDanger.otf'),
        family: 'Another Danger',
    },
    'bebas-neue': {
        label: 'Bebas Neue',
        file: path.resolve(__dirname, '..', 'fonts', 'BebasNeue-Regular.ttf'),
        family: 'Bebas Neue',
    },
    'oswald-bold': {
        label: 'Oswald Bold',
        file: path.resolve(__dirname, '..', 'fonts', 'Oswald-Bold.ttf'),
        family: 'Oswald',
    },
    'playfair-display': {
        label: 'Playfair Display',
        file: path.resolve(__dirname, '..', 'fonts', 'PlayfairDisplay-Bold.ttf'),
        family: 'Playfair Display',
    },
    'source-code-pro': {
        label: 'Source Code Pro',
        file: path.resolve(__dirname, '..', 'fonts', 'SourceCodePro-Bold.ttf'),
        family: 'Source Code Pro',
    },
    'dancing-script': {
        label: 'Dancing Script',
        file: path.resolve(__dirname, '..', 'fonts', 'DancingScript-Bold.ttf'),
        family: 'Dancing Script',
    },
};

/**
 * Returns all font configs. Also validates font files exist on disk.
 * Called at module load time by each command to register fonts once.
 * @returns {Array<{ label: string, file: string, family: string }>}
 */
function getAllFonts() {
    return Object.values(FONTS).filter(font => {
        if (!fs.existsSync(font.file)) {
            console.warn(`[WARNING] Font file not found, skipping: ${font.file}`);
            return false;
        }
        return true;
    });
}

/**
 * Get a single font config by key.
 * Falls back to 'another-danger' with a warning if the key is not registered.
 * @param {string} key
 * @returns {{ label: string, file: string, family: string }}
 */
function getFont(key) {
    if (!FONTS[key]) {
        console.warn(`[WARNING] Font key '${key}' not found in registry. Falling back to 'another-danger'.`);
    }
    return FONTS[key] || FONTS['another-danger'];
}

/**
 * Returns font choice objects for Discord SlashCommandBuilder.addChoices().
 * @returns {Array<{ name: string, value: string }>}
 */
function getFontChoices() {
    return Object.entries(FONTS).map(([value, font]) => ({ name: font.label, value }));
}

module.exports = { getFont, getAllFonts, getFontChoices };
