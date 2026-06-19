const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { saveEntry } = require('../utils/history.js');
const { RESIZE_PRESET_CHOICES, dispatchAutocomplete, autocompleteResizePreset } = require('../utils/autocomplete.js');
const { createCanvas, loadImage } = require('canvas');

const PRESET_DIMS = {
    'server-icon':    [512,  512 ],
    'banner':         [960,  540 ],
    'splash':         [1920, 1080],
    'emoji':          [128,  128 ],
    'sticker':        [320,  320 ],
    'avatar':         [256,  256 ],
    'profile-banner': [600,  240 ],
    'thumbnail':      [320,  180 ],
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('resize')
        .setDescription('Resize any image URL to Discord-optimal dimensions')
        .addStringOption(opt => opt.setName('url').setDescription('Direct link to the image').setRequired(true))
        .addStringOption(opt => opt.setName('preset').setDescription('Discord dimension preset').setAutocomplete(true)),

    async autocomplete(interaction) {
        await dispatchAutocomplete(interaction, {
            preset: autocompleteResizePreset,
        });
    },

    async execute(interaction) {
        await interaction.deferReply();

        const url    = interaction.options.getString('url');
        const preset = interaction.options.getString('preset') ?? 'server-icon';
        const [W, H] = PRESET_DIMS[preset] ?? [512, 512];

        let img;
        try {
            img = await loadImage(url);
        } catch {
            return interaction.editReply({ content: '❌ Could not load that image URL. Make sure it\'s a direct link to an image file.', ephemeral: true });
        }

        const canvas = createCanvas(W, H);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, W, H);

        const buf = canvas.toBuffer('image/png');
        const attachment = new AttachmentBuilder(buf, { name: `resized-${preset}.png` });
        const presetLabel = RESIZE_PRESET_CHOICES.find(p => p.value === preset)?.name ?? preset;

        const embed = new EmbedBuilder()
            .setTitle('🖼️ Image Resized')
            .setDescription(`Resized to **${presetLabel}** (${W}×${H}px).`)
            .setImage(`attachment://resized-${preset}.png`)
            .setColor('#5865F2')
            .setFooter({ text: 'Sigil • resize' });

        await interaction.editReply({ embeds: [embed], files: [attachment] });
        saveEntry(interaction.user.id, { command: 'resize', url, preset });
    },
};
