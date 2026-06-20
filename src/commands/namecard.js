const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas } = require('canvas');
const { registerAllFonts, getAllFontFamilies } = require('../utils/canvas.js');
const { saveEntry } = require('../utils/history.js');
const { getColorAutocomplete } = require('../utils/colors.js');
const guard = require('../utils/packageGuard');

registerAllFonts();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('namecard')
        .setDescription('Generate a styled name card graphic')
        .addStringOption(opt => opt.setName('name').setDescription('Display name').setRequired(true))
        .addStringOption(opt => opt.setName('title').setDescription('Title or role'))
        .addStringOption(opt => opt.setName('primary').setDescription('Accent color').setAutocomplete(true))
        .addStringOption(opt => opt.setName('font').setDescription('Font family').addChoices(...getAllFontFamilies().map(f => ({ name: f, value: f })))),

    async autocomplete(interaction) {
        await interaction.respond(getColorAutocomplete(interaction.options.getFocused()));
    },

    async execute(interaction) {
        if (await guard(interaction, 'nitrofree')) return;
        await interaction.deferReply();
        const name   = interaction.options.getString('name');
        const title  = interaction.options.getString('title')  ?? '';
        const color  = interaction.options.getString('primary') ?? '#8B0000';
        const font   = interaction.options.getString('font')    ?? getAllFontFamilies()[0];
        const W = 520, H = 160;
        const canvas = createCanvas(W, H);
        const ctx    = canvas.getContext('2d');
        ctx.fillStyle = '#1e1f22'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = color; ctx.fillRect(0, 0, 8, H);
        ctx.font = `bold 36px "${font}"`; ctx.fillStyle = '#ffffff';
        ctx.textBaseline = 'middle'; ctx.fillText(name, 32, title ? H/2 - 18 : H/2);
        if (title) {
            ctx.font = `18px "${font}"`; ctx.fillStyle = color;
            ctx.fillText(title, 32, H/2 + 18);
        }
        const buf = canvas.toBuffer('image/png');
        const attachment = new AttachmentBuilder(buf, { name: 'namecard.png' });
        const embed = new EmbedBuilder()
            .setTitle(`🪪 Name Card — ${name}`)
            .setImage('attachment://namecard.png')
            .setColor(color)
            .setFooter({ text: 'Sigil • /namecard' });
        await interaction.editReply({ embeds: [embed], files: [attachment] });
        saveEntry(interaction.user.id, { command: 'namecard', name, title, color, font });
    },
};
