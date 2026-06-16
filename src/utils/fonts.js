const path = require('path');

/**
 * Font Registry
 * Maps font choice names (shown to Discord users) to their file path and
 * canvas family name. Import FONTS into any command that needs font options.
 *
 * To add a new font:
 *   1. Drop the .otf/.ttf file into src/fonts/
 *   2. Add a new entry below following the same structure
 *   3. Add the key as a choice in your command's font option
 */
const FONTS = {
    'another-danger': {
        label: 'Another Danger',
        file: path.resolve(__dirname, '..', 'fonts', 'font.otf'),
        family: 'Another Danger',
    },
    // Example for future fonts:
    // 'impact': {
    //     label: 'Impact',
    //     file: path.resolve(__dirname, '..', 'fonts', 'impact.ttf'),
    //     family: 'Impact',
    // },
};

/**
 * Returns a font entry by key, or the default font if key is not found.
 * @param {string} key
 * @returns {{ label: string, file: string, family: string }}
 */
function getFont(key) {
    return FONTS[key] || FONTS['another-danger'];
}

/**
 * Returns all fonts as an array of { name, value } Discord choice objects.
 * @returns {{ name: string, value: string }[]}
 */
function getFontChoices() {
    return Object.entries(FONTS).map(([value, font]) => ({
        name: font.label,
        value,
    }));
}

module.exports = { FONTS, getFont, getFontChoices };
