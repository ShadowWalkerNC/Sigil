const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas, registerFont, loadImage }                 = require('canvas');
const { getFont, getAllFonts }                                   = require('../utils/fonts');
const { createTextGradient }                                     = require('../utils/gradient');
const { drawBackground }                                         = require('../utils/backgrounds');
const { geminiRequest, extractJson }                             = require('../utils/gemini');

const VALID_BACKGROUNDS = [
    'plain-black', 'plain-white', 'midnight-gradient',
    'sunset', 'forest', 'cyberpunk-grid', 'starfield', 'carbon-fiber',
];

for (const font of getAllFonts()) {
    try { registerFont(font.file, { family: font.family }); }
    catch (e) { console.error(`[ERROR] Failed to register font '${font.family}':`, e.message); }
}

function parseMoodResponse(raw) {
    const p   = extractJson(raw);
    const hex = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;
    return {
        color:      hex.test(p.color)                        ? p.color                                           : '#FFFFFF',
        color2:     p.color2 && hex.test(p.color2)           ? p.color2                                          : null,
        background: VALID_BACKGROUNDS.includes(p.background) ? p.background                                      : 'plain-black',
        tagline:    typeof p.tagline === 'string'             ? p.tagline.slice(0, 60).trim()                     : '',
        glow:       ['0','5','10','15','25'].includes(String(p.glow)) ? String(p.glow)                            : '10',
    };
}

function renderPalette(color, color2) {
    const W = 800, H = 180;
    const canvas = createCanvas(W, H);
    const ctx    = canvas.getContext('2d');
    const hexToRgb = hex => { const h=hex.replace('#',''); const full=h.length===3?h.split('').map(c=>c+c).join(''):h; const n=parseInt(full,16); return [(n>>16)&255,(n>>8)&255,n&255]; };
    const blend  = (rgb, t, w) => rgb.map((c,i) => Math.round(c+(w[i]-c)*t));
    const toHex  = rgb => '#'+rgb.map(c=>c.toString(16).padStart(2,'0')).join('');
    const [r1,g1,b1] = hexToRgb(color);
    const swatches = [
        { hex: toHex(blend([r1,g1,b1], 0.45, [255,255,255])), label: 'Light'   },
        { hex: color,                                           label: 'Primary' },
        { hex: toHex(blend([r1,g1,b1], 0.40, [0,0,0])),       label: 'Dark'    },
    ];
    if (color2) {
        const [r2,g2,b2] = hexToRgb(color2);
        swatches.push(
            { hex: color2,                                           label: 'Secondary' },
            { hex: toHex(blend([r2,g2,b2], 0.45, [255,255,255])),   label: 'Sec Light' },
            { hex: toHex(blend([r2,g2,b2], 0.40, [0,0,0])),         label: 'Sec Dark'  },
        );
    }
    const colW = W / swatches.length;
    ctx.fillStyle = '#0e0e0e'; ctx.fillRect(0, 0, W, H);
    swatches.forEach(({ hex, label }, i) => {
        ctx.fillStyle = hex;
        ctx.fillRect(i*colW+6, 6, colW-12, H-50);
        ctx.fillStyle='#ffffff'; ctx.font='bold 13px monospace';
        ctx.textAlign='center'; ctx.textBaseline='top';
        ctx.fillText(hex.toUpperCase(), i*colW+colW/2, H-38);
        ctx.fillStyle='rgba(255,255,255,0.5)'; ctx.font='11px monospace';
        ctx.fillText(label, i*colW+colW/2, H-18);
    });
    return canvas.toBuffer();
}

async function renderPreviewIcon(vibe, color, color2, background, glow) {
    const W = 400, H = 400;
    const canvas = createCanvas(W, H);
    const ctx    = canvas.getContext('2d');
    const font   = getFont('another-danger');
    await drawBackground(ctx, background, W, H, loadImage);
    const label = vibe.slice(0, 3).toUpperCase();
    ctx.font = `110px '${font.family}'`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const fill = createTextGradient(ctx, color, color2, label, W/2, W);
    ctx.shadowColor = color; ctx.shadowBlur = Number(glow);
    ctx.fillStyle = fill;
    ctx.fillText(label, W/2, H/2);
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;
    ctx.fillText(label, W/2, H/2);
    return canvas.toBuffer();
}

module.exports = {
    cooldown: 8,
    data: new SlashCommandBuilder()
        .setName('mood')
        .setDescription('One word → AI generates a full colour palette and preview.')
        .addStringOption(o =>
            o.setName('vibe')
                .setDescription('Describe the mood in one word or short phrase (e.g. cyberpunk, lofi, forest)')
                .setRequired(true)
                .setMaxLength(40)),

    async execute(interaction) {
        const vibe = interaction.options.getString('vibe').trim();

        if (!process.env.GEMINI_API_KEY)
            return interaction.reply({ content: '❌ `GEMINI_API_KEY` is not configured.', ephemeral: true });

        const loadingEmbed = new EmbedBuilder()
            .setColor('#808080')
            .setDescription(`✦ Reading the vibe: **${vibe}**… asking Gemini for a palette.`);
        const initialReply = await interaction.reply({ embeds: [loadingEmbed] });

        // Tight schema-only prompt — no prose preamble, keeps tokens low
        const prompt =
`Vibe: "${vibe}"

Available backgrounds: ${VALID_BACKGROUNDS.join(', ')}

Return ONLY a JSON object:
  color (hex, primary)
  color2 (hex or null, for gradient)
  background (one of the available backgrounds)
  glow (one of: "0" "5" "10" "15" "25")
  tagline (string, max 8 words)

Start with { end with }. Nothing else.`;

        try {
            const raw   = await geminiRequest(prompt, { temperature: 1.0, maxOutputTokens: 150 });
            const mood  = parseMoodResponse(raw);

            const [iconBuf, paletteBuf] = await Promise.all([
                renderPreviewIcon(vibe, mood.color, mood.color2, mood.background, mood.glow),
                Promise.resolve(renderPalette(mood.color, mood.color2)),
            ]);

            const colorLabel = mood.color2 ? `${mood.color} → ${mood.color2}` : mood.color;

            await initialReply.edit({
                embeds: [
                    new EmbedBuilder()
                        .setColor(mood.color)
                        .setTitle(`✦ Mood: ${vibe}`)
                        .setDescription([
                            mood.tagline ? `*"${mood.tagline}"*\n` : '',
                            `**Palette** — ${colorLabel}`,
                            `**Background** — \`${mood.background}\``,
                            `**Glow** — ${mood.glow === '0' ? 'None' : mood.glow}`,
                            '',
                            '⚡ Use these values in `/icon`, `/banner`, or `/brand kit`.',
                        ].filter(Boolean).join('\n'))
                        .setFooter({ text: `Sigil • /mood • powered by Gemini` }),
                ],
                files: [
                    new AttachmentBuilder(iconBuf,    { name: 'mood-preview.png' }),
                    new AttachmentBuilder(paletteBuf, { name: 'palette.png'      }),
                ],
            });
        } catch (err) {
            console.error('[ERROR] /mood failed:', err);
            await initialReply.edit({
                embeds: [new EmbedBuilder().setColor('#FF0000').setDescription(`Failed to generate mood palette. ${err.message || 'Please try again.'}`)],
            });
        }
    },
};
