const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { createCanvas, registerFont, loadImage } = require('canvas');
const { getFont, getAllFonts } = require('../utils/fonts');
const { drawBackground } = require('../utils/backgrounds');

for (const font of getAllFonts()) {
    registerFont(font.file, { family: font.family });
}

const BG_KEYS = [
    'plain-black',
    'plain-white',
    'midnight-gradient',
    'sunset',
    'forest',
    'cyberpunk-grid',
    'starfield',
    'carbon-fiber',
    'bg-image-1',
    'bg-image-2',
];

const BG_LABELS = {
    'plain-black':       'Plain (Black)',
    'plain-white':       'Plain (White)',
    'midnight-gradient': 'Midnight Gradient',
    'sunset':            'Sunset',
    'forest':            'Forest',
    'cyberpunk-grid':    'Cyberpunk Grid',
    'starfield':         'Starfield',
    'carbon-fiber':      'Carbon Fiber',
    'bg-image-1':        'BG Image 1',
    'bg-image-2':        'BG Image 2',
};

const COLS     = 3;
const CELL_W   = 280;
const CELL_H   = 160;
const PAD      = 12;
const HEADER_H = 48;
const LABEL_H  = 28;

module.exports = {
    cooldown: 8,
    data: new SlashCommandBuilder()
        .setName('preview')
        .setDescription('Generate a mosaic sheet showing all available backgrounds.'),

    async execute(interaction) {
        const loadingEmbed = new EmbedBuilder()
            .setColor('#808080')
            .setDescription('Generating background preview sheet\u2026');
        const initialReply = await interaction.reply({ embeds: [loadingEmbed] });

        try {
            const rows   = Math.ceil(BG_KEYS.length / COLS);
            const sheetW = COLS * CELL_W + (COLS + 1) * PAD;
            const sheetH = HEADER_H + rows * (CELL_H + LABEL_H + PAD) + PAD;

            const canvas = createCanvas(sheetW, sheetH);
            const ctx    = canvas.getContext('2d');

            ctx.fillStyle = '#111111';
            ctx.fillRect(0, 0, sheetW, sheetH);

            ctx.font             = "bold 22px 'Another Danger'";
            ctx.fillStyle        = '#ffffff';
            ctx.textAlign        = 'center';
            ctx.textBaseline     = 'middle';
            ctx.fillText('Background Preview \u2014 Discord Icon Gen', sheetW / 2, HEADER_H / 2);

            for (let i = 0; i < BG_KEYS.length; i++) {
                const key = BG_KEYS[i];
                const col = i % COLS;
                const row = Math.floor(i / COLS);
                const x   = PAD + col * (CELL_W + PAD);
                const y   = HEADER_H + PAD + row * (CELL_H + LABEL_H + PAD);

                const cell  = createCanvas(CELL_W, CELL_H);
                const cctx  = cell.getContext('2d');
                await drawBackground(cctx, key, CELL_W, CELL_H, loadImage);

                ctx.drawImage(cell, x, y, CELL_W, CELL_H);

                ctx.strokeStyle = 'rgba(255,255,255,0.15)';
                ctx.lineWidth   = 1;
                ctx.strokeRect(x + 0.5, y + 0.5, CELL_W - 1, CELL_H - 1);

                ctx.fillStyle = '#1c1c1c';
                ctx.fillRect(x, y + CELL_H, CELL_W, LABEL_H);

                ctx.font         = "bold 13px 'Another Danger'";
                ctx.fillStyle    = '#dddddd';
                ctx.textAlign    = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(BG_LABELS[key] || key, x + CELL_W / 2, y + CELL_H + LABEL_H / 2);
            }

            const attachment = canvas.toBuffer();

            await initialReply.edit({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#808080')
                        .setImage('attachment://preview.png')
                        .setFooter({ text: 'Discord Icon Gen \u2022 /preview \u2022 use these names in /icon or /banner' }),
                ],
                files: [{ attachment, name: 'preview.png' }],
            });
        } catch (error) {
            console.error('[ERROR] Preview generation failed:', error);
            await initialReply.edit({
                embeds: [new EmbedBuilder().setColor('#FF0000').setDescription('Failed to generate preview. Please try again.')],
            });
        }
    },
};
