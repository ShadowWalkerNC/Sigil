'use strict';

const { createCanvas } = require('canvas');

async function generateStickerBuffer(text = 'SIGIL', color = '#8B0000') {
    const canvas = createCanvas(320, 160);
    const ctx    = canvas.getContext('2d');
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 320, 160);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text.toUpperCase(), 160, 80);
    return canvas.toBuffer('image/png');
}

module.exports = { generateStickerBuffer };
