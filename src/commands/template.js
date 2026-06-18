const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { registerAllFonts, renderKit } = require('../utils/canvas.js');
const { saveEntry } = require('../utils/history.js');

registerAllFonts();

const TEMPLATES = [
    {
        id: 'demonfall', name: 'Demonfall', tag: 'Dark Fantasy',
        primary: '#8B0000', secondary: '#4B0082',
        background: 'inferno', border: 'glow',
        font: 'Arial Black', glow: 15, opacity: 0.85, shape: 'circle',
        brandName: 'Demonfall', tagline: 'Unleash the Darkness. Fight the Demons.', iconText: 'DF',
    },
    {
        id: 'cyber-nexus', name: 'Cyber Nexus', tag: 'Cyberpunk',
        primary: '#00FFFF', secondary: '#FF00FF',
        background: 'neon-city', border: 'solid',
        font: 'Source Code Pro', glow: 20, opacity: 0.90, shape: 'square',
        brandName: 'Cyber Nexus', tagline: 'Jack In. Level Up. Own the Grid.', iconText: 'CN',
    },
    {
        id: 'arcane-order', name: 'Arcane Order', tag: 'Fantasy RPG',
        primary: '#9966CC', secondary: '#FFD700',
        background: 'twilight', border: 'gradient',
        font: 'Playfair Display', glow: 12, opacity: 0.88, shape: 'hexagon',
        brandName: 'Arcane Order', tagline: 'Knowledge is Power. Magic is Law.', iconText: 'AO',
    },
    {
        id: 'cozy-den', name: 'Cozy Den', tag: 'Community',
        primary: '#FF6B35', secondary: '#FFD700',
        background: 'sunset-fade', border: 'none',
        font: 'Dancing Script', glow: 5, opacity: 0.80, shape: 'rounded',
        brandName: 'Cozy Den', tagline: 'Your Home Away From Home.', iconText: 'CD',
    },
    {
        id: 'neon-drift', name: 'Neon Drift', tag: 'Racing / Sports',
        primary: '#FF4500', secondary: '#FFBF00',
        background: 'deep-space', border: 'dashed',
        font: 'Bebas Neue', glow: 18, opacity: 0.92, shape: 'diamond',
        brandName: 'Neon Drift', tagline: 'No Limits. Full Speed.', iconText: 'ND',
    },
    {
        id: 'polar-ops', name: 'Polar Ops', tag: 'Tactical FPS',
        primary: '#7DF9FF', secondary: '#001F5B',
        background: 'polar', border: 'double',
        font: 'Impact', glow: 8, opacity: 0.95, shape: 'square',
        brandName: 'Polar Ops', tagline: 'Cold. Calculated. Lethal.', iconText: 'PO',
    },
    {
        id: 'emerald-fang', name: 'Emerald Fang', tag: 'Survival / RPG',
        primary: '#39FF14', secondary: '#228B22',
        background: 'forest-night', border: 'solid',
        font: 'Oswald', glow: 14, opacity: 0.87, shape: 'hexagon',
        brandName: 'Emerald Fang', tagline: 'Hunt or Be Hunted.', iconText: 'EF',
    },
    {
        id: 'void-protocol', name: 'Void Protocol', tag: 'Sci-Fi',
        primary: '#C0C0C0', secondary: '#6600CC',
        background: 'void', border: 'glow',
        font: 'Bebas Neue', glow: 10, opacity: 1.0, shape: 'circle',
        brandName: 'Void Protocol', tagline: 'Beyond the Event Horizon.', iconText: 'VP',
    },
];

const TEMPLATE_CHOICES = TEMPLATES.map(t => ({ name: `${t.name} — ${t.tag}`, value: t.id }));

module.exports = {
    data: new SlashCommandBuilder()
        .setName('template')
        .setDescription('Load a built-in brand template and generate its full kit')
        .addStringOption(opt =>
            opt.setName('name')
                .setDescription('Choose a template')
                .setRequired(true)
                .addChoices(...TEMPLATE_CHOICES)
        )
        .addStringOption(opt =>
            opt.setName('icon_text')
                .setDescription('Override the icon text (default: template default)')
        )
        .addStringOption(opt =>
            opt.setName('brand_name')
                .setDescription('Override the brand name')
        ),

    async execute(interaction) {
        await interaction.deferReply();

        const id  = interaction.options.getString('name');
        const tpl = TEMPLATES.find(t => t.id === id);

        if (!tpl) {
            return interaction.editReply('❌ Template not found.');
        }

        const brandName = interaction.options.getString('brand_name') ?? tpl.brandName;
        const iconText  = (interaction.options.getString('icon_text') ?? tpl.iconText).toUpperCase().slice(0, 4);

        const { iconBuf, bannerBuf, paletteBuf } = await renderKit({
            text:       iconText,
            subtitle:   tpl.tagline,
            background: tpl.background,
            border:     tpl.border,
            primary:    tpl.primary,
            secondary:  tpl.secondary,
            font:       tpl.font,
            glow:       tpl.glow,
            opacity:    tpl.opacity,
            shape:      tpl.shape,
        });

        const files = [
            new AttachmentBuilder(iconBuf,    { name: 'icon.png'    }),
            new AttachmentBuilder(bannerBuf,  { name: 'banner.png'  }),
            new AttachmentBuilder(paletteBuf, { name: 'palette.png' }),
        ];

        const embed = new EmbedBuilder()
            .setTitle(`✦ ${brandName} — ${tpl.tag}`)
            .setDescription(tpl.tagline)
            .setImage('attachment://banner.png')
            .setThumbnail('attachment://icon.png')
            .setColor(tpl.primary)
            .addFields(
                { name: 'Template',   value: tpl.name,           inline: true },
                { name: 'Shape',      value: tpl.shape,          inline: true },
                { name: 'Background', value: tpl.background,     inline: true },
                { name: 'Border',     value: tpl.border,         inline: true },
                { name: 'Font',       value: tpl.font,           inline: true },
                { name: 'Glow',       value: String(tpl.glow),   inline: true },
                { name: 'Primary',    value: tpl.primary,        inline: true },
                { name: 'Secondary',  value: tpl.secondary,      inline: true },
            )
            .setFooter({ text: 'Sigil • template — use /gui open to customise in the Visual Builder' });

        await interaction.editReply({ embeds: [embed], files });

        saveEntry(interaction.user.id, {
            command:         'template',
            text:            iconText,
            background:      tpl.background,
            border:          tpl.border,
            primary_color:   tpl.primary,
            secondary_color: tpl.secondary,
            font:            tpl.font,
            glow:            tpl.glow,
            shape:           tpl.shape,
        });
    },
};
