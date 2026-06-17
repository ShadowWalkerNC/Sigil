const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas, registerFont, loadImage } = require('canvas');
const { getFont, getFontChoices, getAllFonts } = require('../utils/fonts');
const { createTextGradient } = require('../utils/gradient');
const { getBackgroundChoices, drawBackground } = require('../utils/backgrounds');
const { drawBorder, getBorderChoices } = require('../utils/borders');
const https = require('https');

const HEX_COLOR_REGEX = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

const VALID_BACKGROUNDS = [
    'plain-black', 'plain-white', 'midnight-gradient',
    'sunset', 'forest', 'cyberpunk-grid', 'starfield', 'carbon-fiber',
];

const VALID_BORDERS = [
    'none', 'solid', 'glow-ring', 'gradient-ring',
    'neon', 'double', 'dashed', 'shadow-ring', 'pulse',
];

for (const font of getAllFonts()) {
    try { registerFont(font.file, { family: font.family }); }
    catch (e) { console.error(`[ERROR] Failed to register font '${font.family}':`, e.message); }
}

// ── Gemini helper ─────────────────────────────────────────────────────────

function geminiRequest(prompt) {
    return new Promise((resolve, reject) => {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) return reject(new Error('GEMINI_API_KEY is not set.'));

        const body = JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 1.1, maxOutputTokens: 768 },
        });

        const req = https.request({
            hostname: 'generativelanguage.googleapis.com',
            path:     `/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
            method:   'POST',
            headers:  { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    const text   = parsed?.candidates?.[0]?.content?.parts?.[0]?.text || '';
                    resolve(text.trim());
                } catch (e) { reject(new Error('Failed to parse Gemini response.')); }
            });
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

// ── Parse AI kit response ──────────────────────────────────────────────────

function parseAiKitResponse(raw) {
    const cleaned = raw.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
    let p;
    try { p = JSON.parse(cleaned); } catch { throw new Error('Gemini returned invalid JSON.'); }

    const hex = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

    return {
        name:       typeof p.name       === 'string' ? p.name.slice(0, 30)      : 'My Server',
        initials:   typeof p.initials   === 'string' ? p.initials.slice(0, 4).toUpperCase() : 'SRV',
        color:      hex.test(p.color)                ? p.color                   : '#FFFFFF',
        color2:     p.color2 && hex.test(p.color2)   ? p.color2                  : null,
        background: VALID_BACKGROUNDS.includes(p.background) ? p.background     : 'plain-black',
        border:     VALID_BORDERS.includes(p.border)          ? p.border         : 'none',
        glow:       ['0','5','10','15','25'].includes(String(p.glow)) ? String(p.glow) : '10',
        tagline:    typeof p.tagline    === 'string' ? p.tagline.slice(0, 60)    : '',
        rationale:  typeof p.rationale  === 'string' ? p.rationale.slice(0, 300) : '',
    };
}

// ── Canvas helpers ─────────────────────────────────────────────────────────

async function renderIcon(ctx, { text, size, color, color2, glow, background, border, font }) {
    const W = 400, H = 400;
    await drawBackground(ctx, background, W, H, loadImage);
    if (border !== 'none') drawBorder(ctx, border, color, color2, W);
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

        // ── /brand kit (manual) ───────────────────────────────────────────
        .addSubcommand(sub =>
            sub.setName('kit')
                .setDescription('Generate icon + banner + palette manually.')
                .addStringOption(o => o.setName('name').setDescription('Brand/server name').setRequired(true))
                .addStringOption(o => o.setName('initials').setDescription('Short initials for the icon (1–4 chars)').setRequired(true))
                .addStringOption(o => o.setName('color').setDescription('Primary colour hex (e.g. #FF4500)').setRequired(true))
                .addStringOption(o => o.setName('background').setDescription('Background style').setRequired(true).addChoices(...getBackgroundChoices()))
                .addStringOption(o => o.setName('color2').setDescription('Optional second colour for gradients').setRequired(false))
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

        // ── /brand ai (AI-designed) ────────────────────────────────────────
        .addSubcommand(sub =>
            sub.setName('ai')
                .setDescription('Describe your server — Gemini designs the full brand kit automatically.')
                .addStringOption(o =>
                    o.setName('description')
                        .setDescription('Describe your server in plain English (e.g. "dark fantasy RPG with dragons")')
                        .setRequired(true)
                        .setMaxLength(200))
                .addStringOption(o =>
                    o.setName('name')
                        .setDescription('Override the server name (optional — Gemini suggests one if omitted)')
                        .setRequired(false)
                        .setMaxLength(30))
        ),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();

        // ══════════════════════════════════════════════════
        // /brand kit — manual
        // ══════════════════════════════════════════════════
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
                return interaction.reply({ content: 'Primary color must be a valid hex code (e.g. #FF4500).', ephemeral: true });
            if (color2 && !HEX_COLOR_REGEX.test(color2))
                return interaction.reply({ content: 'Secondary color must be a valid hex code.', ephemeral: true });
            if (name.length > 30)
                return interaction.reply({ content: 'Brand name must be 30 characters or fewer.', ephemeral: true });

            const loadingEmbed = new EmbedBuilder().setColor('#808080').setDescription('✦ Crafting your brand kit…');
            const initialReply = await interaction.reply({ embeds: [loadingEmbed] });

            try {
                const font   = getFont(fontKey);
                const params = { color, color2, glow, background, font };

                const iconCanvas = createCanvas(400, 400);
                await renderIcon(iconCanvas.getContext('2d'), {
                    ...params, text: initials, border,
                    size: Math.min(150, Math.max(60, Math.floor(220 / Math.max(initials.length, 1)))),
                });

                const bannerCanvas = createCanvas(1024, 320);
                await renderBanner(bannerCanvas.getContext('2d'), {
                    ...params, text: name, subtitle: tagline,
                    size: Math.min(90, Math.max(32, Math.floor(900 / Math.max(name.length, 1)))),
                });

                const paletteBuf   = renderPalette(color, color2);
                const colorLabel   = color2 ? `${color} → ${color2}` : color;

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
                            .setFooter({ text: `Sigil • /brand kit • ${name} • ${background} • ${colorLabel} • font: ${getFont(fontKey).label}` }),
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

        // ══════════════════════════════════════════════════
        // /brand ai — Gemini designs everything
        // ══════════════════════════════════════════════════
        if (sub === 'ai') {
            const description = interaction.options.getString('description').trim();
            const nameOverride = interaction.options.getString('name') || null;

            if (!process.env.GEMINI_API_KEY)
                return interaction.reply({ content: '❌ `GEMINI_API_KEY` is not configured.', ephemeral: true });

            const loadingEmbed = new EmbedBuilder()
                .setColor('#808080')
                .setDescription(`✦ Gemini is designing your brand kit…\n*"${description}"*`);
            const initialReply = await interaction.reply({ embeds: [loadingEmbed] });

            const prompt = `You are an expert Discord server branding designer.

The user wants a complete brand kit for their Discord server.
Server description: "${description}"
${nameOverride ? `Server name (use this exactly): "${nameOverride}"` : 'Suggest a short, punchy server name that fits the description.'}

Available backgrounds: ${VALID_BACKGROUNDS.map(b => `"${b}"`).join(', ')}
Available borders: ${VALID_BORDERS.map(b => `"${b}"`).join(', ')}

Return ONLY a raw JSON object (no markdown, no explanation) with these exact keys:
- "name"       : server name (max 30 chars)${nameOverride ? ` — use "${nameOverride}"` : ''}
- "initials"   : 1–4 char initials for the icon (e.g. "DRG" for a dragon server)
- "color"      : primary brand hex color (e.g. "#FF4500")
- "color2"     : secondary hex for gradient — null if not needed
- "background" : best background key from the list above
- "border"     : best border style from the list above
- "glow"       : one of "0", "5", "10", "15", "25"
- "tagline"    : short punchy tagline, max 8 words
- "rationale"  : 1–2 sentences explaining your design choices

Only return the JSON object. No extra text.`;

            try {
                const raw  = await geminiRequest(prompt);
                const kit  = parseAiKitResponse(raw);
                const font = getFont('another-danger');
                const params = { color: kit.color, color2: kit.color2, glow: kit.glow, background: kit.background, font };

                // Render assets in parallel
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

                await initialReply.edit({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(kit.color)
                            .setTitle(`✦ AI Brand Kit — ${kit.name}`)
                            .setDescription([
                                kit.tagline    ? `*“${kit.tagline}”*\n` : '',
                                `**Icon** — \`${kit.initials}\` · 400×400`,
                                `**Banner** — \`${kit.name}\` · 1024×320`,
                                `**Palette** — ${colorLabel}`,
                                `**Background** — \`${kit.background}\``,
                                `**Border** — \`${kit.border}\``,
                                `**Glow** — ${kit.glow}`,
                                '',
                                kit.rationale  ? `🧠 *${kit.rationale}*` : '',
                                '',
                                '⚡ Use these values in `/brand kit` to regenerate or tweak.',
                            ].filter(Boolean).join('\n'))
                            .setFooter({ text: `Sigil • /brand ai • powered by Gemini` }),
                    ],
                    files: [
                        new AttachmentBuilder(iconCanvas.toBuffer(),   { name: 'icon.png'    }),
                        new AttachmentBuilder(bannerCanvas.toBuffer(), { name: 'banner.png'  }),
                        new AttachmentBuilder(paletteBuf,              { name: 'palette.png' }),
                    ],
                });
            } catch (err) {
                console.error('[ERROR] /brand ai failed:', err);
                await initialReply.edit({ embeds: [new EmbedBuilder().setColor('#FF0000').setDescription(`Failed to generate AI brand kit. ${err.message || 'Please try again.'}`)] });
            }
        }
    },
};
