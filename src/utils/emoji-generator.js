'use strict';

const { createCanvas } = require('canvas');

async function generateEmojiBuffer(color = '#FF0000', label = 'SG') {
    const canvas = createCanvas(128, 128);
    const ctx    = canvas.getContext('2d');
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 128, 128);
    const grad = ctx.createRadialGradient(64, 64, 10, 64, 64, 60);
    grad.addColorStop(0, color);
    grad.addColorStop(1, '#000000');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(64, 64, 60, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label.slice(0, 3).toUpperCase(), 64, 64);
    return canvas.toBuffer('image/png');
}

module.exports = { generateEmojiBuffer };
