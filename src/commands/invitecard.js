const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas } = require('canvas');
const { registerAllFonts, getAllFontFamilies } = require('../utils/canvas.js');
const { getColorAutocomplete } = require('../utils/colors.js');
const guard = require('../utils/packageGuard');

registerAllFonts();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('invitecard')
        .setDescription('Generate a branded invite card for your server')
        .addStringOption(opt => opt.setName('invite_url').setDescription('Discord invite URL').setRequired(true))
        .addStringOption(opt => opt.setName('tagline').setDescription('Short tagline'))
        .addStringOption(opt => opt.setName('color').setDescription('Accent color').setAutocomplete(true))
        .addStringOption(opt => opt.setName('font').setDescription('Font family').addChoices(...getAllFontFamilies().map(f => ({ name: f, value: f })))),

    async autocomplete(interaction) {
        await interaction.respond(getColorAutocomplete(interaction.options.getFocused()));
    },

    async execute(interaction) {
        if (await guard(interaction, 'community')) return;
        await interaction.deferReply();
        const inviteUrl = interaction.options.getString('invite_url');
        const tagline   = interaction.options.getString('tagline') ?? `Join ${interaction.guild.name}`;
        const color     = interaction.options.getString('color')   ?? '#8B0000';
        const font      = interaction.options.getString('font')    ?? getAllFontFamilies()[0];
        const W = 560, H = 180;
        const canvas = createCanvas(W, H);
        const ctx    = canvas.getContext('2d');
        ctx.fillStyle = '#1e1f22'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = color; ctx.fillRect(0, 0, W, 6);
        ctx.font = `bold 28px "${font}"`; ctx.fillStyle = '#ffffff'; ctx.textBaseline = 'top';
        ctx.fillText(interaction.guild.name, 20, 22);
        ctx.font = `16px "${font}"`; ctx.fillStyle = '#aaaaaa';
        ctx.fillText(tagline, 20, 66);
        ctx.font = `bold 14px "${font}"`; ctx.fillStyle = color;
        ctx.fillText(inviteUrl, 20, 110);
        ctx.font = `12px "${font}"`; ctx.fillStyle = '#555555';
        ctx.fillText(`👥 ${interaction.guild.memberCount} members`, 20, 140);
        const buf = canvas.toBuffer('image/png');
        const attachment = new AttachmentBuilder(buf, { name: 'invitecard.png' });
        const embed = new EmbedBuilder()
            .setTitle(`📨 Invite Card — ${interaction.guild.name}`)
            .setImage('attachment://invitecard.png')
            .setColor(color)
            .setFooter({ text: 'Sigil • /invitecard' });
        await interaction.editReply({ embeds: [embed], files: [attachment] });
    },
};
