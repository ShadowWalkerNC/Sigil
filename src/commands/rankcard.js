const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas } = require('canvas');
const { registerAllFonts, getAllFontFamilies } = require('../utils/canvas.js');
const { getColorAutocomplete } = require('../utils/colors.js');
const guard = require('../utils/packageGuard');

registerAllFonts();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rankcard')
        .setDescription('Generate a rank/level card for a user')
        .addUserOption(opt => opt.setName('user').setDescription('Target user (defaults to you)'))
        .addIntegerOption(opt => opt.setName('level').setDescription('Level to display').setMinValue(1).setMaxValue(999))
        .addIntegerOption(opt => opt.setName('xp').setDescription('Current XP').setMinValue(0))
        .addIntegerOption(opt => opt.setName('xp_max').setDescription('XP needed for next level').setMinValue(1))
        .addStringOption(opt => opt.setName('color').setDescription('Accent color').setAutocomplete(true))
        .addStringOption(opt => opt.setName('font').setDescription('Font family').addChoices(...getAllFontFamilies().map(f => ({ name: f, value: f })))),

    async autocomplete(interaction) {
        await interaction.respond(getColorAutocomplete(interaction.options.getFocused()));
    },

    async execute(interaction) {
        if (await guard(interaction, 'community')) return;
        await interaction.deferReply();
        const target = interaction.options.getUser('user') ?? interaction.user;
        const level  = interaction.options.getInteger('level')  ?? 1;
        const xp     = interaction.options.getInteger('xp')     ?? 0;
        const xpMax  = interaction.options.getInteger('xp_max') ?? 100;
        const color  = interaction.options.getString('color')   ?? '#8B0000';
        const font   = interaction.options.getString('font')    ?? getAllFontFamilies()[0];
        const W = 600, H = 120, BAR_Y = 80, BAR_H = 18, BAR_X = 20, BAR_W = W - 40;
        const canvas = createCanvas(W, H);
        const ctx    = canvas.getContext('2d');
        ctx.fillStyle = '#1e1f22'; ctx.fillRect(0, 0, W, H);
        ctx.font = `bold 24px "${font}"`; ctx.fillStyle = '#ffffff'; ctx.textBaseline = 'top';
        ctx.fillText(target.username, 20, 16);
        ctx.font = `16px "${font}"`; ctx.fillStyle = color;
        ctx.fillText(`Level ${level}`, W - 20 - ctx.measureText(`Level ${level}`).width, 16);
        ctx.fillStyle = '#2b2d31'; ctx.beginPath(); ctx.roundRect(BAR_X, BAR_Y, BAR_W, BAR_H, BAR_H/2); ctx.fill();
        const pct = Math.min(1, xp / xpMax);
        if (pct > 0) {
            ctx.fillStyle = color; ctx.beginPath(); ctx.roundRect(BAR_X, BAR_Y, Math.max(BAR_H, BAR_W * pct), BAR_H, BAR_H/2); ctx.fill();
        }
        ctx.font = `12px "${font}"`; ctx.fillStyle = '#aaaaaa';
        ctx.fillText(`${xp} / ${xpMax} XP`, BAR_X, BAR_Y - 16);
        const buf = canvas.toBuffer('image/png');
        const attachment = new AttachmentBuilder(buf, { name: 'rankcard.png' });
        const embed = new EmbedBuilder()
            .setTitle(`⭐ Rank Card — ${target.username}`)
            .setImage('attachment://rankcard.png')
            .setColor(color)
            .setFooter({ text: 'Sigil • /rankcard' });
        await interaction.editReply({ embeds: [embed], files: [attachment] });
    },
};
