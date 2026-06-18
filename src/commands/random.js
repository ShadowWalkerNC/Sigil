const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { registerAllFonts, getAllFontFamilies, renderIcon } = require('../utils/canvas.js');
const { getAllBackgroundIds } = require('../utils/backgrounds.js');
const { BORDERS } = require('../utils/borders.js');
const { saveEntry } = require('../utils/history.js');

registerAllFonts();

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomHex() {
    return '#' + Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, '0');
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('random')
        .setDescription('Generate a completely random icon')
        .addStringOption(opt => opt.setName('text').setDescription('Text to display (optional)')),

    async execute(interaction) {
        await interaction.deferReply();

        const text       = interaction.options.getString('text') ?? 'SIGIL';
        const background = pick(getAllBackgroundIds());
        const border     = pick(BORDERS).id;
        const primary    = randomHex();
        const secondary  = randomHex();
        const font       = pick(getAllFontFamilies());
        const glow       = Math.floor(Math.random() * 20);

        const buf = await renderIcon({ text, background, border, primary, secondary, font, glow });
        const attachment = new AttachmentBuilder(buf, { name: 'random.png' });

        const embed = new EmbedBuilder()
            .setTitle(`🎲 Random Icon: ${text}`)
            .addFields(
                { name: 'Background', value: background, inline: true },
                { name: 'Border',     value: border,     inline: true },
                { name: 'Primary',    value: primary,    inline: true },
                { name: 'Secondary',  value: secondary,  inline: true },
                { name: 'Font',       value: font,       inline: true },
                { name: 'Glow',       value: String(glow), inline: true },
            )
            .setImage('attachment://random.png')
            .setColor(primary)
            .setFooter({ text: 'Sigil • random' });

        await interaction.editReply({ embeds: [embed], files: [attachment] });
        saveEntry(interaction.user.id, { command: 'icon', text, background, border, primary_color: primary, secondary_color: secondary, font, glow });
    },
};
