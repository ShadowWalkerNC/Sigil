const { registerFont } = require('canvas');
const path = require('path');
const fs   = require('fs');

const FONTS_DIR = path.join(__dirname, '../fonts');

// Map family names → font file names (relative to src/fonts/)
const FONT_MAP = [
    { family: 'Another Danger',  file: 'another-danger/font.otf'   },
    { family: 'Bebas Neue',      file: 'BebasNeue-Regular.ttf'     },
    { family: 'Oswald',          file: 'Oswald-Regular.ttf'        },
    { family: 'Playfair Display',file: 'PlayfairDisplay-Regular.ttf'},
    { family: 'Source Code Pro', file: 'SourceCodePro-Regular.ttf' },
    { family: 'Dancing Script',  file: 'DancingScript-Regular.ttf' },
];

function registerAllFonts() {
    for (const { family, file } of FONT_MAP) {
        const fullPath = path.join(FONTS_DIR, file);
        if (!fs.existsSync(fullPath)) {
            // silently skip missing fonts — stubs/placeholders not loaded
            continue;
        }
        try {
            registerFont(fullPath, { family });
        } catch (err) {
            console.warn(`[fonts] Could not register "${family}" (${file}): ${err.message}`);
        }
    }
}

function getAllFontFamilies() {
    return FONT_MAP
        .filter(({ file }) => {
            try { return fs.existsSync(path.join(FONTS_DIR, file)); } catch { return false; }
        })
        .map(({ family }) => family);
}

module.exports = { registerAllFonts, getAllFontFamilies, FONT_MAP };
