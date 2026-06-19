const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { registerAllFonts, renderIcon, renderBanner } = require('../utils/canvas.js');
const { saveEntry } = require('../utils/history.js');
const { TEMPLATE_CHOICES, dispatchAutocomplete, autocompleteTemplate } = require('../utils/autocomplete.js');

registerAllFonts();

const TEMPLATES = {
    'demonfall':     { primary: '#8B0000', secondary: '#ff4444', background: 'gradient-red',    border: 'glow',     font: 'Impact',           tagline: 'Enter the Demon Realm' },
    'cyber-nexus':   { primary: '#00FFFF', secondary: '#0099ff', background: 'gradient-blue',   border: 'neon',     font: 'Bebas Neue',        tagline: 'Jack In. Stand Out.' },
    'arcane-order':  { primary: '#9B59B6', secondary: '#e0aaff', background: 'gradient-purple', border: 'gradient', font: 'Playfair Display',  tagline: 'Ancient Power Awaits' },
    'cozy-den':      { primary: '#E67E22', secondary: '#f5cba7', background: 'solid-dark',      border: 'none',     font: 'Dancing Script',    tagline: 'A Place to Unwind' },
    'neon-drift':    { primary: '#FF00FF', secondary: '#00FFFF', background: 'gradient-dark',   border: 'rainbow',  font: 'Bebas Neue',        tagline: 'Drift Into the Neon' },
    'polar-ops':     { primary: '#00BFFF', secondary: '#ffffff', background: 'gradient-blue',   border: 'double',   font: 'Arial Black',       tagline: 'Cold. Calculated. Elite.' },
    'emerald-fang':  { primary: '#00FF7F', secondary: '#004d2e', background: 'gradient-green',  border: 'solid',    font: 'Oswald',            tagline: 'Fangs Out. Lights On.' },
    'void-protocol': { primary: '#1a1a2e', secondary: '#e0e0e0', background: 'solid-dark',      border: 'dashed',   font: 'Source Code Pro',   tagline: 'Protocol Initiated.' },
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('template')
        .setDescription('Load a built-in fully-themed brand template instantly')
        .addStringOption(opt => opt.setName('name').setDescription('Template name').setRequired(true).setAutocomplete(true))
        .addStringOption(opt => opt.setName('icon_text').setDescription('Override icon initials (default: first 2 chars of brand_name)'))
        .addStringOption(opt => opt.setName('brand_name').setDescription('Override the brand name shown on the banner')),

    async autocomplete(interaction) {
        await dispatchAutocomplete(interaction, {
            name: autocompleteTemplate,
        });
    },

    async execute(interaction) {
        await interaction.deferReply();

        const name      = interaction.options.getString('name');
        const brandName = interaction.options.getString('brand_name') ?? name;
        const iconText  = interaction.options.getString('icon_text')  ?? brandName.slice(0, 2).toUpperCase();

        const tpl = TEMPLATES[name];
        if (!tpl) {
            return interaction.editReply({ content: `❌ Unknown template \`${name}\`. Use autocomplete to see valid options.`, ephemeral: true });
        }

        const { primary, secondary, background, border, font, tagline } = tpl;

        const [iconBuf, bannerBuf] = await Promise.all([
            renderIcon({ text: iconText, shape: 'circle', background, border, primary, secondary, font, glow: 6, opacity: 1.0 }),
            renderBanner({ text: `${brandName}\n${tagline}`, primary, secondary, background, font, align: 'center', glow: 4, opacity: 1.0 }),
        ]);

        const iconFile   = new AttachmentBuilder(iconBuf,   { name: 'template-icon.png'   });
        const bannerFile = new AttachmentBuilder(bannerBuf, { name: 'template-banner.png' });

        const templateLabel = TEMPLATE_CHOICES.find(t => t.value === name)?.name ?? name;

        const embed = new EmbedBuilder()
            .setTitle(`🎨 Template: ${templateLabel}`)
            .setDescription(`Brand name: **${brandName}** · Tagline: *${tagline}*`)
            .setImage('attachment://template-banner.png')
            .setThumbnail('attachment://template-icon.png')
            .setColor(primary)
            .addFields(
                { name: 'Primary',    value: primary,    inline: true },
                { name: 'Secondary',  value: secondary,  inline: true },
                { name: 'Border',     value: border,     inline: true },
                { name: 'Font',       value: font,       inline: true },
            )
            .setFooter({ text: 'Sigil • template — use /brand kit to customise further' });

        await interaction.editReply({ embeds: [embed], files: [iconFile, bannerFile] });
        saveEntry(interaction.user.id, { command: 'template', name, brand_name: brandName, icon_text: iconText });
    },
};
