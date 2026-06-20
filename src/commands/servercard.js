const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const { registerAllFonts, getAllFontFamilies } = require('../utils/canvas.js');
const { getColorAutocomplete } = require('../utils/colors.js');
const guard = require('../utils/packageGuard');

registerAllFonts();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('servercard')
        .setDescription('Generate a shareable server info card')
        .addStringOption(opt => opt.setName('primary').setDescription('Accent color').setAutocomplete(true))
        .addStringOption(opt => opt.setName('font').setDescription('Font family').addChoices(...getAllFontFamilies().map(f => ({ name: f, value: f })))),

    async autocomplete(interaction) {
        await interaction.respond(getColorAutocomplete(interaction.options.getFocused()));
    },

    async execute(interaction) {
        if (await guard(interaction, 'nitrofree')) return;
        await interaction.deferReply();
        const color = interaction.options.getString('primary') ?? '#8B0000';
        const font  = interaction.options.getString('font')    ?? getAllFontFamilies()[0];
        const guild = interaction.guild;
        const W = 600, H = 200;
        const canvas = createCanvas(W, H);
        const ctx    = canvas.getContext('2d');
        ctx.fillStyle = '#1e1f22'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = color; ctx.fillRect(0, 0, W, 6);
        ctx.font = `bold 32px "${font}"`; ctx.fillStyle = '#ffffff'; ctx.textBaseline = 'top';
        ctx.fillText(guild.name, 20, 24);
        ctx.font = `16px "${font}"`; ctx.fillStyle = '#aaaaaa';
        ctx.fillText(`👥 ${guild.memberCount} members`, 20, 74);
        ctx.fillText(`📅 Created ${guild.createdAt.toLocaleDateString()}`, 20, 100);
        ctx.fillText(`🆔 ${guild.id}`, 20, 126);
        const buf = canvas.toBuffer('image/png');
        const attachment = new AttachmentBuilder(buf, { name: 'servercard.png' });
        const embed = new EmbedBuilder()
            .setTitle(`🖼️ Server Card — ${guild.name}`)
            .setImage('attachment://servercard.png')
            .setColor(color)
            .setFooter({ text: 'Sigil • /servercard' });
        await interaction.editReply({ embeds: [embed], files: [attachment] });
    },
};
