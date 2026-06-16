const path = require('path');

/**
 * Central font registry.
 * To add a new font:
 *   1. Drop the .otf or .ttf file into src/fonts/
 *   2. Add an entry below using the same pattern.
 *   3. Done — it appears automatically in all commands that use getFontChoices().
 */
const FONTS = {
    'another-danger': {
        label: 'Another Danger',
        file: path.resolve(__dirname, '..', 'fonts', 'AnotherDanger.otf'),
        family: 'Another Danger',
    },
    // Add more fonts here:
    // 'my-font': {
    //     label: 'My Font',
    //     file: path.resolve(__dirname, '..', 'fonts', 'my-font.otf'),
    //     family: 'My Font',
    // },
};

/**
 * Get a single font config by key. Falls back to 'another-danger' if key not found.
 * @param {string} key
 * @returns {{ label: string, file: string, family: string }}
 */
function getFont(key) {
    return FONTS[key] || FONTS['another-danger'];
}

/**
 * Returns all font configs as an array.
 * Used by commands to register all fonts at module load time (Fix #3).
 * @returns {Array<{ label: string, file: string, family: string }>}
 */
function getAllFonts() {
    return Object.values(FONTS);
}

/**
 * Returns font choice objects formatted for Discord SlashCommandBuilder.addChoices().
 * @returns {Array<{ name: string, value: string }>}
 */
function getFontChoices() {
    return Object.entries(FONTS).map(([value, font]) => ({ name: font.label, value }));
}

module.exports = { getFont, getAllFonts, getFontChoices };
