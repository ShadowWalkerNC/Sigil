const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { createCanvas, registerFont, loadImage } = require('canvas');
const { getFont, getAllFonts } = require('../utils/fonts');
const { getBackgroundChoices, drawBackground } = require('../utils/backgrounds');

for (const font of getAllFonts()) {
    try { registerFont(font.file, { family: font.family }); }
    catch (e) { console.error(`[ERROR] Failed to register font '${font.family}':`, e.message); }
}

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
            .setDescription('\u2726 Generating background preview sheet\u2026');
        const initialReply = await interaction.reply({ embeds: [loadingEmbed] });

        try {
            const bgChoices = getBackgroundChoices();

            const rows   = Math.ceil(bgChoices.length / COLS);
            const sheetW = COLS * CELL_W + (COLS + 1) * PAD;
            const sheetH = HEADER_H + rows * (CELL_H + LABEL_H + PAD) + PAD;

            const canvas = createCanvas(sheetW, sheetH);
            const ctx    = canvas.getContext('2d');

            ctx.fillStyle = '#111111';
            ctx.fillRect(0, 0, sheetW, sheetH);

            const registeredFonts = getAllFonts();
            const headerFont = registeredFonts.length > 0
                ? `bold 22px '${registeredFonts[0].family}'`
                : "bold 22px 'Arial'";
            const labelFont = registeredFonts.length > 0
                ? `bold 13px '${registeredFonts[0].family}'`
                : "bold 13px 'Arial'";

            ctx.font             = headerFont;
            ctx.fillStyle        = '#ffffff';
            ctx.textAlign        = 'center';
            ctx.textBaseline     = 'middle';
            ctx.fillText('\u2726 Sigil \u2014 Background Preview', sheetW / 2, HEADER_H / 2);

            for (let i = 0; i < bgChoices.length; i++) {
                const { name: label, value: key } = bgChoices[i];
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

                ctx.font         = labelFont;
                ctx.fillStyle    = '#dddddd';
                ctx.textAlign    = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(label, x + CELL_W / 2, y + CELL_H + LABEL_H / 2);
            }

            const attachment = canvas.toBuffer();

            await initialReply.edit({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#808080')
                        .setImage('attachment://preview.png')
                        .setFooter({ text: 'Sigil \u2022 /preview \u2022 use these names in /icon, /banner, or /compare' }),
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
