const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas, registerFont, loadImage } = require('canvas');
const { getFont, getFontChoices, getAllFonts } = require('../utils/fonts');
const { createTextGradient } = require('../utils/gradient');
const { getBackgroundChoices, drawBackground } = require('../utils/backgrounds');
const { drawBorder, getBorderChoices } = require('../utils/borders');
const { geminiRequest, geminiImageRequest, extractJson } = require('../utils/gemini');
const { getColorAutocomplete } = require('../utils/colors');

const HEX_COLOR_REGEX = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

const VALID_BACKGROUNDS = [
    'plain-black', 'plain-white', 'midnight-gradient',
    'sunset', 'forest', 'cyberpunk-grid', 'starfield', 'carbon-fiber',
];

// Keys MUST match drawBorder() / getBorderChoices() exactly
const VALID_BORDERS = [
    'none', 'solid', 'glow', 'gradient', 'double', 'dashed', 'corner', 'neon',
];

for (const font of getAllFonts()) {
    try { registerFont(font.file, { family: font.family }); }
    catch (e) { console.error(`[ERROR] Failed to register font '${font.family}':`, e.message); }
}

// ── Parse AI kit response ──────────────────────────────────────────────────

function parseAiKitResponse(raw) {
    const p   = extractJson(raw);
    const hex = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;
    return {
        name:       typeof p.name       === 'string' ? p.name.slice(0, 30).trim()                        : 'My Server',
        initials:   typeof p.initials   === 'string' ? p.initials.slice(0, 4).toUpperCase().trim()        : 'SRV',
        color:      hex.test(p.color)                ? p.color                                             : '#FFFFFF',
        color2:     p.color2 && hex.test(p.color2)   ? p.color2                                            : null,
        background: VALID_BACKGROUNDS.includes(p.background) ? p.background                               : 'plain-black',
        border:     VALID_BORDERS.includes(p.border)          ? p.border                                   : 'none',
        glow:       ['0','5','10','15','25'].includes(String(p.glow)) ? String(p.glow)                     : '10',
        tagline:    typeof p.tagline    === 'string' ? p.tagline.slice(0, 60).trim()                       : '',
        rationale:  typeof p.rationale  === 'string' ? p.rationale.slice(0, 300).trim()                   : '',
    };
}

// ── Canvas helpers ─────────────────────────────────────────────────────────

async function renderIcon(ctx, { text, size, color, color2, glow, background, border, font }) {
    const W = 400, H = 400;
    await drawBackground(ctx, background, W, H, loadImage);
    if (border && border !== 'none') drawBorder(ctx, border, color, color2, W);
    ctx.font = `${size}px '${font.family}'`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const fill = createTextGradient(ctx, color, color2, text, W / 2, W);
    ctx.shadowColor = color; ctx.shadowBlur = Number(glow);
    ctx.fillStyle = fill;
    ctx.fillText(text, W / 2, H / 2);
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
    ctx.fillText(text, W / 2, H / 2);
}

async function renderBanner(ctx, { text, subtitle, size, color, color2, glow, background, font }) {
    const W = 1024, H = 320;
    await drawBackground(ctx, background, W, H, loadImage);
    const textX = W / 2;
    const textY = subtitle ? H * 0.42 : H / 2;
    ctx.font = `${size}px '${font.family}'`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const fill = createTextGradient(ctx, color, color2, text, textX, W);
    ctx.shadowColor = color; ctx.shadowBlur = Number(glow);
    ctx.fillStyle = fill;
    ctx.fillText(text, textX, textY);
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
    ctx.fillText(text, textX, textY);
    if (subtitle) {
        const subSize = Math.round(size * 0.4);
        const subY    = textY + size * 0.75;
        ctx.font      = `${subSize}px '${font.family}'`;
        const subFill = createTextGradient(ctx, color, color2, subtitle, textX, W);
        ctx.globalAlpha = 0.75;
        ctx.shadowColor = color; ctx.shadowBlur = Number(glow) * 0.6;
        ctx.fillStyle   = subFill;
        ctx.fillText(subtitle, textX, subY);
        ctx.globalAlpha = 1.0;
        ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
        ctx.fillText(subtitle, textX, subY);
    }
}

function renderPalette(color, color2) {
    const W = 800, H = 200;
    const canvas = createCanvas(W, H);
    const ctx    = canvas.getContext('2d');
    const hexToRgb = hex => { const h = hex.replace('#',''); const full = h.length===3?h.split('').map(c=>c+c).join(''):h; const n=parseInt(full,16); return [(n>>16)&255,(n>>8)&255,n&255]; };
    const blend   = (rgb, t, w) => rgb.map((c,i) => Math.round(c+(w[i]-c)*t));
    const toHex   = rgb => '#'+rgb.map(c=>c.toString(16).padStart(2,'0')).join('');
    const [r1,g1,b1] = hexToRgb(color);
    const swatches = [
        { hex: toHex(blend([r1,g1,b1], 0.4, [255,255,255])), label: 'Light'   },
        { hex: color,                                          label: 'Primary' },
        { hex: toHex(blend([r1,g1,b1], 0.4, [0,0,0])),       label: 'Dark'    },
    ];
    if (color2) {
        const [r2,g2,b2] = hexToRgb(color2);
        swatches.push(
            { hex: color2,                                          label: 'Secondary' },
            { hex: toHex(blend([r2,g2,b2], 0.4, [255,255,255])),   label: 'Sec Light' },
            { hex: toHex(blend([r2,g2,b2], 0.4, [0,0,0])),         label: 'Sec Dark'  },
        );
    }
    const colW = W / swatches.length;
    ctx.fillStyle = '#111111'; ctx.fillRect(0, 0, W, H);
    swatches.forEach(({ hex, label }, i) => {
        ctx.fillStyle = hex;
        ctx.fillRect(i * colW + 6, 6, colW - 12, H - 52);
        ctx.fillStyle = '#ffffff'; ctx.font = 'bold 13px monospace';
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.fillText(hex.toUpperCase(), i * colW + colW / 2, H - 40);
        ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.font = '11px monospace';
        ctx.fillText(label, i * colW + colW / 2, H - 20);
    });
    return canvas.toBuffer();
}

// ── Command ────────────────────────────────────────────────────────────────

module.exports = {
    cooldown: 8,

    data: new SlashCommandBuilder()
        .setName('brand')
        .setDescription('Brand kit tools: manual or fully AI-designed.')
        .addSubcommand(sub =>
            sub.setName('kit')
                .setDescription('Generate icon + banner + palette manually.')
                .addStringOption(o => o.setName('name').setDescription('Brand/server name').setRequired(true))
                .addStringOption(o => o.setName('initials').setDescription('Short initials for the icon (1–4 chars)').setRequired(true))
                .addStringOption(o =>
                    o.setName('color')
                        .setDescription('Primary colour — pick a preset or type a hex code like #FF4500')
                        .setRequired(true)
                        .setAutocomplete(true)
                )
                .addStringOption(o => o.setName('background').setDescription('Background style').setRequired(true).addChoices(...getBackgroundChoices()))
                .addStringOption(o =>
                    o.setName('color2')
                        .setDescription('Optional second colour for gradients — pick a preset or type a hex code')
                        .setRequired(false)
                        .setAutocomplete(true)
                )
                .addStringOption(o => o.setName('tagline').setDescription('Subtitle on the banner').setRequired(false))
                .addStringOption(o => o.setName('glow').setDescription('Glow intensity (default: Medium)').setRequired(false).addChoices(
                    { name: 'None',   value: '0'  },
                    { name: 'Low',    value: '5'  },
                    { name: 'Medium', value: '10' },
                    { name: 'High',   value: '15' },
                    { name: 'Ultra',  value: '25' },
                ))
                .addStringOption(o => o.setName('border').setDescription('Icon border style').setRequired(false).addChoices(...getBorderChoices()))
                .addStringOption(o => o.setName('font').setDescription('Font for both assets').setRequired(false).addChoices(...getFontChoices()))
        )
        .addSubcommand(sub =>
            sub.setName('ai')
                .setDescription('Describe your server — Gemini designs the full brand kit + generates a custom image.')
                .addStringOption(o =>
                    o.setName('description')
                        .setDescription('Describe your server in plain English (e.g. "dark fantasy RPG with dragons")')
                        .setRequired(true)
                        .setMaxLength(200))
                .addStringOption(o =>
                    o.setName('image_prompt')
                        .setDescription('Describe the image to generate — min 8 words (e.g. "dark mystical forest with glowing runes at dusk")')
                        .setRequired(true)
                        .setMaxLength(300))
                .addStringOption(o =>
                    o.setName('name')
                        .setDescription('Override the server name (optional — Gemini suggests one if omitted)')
                        .setRequired(false)
                        .setMaxLength(30))
        ),

    // ── Autocomplete ────────────────────────────────────────────────────────
    async autocomplete(interaction) {
        const focused = interaction.options.getFocused(true);
        if (focused.name === 'color' || focused.name === 'color2') {
            const choices = getColorAutocomplete(focused.value);
            await interaction.respond(choices);
        }
    },

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();

        // ── /brand kit ────────────────────────────────────────────────────
        if (sub === 'kit') {
            const name       = interaction.options.getString('name');
            const initials   = interaction.options.getString('initials').slice(0, 4);
            const color      = interaction.options.getString('color');
            const color2     = interaction.options.getString('color2') || null;
            const background = interaction.options.getString('background') || 'plain-black';
            const tagline    = interaction.options.getString('tagline') || null;
            const glow       = interaction.options.getString('glow') || '10';
            const border     = interaction.options.getString('border') || 'none';
            const fontKey    = interaction.options.getString('font') || 'another-danger';

            if (!HEX_COLOR_REGEX.test(color))
                return interaction.reply({ content: '❌ Primary color must be a valid hex code (e.g. #FF4500). Pick from the dropdown or type a hex.', ephemeral: true });
            if (color2 && !HEX_COLOR_REGEX.test(color2))
                return interaction.reply({ content: '❌ Secondary color must be a valid hex code. Pick from the dropdown or type a hex.', ephemeral: true });

            const loadingEmbed = new EmbedBuilder().setColor('#808080').setDescription('✦ Crafting your brand kit…');
            const initialReply = await interaction.reply({ embeds: [loadingEmbed] });

            try {
                const font   = getFont(fontKey);
                const params = { color, color2, glow, background, font };
                const iconCanvas   = createCanvas(400, 400);
                const bannerCanvas = createCanvas(1024, 320);

                await Promise.all([
                    renderIcon(iconCanvas.getContext('2d'), {
                        ...params, text: initials, border,
                        size: Math.min(150, Math.max(60, Math.floor(220 / Math.max(initials.length, 1)))),
                    }),
                    renderBanner(bannerCanvas.getContext('2d'), {
                        ...params, text: name, subtitle: tagline,
                        size: Math.min(90, Math.max(32, Math.floor(900 / Math.max(name.length, 1)))),
                    }),
                ]);

                const paletteBuf = renderPalette(color, color2);
                const colorLabel = color2 ? `${color} → ${color2}` : color;

                await initialReply.edit({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#808080')
                            .setTitle(`✦ Brand Kit — ${name}`)
                            .setDescription([
                                `**Icon** — \`${initials}\` · 400×400`,
                                `**Banner** — \`${name}\`${tagline ? ` · *${tagline}*` : ''} · 1024×320`,
                                `**Palette** — ${colorLabel}`,
                            ].join('\n'))
                            .setFooter({ text: `Sigil • /brand kit • ${name} • ${background} • ${colorLabel}` }),
                    ],
                    files: [
                        new AttachmentBuilder(iconCanvas.toBuffer(),   { name: 'icon.png'    }),
                        new AttachmentBuilder(bannerCanvas.toBuffer(), { name: 'banner.png'  }),
                        new AttachmentBuilder(paletteBuf,              { name: 'palette.png' }),
                    ],
                });
            } catch (err) {
                console.error('[ERROR] /brand kit failed:', err);
                await initialReply.edit({ embeds: [new EmbedBuilder().setColor('#FF0000').setDescription('Failed to generate the brand kit. Please try again.')] });
            }
            return;
        }

        // ── /brand ai ─────────────────────────────────────────────────────
        if (sub === 'ai') {
            const description  = interaction.options.getString('description').trim();
            const imagePrompt  = interaction.options.getString('image_prompt').trim();
            const nameOverride = interaction.options.getString('name') || null;

            if (!process.env.GEMINI_API_KEY)
                return interaction.reply({ content: '❌ `GEMINI_API_KEY` is not configured.', ephemeral: true });

            // Enforce 8-word minimum on image prompt
            const wordCount = imagePrompt.split(/\s+/).filter(Boolean).length;
            if (wordCount < 8)
                return interaction.reply({
                    content: `❌ Your image prompt is too short (**${wordCount} word${wordCount === 1 ? '' : 's'}**). Use at least **8 words** so Gemini has enough detail to generate something great.\n\n*Example: "dark mystical forest with glowing ancient runes at dusk"*`,
                    ephemeral: true,
                });

            const loadingEmbed = new EmbedBuilder()
                .setColor('#808080')
                .setDescription(`✦ Gemini is designing your brand kit and generating your image…\n*"${description}"*`);
            const initialReply = await interaction.reply({ embeds: [loadingEmbed] });

            // Tight JSON-only prompt — no prose preamble to keep tokens low
            const kitPrompt =
`Server description: "${description}"
${nameOverride ? `Server name: "${nameOverride}"` : 'Suggest a short punchy server name.'}

Available backgrounds: ${VALID_BACKGROUNDS.join(', ')}
Available borders: ${VALID_BORDERS.join(', ')}

Return ONLY a JSON object with these keys:
  name (string, max 30 chars${nameOverride ? `, use "${nameOverride}"` : ''})
  initials (string, 1-4 uppercase chars)
  color (hex string, e.g. "#FF4500")
  color2 (hex string or null)
  background (one of the available backgrounds)
  border (one of the available borders)
  glow (one of: "0" "5" "10" "15" "25")
  tagline (string, max 8 words)
  rationale (string, 1-2 sentences)

Start with { and end with }. Nothing else.`;

            // Enhance image prompt with branding context
            const enhancedImagePrompt = `Discord server branding art: ${imagePrompt}. High quality, vibrant, detailed, suitable for a server banner or promotional image.`;

            try {
                await initialReply.edit({
                    embeds: [new EmbedBuilder().setColor('#808080')
                        .setDescription(`✦ Running in parallel…\n\n**1.** Designing brand kit\n**2.** Generating image: *"${imagePrompt}"*`)],
                });

                // Kit design + image generation run simultaneously
                const [rawResult, imageBuf] = await Promise.allSettled([
                    geminiRequest(kitPrompt, { temperature: 1.0, maxOutputTokens: 256 }),
                    geminiImageRequest(enhancedImagePrompt),
                ]);

                if (rawResult.status === 'rejected')
                    throw new Error(`Brand kit design failed: ${rawResult.reason?.message}`);

                const kit    = parseAiKitResponse(rawResult.value);
                const font   = getFont('another-danger');
                const params = { color: kit.color, color2: kit.color2, glow: kit.glow, background: kit.background, font };

                const iconCanvas   = createCanvas(400, 400);
                const bannerCanvas = createCanvas(1024, 320);

                await Promise.all([
                    renderIcon(iconCanvas.getContext('2d'), {
                        ...params, text: kit.initials, border: kit.border,
                        size: Math.min(150, Math.max(60, Math.floor(220 / Math.max(kit.initials.length, 1)))),
                    }),
                    renderBanner(bannerCanvas.getContext('2d'), {
                        ...params, text: kit.name, subtitle: kit.tagline,
                        size: Math.min(90, Math.max(32, Math.floor(900 / Math.max(kit.name.length, 1)))),
                    }),
                ]);

                const paletteBuf = renderPalette(kit.color, kit.color2);
                const colorLabel = kit.color2 ? `${kit.color} → ${kit.color2}` : kit.color;

                const files = [
                    new AttachmentBuilder(iconCanvas.toBuffer(),   { name: 'icon.png'    }),
                    new AttachmentBuilder(bannerCanvas.toBuffer(), { name: 'banner.png'  }),
                    new AttachmentBuilder(paletteBuf,              { name: 'palette.png' }),
                ];

                let imageNote = '';
                if (imageBuf.status === 'fulfilled') {
                    files.push(new AttachmentBuilder(imageBuf.value, { name: 'generated-image.png' }));
                    imageNote = '\n🎨 **Generated Image** — attached above';
                } else {
                    console.warn('[WARN] /brand ai image gen failed (non-fatal):', imageBuf.reason?.message);
                    imageNote = `\n⚠️ Image generation failed: *${imageBuf.reason?.message || 'unknown error'}* — requires a paid Gemini API key.`;
                }

                await initialReply.edit({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(kit.color)
                            .setTitle(`✦ AI Brand Kit — ${kit.name}`)
                            .setDescription([
                                kit.tagline   ? `*"${kit.tagline}"*\n`           : '',
                                `**Icon** — \`${kit.initials}\` · 400×400`,
                                `**Banner** — \`${kit.name}\` · 1024×320`,
                                `**Palette** — ${colorLabel}`,
                                `**Background** — \`${kit.background}\``,
                                `**Border** — \`${kit.border}\``,
                                `**Glow** — ${kit.glow}`,
                                imageNote,
                                '',
                                kit.rationale ? `🧠 *${kit.rationale}*` : '',
                                '',
                                '⚡ Use these values in `/brand kit` to tweak.',
                            ].filter(Boolean).join('\n'))
                            .setFooter({ text: `Sigil • /brand ai • powered by Gemini` }),
                    ],
                    files,
                });
            } catch (err) {
                console.error('[ERROR] /brand ai failed:', err);
                await initialReply.edit({
                    embeds: [new EmbedBuilder().setColor('#FF0000').setDescription(`Failed to generate AI brand kit. ${err.message || 'Please try again.'}`)],
                });
            }
        }
    },
};
