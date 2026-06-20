const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas } = require('canvas');
const { registerAllFonts, getAllFontFamilies } = require('../utils/canvas.js');
const { getColorAutocomplete } = require('../utils/colors.js');
const guard = require('../utils/packageGuard');

registerAllFonts();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('profilecard')
        .setDescription('Generate a styled profile card for a user')
        .addUserOption(opt => opt.setName('user').setDescription('Target user (defaults to you)'))
        .addStringOption(opt => opt.setName('primary').setDescription('Accent color').setAutocomplete(true))
        .addStringOption(opt => opt.setName('font').setDescription('Font family').addChoices(...getAllFontFamilies().map(f => ({ name: f, value: f })))),

    async autocomplete(interaction) {
        await interaction.respond(getColorAutocomplete(interaction.options.getFocused()));
    },

    async execute(interaction) {
        if (await guard(interaction, 'nitrofree')) return;
        await interaction.deferReply();
        const target = interaction.options.getUser('user') ?? interaction.user;
        const color  = interaction.options.getString('primary') ?? '#8B0000';
        const font   = interaction.options.getString('font')    ?? getAllFontFamilies()[0];
        const member = await interaction.guild.members.fetch(target.id).catch(() => null);
        const W = 520, H = 160;
        const canvas = createCanvas(W, H);
        const ctx    = canvas.getContext('2d');
        ctx.fillStyle = '#1e1f22'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = color; ctx.fillRect(0, 0, 8, H);
        ctx.font = `bold 30px "${font}"`; ctx.fillStyle = '#ffffff'; ctx.textBaseline = 'middle';
        ctx.fillText(member?.displayName ?? target.username, 32, H/2 - 16);
        ctx.font = `16px "${font}"`; ctx.fillStyle = '#aaaaaa';
        ctx.fillText(`@${target.username}`, 32, H/2 + 16);
        const buf = canvas.toBuffer('image/png');
        const attachment = new AttachmentBuilder(buf, { name: 'profilecard.png' });
        const embed = new EmbedBuilder()
            .setTitle(`🪪 Profile Card — ${target.username}`)
            .setImage('attachment://profilecard.png')
            .setColor(color)
            .setFooter({ text: 'Sigil • /profilecard' });
        await interaction.editReply({ embeds: [embed], files: [attachment] });
    },
};
