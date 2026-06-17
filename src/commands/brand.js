const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas, registerFont, loadImage } = require('canvas');
const { getFont, getFontChoices, getAllFonts } = require('../utils/fonts');
const { createTextGradient } = require('../utils/gradient');
const { getBackgroundChoices, drawBackground } = require('../utils/backgrounds');
const { drawBorder, getBorderChoices } = require('../utils/borders');

const HEX_COLOR_REGEX = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

for (const font of getAllFonts()) {
    try { registerFont(font.file, { family: font.family }); }
    catch (e) { console.error(`[ERROR] Failed to register font '${font.family}':`, e.message); }
}

// ─── Canvas helpers ───────────────────────────────────────────────────────────

async function renderIcon(ctx, { text, size, color, color2, glow, background, border, font }) {
    const W = 400, H = 400;
    await drawBackground(ctx, background, W, H, loadImage);
    if (border !== 'none') drawBorder(ctx, border, color, color2, W);

    ctx.font         = `${size}px '${font.family}'`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';

    const fill = createTextGradient(ctx, color, color2, text, W / 2, W);
    ctx.shadowColor = color;
    ctx.shadowBlur  = Number(glow);
    ctx.fillStyle   = fill;
    ctx.fillText(text, W / 2, H / 2);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur  = 0;
    ctx.fillText(text, W / 2, H / 2);
}

async function renderBanner(ctx, { text, subtitle, size, color, color2, glow, background, font }) {
    const W = 1024, H = 320;
    await drawBackground(ctx, background, W, H, loadImage);

    const textX = W / 2;
    const textY = subtitle ? H * 0.42 : H / 2;

    ctx.font         = `${size}px '${font.family}'`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';

    const fill = createTextGradient(ctx, color, color2, text, textX, W);
    ctx.shadowColor = color;
    ctx.shadowBlur  = Number(glow);
    ctx.fillStyle   = fill;
    ctx.fillText(text, textX, textY);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur  = 0;
    ctx.fillText(text, textX, textY);

    if (subtitle) {
        const subSize = Math.round(size * 0.4);
        const subY    = textY + size * 0.75;
        ctx.font      = `${subSize}px '${font.family}'`;
        const subFill = createTextGradient(ctx, color, color2, subtitle, textX, W);
        ctx.globalAlpha = 0.75;
        ctx.shadowColor = color;
        ctx.shadowBlur  = Number(glow) * 0.6;
        ctx.fillStyle   = subFill;
        ctx.fillText(subtitle, textX, subY);
        ctx.globalAlpha = 1.0;
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur  = 0;
        ctx.fillText(subtitle, textX, subY);
    }
}

/**
 * Renders a 800×200 palette card showing primary color, optional secondary,
 * and two derived shades (lightened/darkened via alpha blending).
 */
function renderPalette(color, color2) {
    const W = 800, H = 200;
    const canvas = createCanvas(W, H);
    const ctx    = canvas.getContext('2d');

    // Parse hex to RGB
    const hexToRgb = (hex) => {
        const h = hex.replace('#', '');
        const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
        const n = parseInt(full, 16);
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    };

    const blend = (rgb, target, t) =>
        rgb.map((c, i) => Math.round(c + (target[i] - c) * t));

    const toHex = (rgb) =>
        '#' + rgb.map(c => c.toString(16).padStart(2, '0')).join('');

    const [r1, g1, b1] = hexToRgb(color);
    const light1 = blend([r1, g1, b1], [255, 255, 255], 0.4);
    const dark1  = blend([r1, g1, b1], [0,   0,   0  ], 0.4);

    const swatches = [
        { hex: toHex(light1), label: 'Light'   },
        { hex: color,         label: 'Primary' },
        { hex: toHex(dark1),  label: 'Dark'    },
    ];

    if (color2) {
        const [r2, g2, b2] = hexToRgb(color2);
        const light2 = blend([r2, g2, b2], [255, 255, 255], 0.4);
        const dark2  = blend([r2, g2, b2], [0,   0,   0  ], 0.4);
        swatches.push(
            { hex: color2,         label: 'Secondary' },
            { hex: toHex(light2),  label: 'Sec Light' },
            { hex: toHex(dark2),   label: 'Sec Dark'  },
        );
    }

    const cols  = swatches.length;
    const colW  = W / cols;

    // Background
    ctx.fillStyle = '#111111';
    ctx.fillRect(0, 0, W, H);

    swatches.forEach(({ hex, label }, i) => {
        const x = i * colW;

        // Swatch block
        ctx.fillStyle = hex;
        ctx.fillRect(x + 8, 8, colW - 16, H - 56);

        // Hex label
        ctx.fillStyle    = '#ffffff';
        ctx.font         = 'bold 13px monospace';
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(hex.toUpperCase(), x + colW / 2, H - 42);

        // Role label
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.font      = '11px monospace';
        ctx.fillText(label, x + colW / 2, H - 22);
    });

    return canvas.toBuffer();
}

// ─── Command definition ───────────────────────────────────────────────────────

module.exports = {
    cooldown: 6,
    data: new SlashCommandBuilder()
        .setName('brand')
        .setDescription('Generate a complete brand kit: icon, banner, and colour palette.')
        .addSubcommand(sub =>
            sub.setName('kit')
                .setDescription('Generate icon + banner + palette in one go.')
                // ── Shared ─────────────────────────────────────────────────
                .addStringOption(o =>
                    o.setName('name')
                        .setDescription('Server / brand name (shown on banner)')
                        .setRequired(true))
                .addStringOption(o =>
                    o.setName('initials')
                        .setDescription('Short initials for the icon (1–4 chars)')
                        .setRequired(true))
                .addStringOption(o =>
                    o.setName('color')
                        .setDescription('Primary brand colour in hex (e.g. #FF4500)')
                        .setRequired(true))
                .addStringOption(o =>
                    o.setName('background')
                        .setDescription('Background style used on both icon and banner')
                        .setRequired(true)
                        .addChoices(...getBackgroundChoices()))
                // ── Optional ───────────────────────────────────────────────
                .addStringOption(o =>
                    o.setName('color2')
                        .setDescription('Optional second colour for gradients (e.g. #0000FF)')
                        .setRequired(false))
                .addStringOption(o =>
                    o.setName('tagline')
                        .setDescription('Subtitle shown under the name on the banner')
                        .setRequired(false))
                .addStringOption(o =>
                    o.setName('glow')
                        .setDescription('Glow intensity (default: Medium)')
                        .setRequired(false)
                        .addChoices(
                            { name: 'None',   value: '0'  },
                            { name: 'Low',    value: '5'  },
                            { name: 'Medium', value: '10' },
                            { name: 'High',   value: '15' },
                            { name: 'Ultra',  value: '25' },
                        ))
                .addStringOption(o =>
                    o.setName('border')
                        .setDescription('Border style on the icon (default: None)')
                        .setRequired(false)
                        .addChoices(...getBorderChoices()))
                .addStringOption(o =>
                    o.setName('font')
                        .setDescription('Font for both assets')
                        .setRequired(false)
                        .addChoices(...getFontChoices()))
        ),

    async execute(interaction) {
        if (interaction.options.getSubcommand() !== 'kit') return;

        const name      = interaction.options.getString('name');
        const initials  = interaction.options.getString('initials').slice(0, 4);
        const color     = interaction.options.getString('color');
        const color2    = interaction.options.getString('color2') || null;
        const background = interaction.options.getString('background') || 'plain-black';
        const tagline   = interaction.options.getString('tagline') || null;
        const glow      = interaction.options.getString('glow') || '10';
        const border    = interaction.options.getString('border') || 'none';
        const fontKey   = interaction.options.getString('font') || 'another-danger';

        // Validation
        if (!HEX_COLOR_REGEX.test(color))
            return interaction.reply({ content: 'Primary color must be a valid hex code (e.g. #FF4500).', ephemeral: true });
        if (color2 && !HEX_COLOR_REGEX.test(color2))
            return interaction.reply({ content: 'Secondary color must be a valid hex code (e.g. #0000FF).', ephemeral: true });
        if (name.length > 30)
            return interaction.reply({ content: 'Brand name must be 30 characters or fewer.', ephemeral: true });
        if (tagline && tagline.length > 50)
            return interaction.reply({ content: 'Tagline must be 50 characters or fewer.', ephemeral: true });

        const loadingEmbed = new EmbedBuilder()
            .setColor('#808080')
            .setDescription('✦ Crafting your brand kit… icon, banner, and palette incoming.');
        const initialReply = await interaction.reply({ embeds: [loadingEmbed] });

        try {
            const font   = getFont(fontKey);
            const params = { color, color2, glow, background, font };

            // ── Icon ────────────────────────────────────────────────────────
            const iconCanvas = createCanvas(400, 400);
            await renderIcon(iconCanvas.getContext('2d'), {
                ...params,
                text:   initials,
                size:   Math.min(150, Math.max(60, Math.floor(220 / Math.max(initials.length, 1)))),
                border,
            });
            const iconBuf = iconCanvas.toBuffer();

            // ── Banner ──────────────────────────────────────────────────────
            const bannerCanvas = createCanvas(1024, 320);
            await renderBanner(bannerCanvas.getContext('2d'), {
                ...params,
                text:     name,
                subtitle: tagline,
                size:     Math.min(90, Math.max(32, Math.floor(900 / Math.max(name.length, 1)))),
            });
            const bannerBuf = bannerCanvas.toBuffer();

            // ── Palette ─────────────────────────────────────────────────────
            const paletteBuf = renderPalette(color, color2);

            // ── Post ────────────────────────────────────────────────────────
            const colorLabel = color2 ? `${color} → ${color2}` : color;
            const footerText = `Sigil • /brand kit • ${name} • ${background} • ${colorLabel} • font: ${font.label}`;

            await initialReply.edit({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#808080')
                        .setTitle(`✦ Brand Kit — ${name}`)
                        .setDescription(
                            [
                                `**Icon** — \`${initials}\` · 400×400`,
                                `**Banner** — \`${name}\`${tagline ? ` · *${tagline}*` : ''} · 1024×320`,
                                `**Palette** — ${colorLabel}`,
                            ].join('\n')
                        )
                        .setFooter({ text: footerText }),
                ],
                files: [
                    new AttachmentBuilder(iconBuf,    { name: 'icon.png'    }),
                    new AttachmentBuilder(bannerBuf,  { name: 'banner.png'  }),
                    new AttachmentBuilder(paletteBuf, { name: 'palette.png' }),
                ],
            });
        } catch (error) {
            console.error('[ERROR] Brand kit generation failed:', error);
            await initialReply.edit({
                embeds: [new EmbedBuilder().setColor('#FF0000').setDescription('Failed to generate the brand kit. Please try again.')],
            });
        }
    },
};
