const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const { registerAllFonts, getAllFontFamilies } = require('../utils/canvas.js');
const { getColorAutocomplete } = require('../utils/colors.js');
const guard = require('../utils/packageGuard');

registerAllFonts();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('welcomecard')
        .setDescription('Generate a welcome card for a new member')
        .addUserOption(opt => opt.setName('user').setDescription('User to welcome').setRequired(true))
        .addStringOption(opt => opt.setName('message').setDescription('Welcome message'))
        .addStringOption(opt => opt.setName('color').setDescription('Accent color').setAutocomplete(true))
        .addStringOption(opt => opt.setName('font').setDescription('Font family').addChoices(...getAllFontFamilies().map(f => ({ name: f, value: f })))),

    async autocomplete(interaction) {
        await interaction.respond(getColorAutocomplete(interaction.options.getFocused()));
    },

    async execute(interaction) {
        if (await guard(interaction, 'community')) return;
        await interaction.deferReply();
        const target  = interaction.options.getUser('user');
        const message = interaction.options.getString('message') ?? `Welcome to ${interaction.guild.name}!`;
        const color   = interaction.options.getString('color')   ?? '#8B0000';
        const font    = interaction.options.getString('font')    ?? getAllFontFamilies()[0];
        const W = 600, H = 200;
        const canvas = createCanvas(W, H);
        const ctx    = canvas.getContext('2d');
        ctx.fillStyle = '#1e1f22'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = color; ctx.fillRect(0, 0, W, 6);
        ctx.font = `bold 28px "${font}"`; ctx.fillStyle = '#ffffff'; ctx.textBaseline = 'top';
        ctx.fillText(`Welcome, ${target.username}!`, 20, 24);
        ctx.font = `16px "${font}"`; ctx.fillStyle = '#aaaaaa';
        ctx.fillText(message, 20, 68);
        ctx.fillText(`Member #${interaction.guild.memberCount}`, 20, 96);
        const buf = canvas.toBuffer('image/png');
        const attachment = new AttachmentBuilder(buf, { name: 'welcomecard.png' });
        const embed = new EmbedBuilder()
            .setTitle(`👋 Welcome Card — ${target.username}`)
            .setImage('attachment://welcomecard.png')
            .setColor(color)
            .setFooter({ text: 'Sigil • /welcomecard' });
        await interaction.editReply({ embeds: [embed], files: [attachment] });
    },
};
