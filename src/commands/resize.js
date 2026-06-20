const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const guard = require('../utils/packageGuard');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('resize')
        .setDescription('Resize an image to Discord-friendly dimensions')
        .addAttachmentOption(opt => opt.setName('image').setDescription('Image to resize').setRequired(true))
        .addStringOption(opt => opt.setName('preset').setDescription('Target size preset').addChoices(
            { name: 'Server Icon (512×512)',    value: '512x512'   },
            { name: 'Server Banner (960×540)',  value: '960x540'   },
            { name: 'Emoji (128×128)',          value: '128x128'   },
            { name: 'Sticker (320×320)',        value: '320x320'   },
            { name: 'Profile (256×256)',        value: '256x256'   },
        ))
        .addIntegerOption(opt => opt.setName('width').setDescription('Custom width in px').setMinValue(16).setMaxValue(2048))
        .addIntegerOption(opt => opt.setName('height').setDescription('Custom height in px').setMinValue(16).setMaxValue(2048)),

    async execute(interaction) {
        if (await guard(interaction, 'nitrofree')) return;
        await interaction.deferReply();
        const img    = interaction.options.getAttachment('image');
        const preset = interaction.options.getString('preset');
        let W = interaction.options.getInteger('width');
        let H = interaction.options.getInteger('height');
        if (preset) { [W, H] = preset.split('x').map(Number); }
        if (!W || !H) { W = 512; H = 512; }
        const source = await loadImage(img.url);
        const canvas = createCanvas(W, H);
        canvas.getContext('2d').drawImage(source, 0, 0, W, H);
        const buf = canvas.toBuffer('image/png');
        const attachment = new AttachmentBuilder(buf, { name: `resized-${W}x${H}.png` });
        const embed = new EmbedBuilder()
            .setTitle('🖼️ Image Resized')
            .setDescription(`Resized to **${W} × ${H}px**.`)
            .setImage(`attachment://resized-${W}x${H}.png`)
            .setColor('#5865F2')
            .setFooter({ text: 'Sigil • resize' });
        await interaction.editReply({ embeds: [embed], files: [attachment] });
    },
};
