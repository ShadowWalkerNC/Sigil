const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas } = require('canvas');
const { registerAllFonts, getAllFontFamilies } = require('../utils/canvas.js');
const { getColorAutocomplete } = require('../utils/colors.js');
const guard = require('../utils/packageGuard');

registerAllFonts();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('certificate')
        .setDescription('Generate a certificate of achievement for a member')
        .addUserOption(opt => opt.setName('user').setDescription('Recipient').setRequired(true))
        .addStringOption(opt => opt.setName('achievement').setDescription('Achievement title').setRequired(true))
        .addStringOption(opt => opt.setName('description').setDescription('Certificate body text'))
        .addStringOption(opt => opt.setName('color').setDescription('Accent color').setAutocomplete(true))
        .addStringOption(opt => opt.setName('font').setDescription('Font family').addChoices(...getAllFontFamilies().map(f => ({ name: f, value: f })))),

    async autocomplete(interaction) {
        await interaction.respond(getColorAutocomplete(interaction.options.getFocused()));
    },

    async execute(interaction) {
        if (await guard(interaction, 'community')) return;
        await interaction.deferReply();
        const target      = interaction.options.getUser('user');
        const achievement = interaction.options.getString('achievement');
        const description = interaction.options.getString('description') ?? 'In recognition of outstanding achievement';
        const color       = interaction.options.getString('color')       ?? '#8B0000';
        const font        = interaction.options.getString('font')        ?? getAllFontFamilies()[0];
        const W = 720, H = 480;
        const canvas = createCanvas(W, H);
        const ctx    = canvas.getContext('2d');
        ctx.fillStyle = '#fffdf5'; ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = color; ctx.lineWidth = 10;
        ctx.strokeRect(12, 12, W - 24, H - 24);
        ctx.strokeStyle = color + '55'; ctx.lineWidth = 3;
        ctx.strokeRect(22, 22, W - 44, H - 44);
        ctx.font = `bold 18px "${font}"`; ctx.fillStyle = color; ctx.textAlign = 'center';
        ctx.fillText('CERTIFICATE OF ACHIEVEMENT', W/2, 80);
        ctx.font = `16px "${font}"`; ctx.fillStyle = '#555555';
        ctx.fillText('This certifies that', W/2, 140);
        ctx.font = `bold 36px "${font}"`; ctx.fillStyle = '#1a1a1a';
        ctx.fillText(target.username, W/2, 200);
        ctx.font = `16px "${font}"`; ctx.fillStyle = '#555555';
        ctx.fillText('has been awarded', W/2, 250);
        ctx.font = `bold 28px "${font}"`; ctx.fillStyle = color;
        ctx.fillText(achievement, W/2, 300);
        ctx.font = `14px "${font}"`; ctx.fillStyle = '#777777';
        const words = description.split(' ');
        let line = '', y = 350;
        for (const word of words) {
            const test = line + word + ' ';
            if (ctx.measureText(test).width > W - 80 && line) { ctx.fillText(line.trim(), W/2, y); line = word + ' '; y += 22; }
            else { line = test; }
        }
        if (line) ctx.fillText(line.trim(), W/2, y);
        ctx.font = `12px "${font}"`; ctx.fillStyle = '#aaaaaa';
        ctx.fillText(`Issued by ${interaction.guild.name} • ${new Date().toLocaleDateString()}`, W/2, H - 30);
        const buf = canvas.toBuffer('image/png');
        const attachment = new AttachmentBuilder(buf, { name: 'certificate.png' });
        const embed = new EmbedBuilder()
            .setTitle(`🏅 Certificate — ${target.username}`)
            .setDescription(`**${achievement}**`)
            .setImage('attachment://certificate.png')
            .setColor(color)
            .setFooter({ text: 'Sigil • /certificate' });
        await interaction.editReply({ embeds: [embed], files: [attachment] });
    },
};
