const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { registerAllFonts, getAllFontFamilies, renderKit } = require('../utils/canvas.js');
const { getBackgroundChoices } = require('../utils/backgrounds.js');
const { getBorderChoices } = require('../utils/borders.js');
const { geminiRequest, geminiImageRequest, extractJson } = require('../utils/gemini.js');
const { saveEntry, loadHistory } = require('../utils/history.js');
const { getColorAutocomplete } = require('../utils/colors.js');

registerAllFonts();

// Mirrors the GUI HASH_KEYS array exactly so the link restores state correctly
const HASH_KEYS = [
    'brandName', 'tagline', 'description', 'iconText', 'bannerText',
    'primaryHex', 'secondaryHex', 'background', 'border', 'glow',
    'font', 'opacity', 'gradient', 'sizePreset', 'activeTemplate', 'shape',
];

function buildGuiLink(guiUrl, entry) {
    const state = {
        brandName:    entry.text        ?? '',
        tagline:      entry.tagline     ?? '',
        description:  entry.description ?? '',
        iconText:     (entry.text       ?? 'S').slice(0, 4).toUpperCase(),
        bannerText:   entry.text        ?? '',
        primaryHex:   entry.primary_color   ?? '#8B0000',
        secondaryHex: entry.secondary_color ?? '#4B0082',
        background:   entry.background  ?? 'inferno',
        border:       entry.border      ?? 'none',
        glow:         entry.glow        ?? 0,
        font:         entry.font        ?? 'Arial Black',
        opacity:      entry.opacity     ?? 85,
        gradient:     entry.gradient    ?? true,
        sizePreset:   entry.sizePreset  ?? 'discord-icon',
        activeTemplate: entry.activeTemplate ?? null,
        shape:        entry.shape       ?? 'circle',
    };
    const obj = {};
    HASH_KEYS.forEach(k => { if (state[k] !== undefined) obj[k] = state[k]; });
    const hash = Buffer.from(encodeURIComponent(JSON.stringify(obj))).toString('base64');
    return `${guiUrl}#${hash}`;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('brand')
        .setDescription('Generate a complete brand kit for your server')
        .addSubcommand(sub =>
            sub.setName('kit')
                .setDescription('Build a brand kit from custom options')
                .addStringOption(opt => opt.setName('name').setDescription('Server / brand name').setRequired(true))
                .addStringOption(opt => opt.setName('tagline').setDescription('Tagline / subtitle'))
                .addStringOption(opt => opt.setName('background').setDescription('Background style').addChoices(...getBackgroundChoices()))
                .addStringOption(opt => opt.setName('border').setDescription('Border style').addChoices(...getBorderChoices()))
                .addStringOption(opt => opt.setName('primary_color').setDescription('Primary hex color').setAutocomplete(true))
                .addStringOption(opt => opt.setName('secondary_color').setDescription('Secondary hex color').setAutocomplete(true))
                .addStringOption(opt => opt.setName('font').setDescription('Font family').addChoices(...getAllFontFamilies().map(f => ({ name: f, value: f }))))
                .addNumberOption(opt => opt.setName('glow').setDescription('Glow intensity (0–25)').setMinValue(0).setMaxValue(25))
        )
        .addSubcommand(sub =>
            sub.setName('ai')
                .setDescription('Describe your server and let AI design your brand kit')
                .addStringOption(opt => opt.setName('description').setDescription('Describe your server or brand').setRequired(true))
                .addStringOption(opt => opt.setName('image_prompt').setDescription('Custom AI image prompt (optional, max 100 chars)').setMaxLength(100))
        )
        .addSubcommand(sub =>
            sub.setName('share')
                .setDescription('Generate a shareable GUI link pre-loaded with your last kit')
        ),

    async autocomplete(interaction) {
        const focused = interaction.options.getFocused();
        const results = getColorAutocomplete(focused);
        await interaction.respond(results);
    },

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();

        // ── /brand share ──────────────────────────────────────────────────────
        if (sub === 'share') {
            await interaction.deferReply({ ephemeral: true });

            const guiUrl = process.env.GUI_URL || 'http://localhost:8080';
            const history = loadHistory(interaction.user.id);

            if (!history.length) {
                return interaction.editReply(
                    '\u274c No saved kit found. Run `/brand kit`, `/brand ai`, `/template`, or `/icon` first, then try again.'
                );
            }

            const last  = history[0];
            const link  = buildGuiLink(guiUrl, last);
            const since = last.timestamp
                ? `<t:${Math.floor(last.timestamp / 1000)}:R>`
                : 'recently';

            const embed = new EmbedBuilder()
                .setTitle('\uD83D\uDD17 Your Brand Kit \u2014 Visual Builder Link')
                .setColor(last.primary_color ?? '#8B0000')
                .setDescription(
                    `Your last kit (\`/${last.command}\`, ${since}) has been pre-loaded into the Visual Builder.\n\n` +
                    `**[\u2726 Open in Visual Builder](${link})**`
                )
                .addFields(
                    { name: 'Brand',      value: last.text        ?? '\u2014', inline: true },
                    { name: 'Background', value: last.background  ?? '\u2014', inline: true },
                    { name: 'Border',     value: last.border      ?? '\u2014', inline: true },
                    { name: 'Primary',    value: last.primary_color   ?? '\u2014', inline: true },
                    { name: 'Secondary',  value: last.secondary_color ?? '\u2014', inline: true },
                    { name: 'Shape',      value: last.shape       ?? '\u2014', inline: true },
                )
                .setFooter({ text: 'Sigil \u2022 brand share \u2014 link restores your exact settings in the GUI' });

            return interaction.editReply({ embeds: [embed] });
        }

        // ── /brand kit + /brand ai need deferReply ────────────────────────────
        await interaction.deferReply();

        // ── /brand kit ────────────────────────────────────────────────────────
        if (sub === 'kit') {
            const name       = interaction.options.getString('name');
            const tagline    = interaction.options.getString('tagline')    ?? '';
            const background = interaction.options.getString('background') ?? 'gradient-purple';
            const border     = interaction.options.getString('border')     ?? 'none';
            const primary    = interaction.options.getString('primary_color')   ?? '#ffffff';
            const secondary  = interaction.options.getString('secondary_color') ?? '#aaaaaa';
            const font       = interaction.options.getString('font')       ?? getAllFontFamilies()[0];
            const glow       = interaction.options.getNumber('glow')       ?? 0;

            const { iconBuf, bannerBuf, paletteBuf } = await renderKit({ text: name, subtitle: tagline, background, border, primary, secondary, font, glow });

            const files = [
                new AttachmentBuilder(iconBuf,    { name: 'icon.png'    }),
                new AttachmentBuilder(bannerBuf,  { name: 'banner.png'  }),
                new AttachmentBuilder(paletteBuf, { name: 'palette.png' }),
            ];

            const embed = new EmbedBuilder()
                .setTitle(`\uD83C\uDFA8 ${name} \u2014 Brand Kit`)
                .setDescription(tagline || 'Your custom brand kit is ready!')
                .setImage('attachment://banner.png')
                .setThumbnail('attachment://icon.png')
                .setColor(primary)
                .addFields(
                    { name: 'Background', value: background,   inline: true },
                    { name: 'Border',     value: border,       inline: true },
                    { name: 'Font',       value: font,         inline: true },
                    { name: 'Primary',    value: primary,      inline: true },
                    { name: 'Secondary',  value: secondary,    inline: true },
                    { name: 'Glow',       value: String(glow), inline: true },
                )
                .setFooter({ text: 'Sigil \u2022 brand kit \u2014 use /brand share to open this in the Visual Builder' });

            await interaction.editReply({ embeds: [embed], files });
            saveEntry(interaction.user.id, { command: 'brand', text: name, tagline, background, border, primary_color: primary, secondary_color: secondary, font, glow });

        // ── /brand ai ─────────────────────────────────────────────────────────
        } else if (sub === 'ai') {
            const description  = interaction.options.getString('description');
            const customPrompt = interaction.options.getString('image_prompt');

            const prompt = `
You are a professional brand designer. Based on this server description, design a complete Discord server brand kit.

Description: "${description}"

Respond with ONLY valid JSON (no markdown, no explanation):
{
  "name": "<short brand name>",
  "tagline": "<catchy tagline under 60 chars>",
  "primary_color": "<hex>",
  "secondary_color": "<hex>",
  "background": "<one of: gradient-purple, gradient-blue, gradient-red, gradient-green, gradient-gold, gradient-teal, gradient-pink, gradient-orange, solid-black, solid-dark, noise-dark, grid-dark, dots-dark, radial-purple, radial-blue, bg-image-1, bg-image-2>",
  "border": "<one of: none, solid, glow, gradient, double, dashed>",
  "font": "<one of: Another Danger, Bebas Neue, Oswald, Playfair Display, Source Code Pro, Dancing Script>",
  "glow": <number 0-25>,
  "palette": ["<hex1>", "<hex2>", "<hex3>", "<hex4>", "<hex5>"],
  "image_prompt": "<concise visual prompt for an icon/logo image>"
}
`.trim();

            let brand;
            try {
                const raw = await geminiRequest(prompt);
                brand = extractJson(raw);
            } catch (err) {
                console.error('[brand ai] Gemini JSON error:', err);
                return interaction.editReply('\u274c Gemini returned an unexpected response. Please try again.');
            }

            const { name, tagline, primary_color, secondary_color, background, border, font, glow, palette, image_prompt } = brand;

            const { iconBuf, bannerBuf, paletteBuf } = await renderKit({
                text: name, subtitle: tagline,
                background, border,
                primary: primary_color, secondary: secondary_color,
                font, glow, palette,
            });

            const aiPrompt = customPrompt ?? image_prompt ?? `Minimalist logo for: ${name}`;
            let aiImageBuf = null;
            try {
                const b64 = await geminiImageRequest(aiPrompt);
                if (b64) aiImageBuf = Buffer.from(b64, 'base64');
            } catch {}

            const files = [
                new AttachmentBuilder(iconBuf,    { name: 'icon.png'    }),
                new AttachmentBuilder(bannerBuf,  { name: 'banner.png'  }),
                new AttachmentBuilder(paletteBuf, { name: 'palette.png' }),
            ];
            if (aiImageBuf) files.push(new AttachmentBuilder(aiImageBuf, { name: 'ai_image.png' }));

            const embed = new EmbedBuilder()
                .setTitle(`\u2728 ${name} \u2014 AI Brand Kit`)
                .setDescription(tagline || 'Your AI-designed brand kit is ready!')
                .setImage('attachment://banner.png')
                .setThumbnail('attachment://icon.png')
                .setColor(primary_color)
                .addFields(
                    { name: 'Background', value: background,               inline: true },
                    { name: 'Border',     value: border,                   inline: true },
                    { name: 'Font',       value: font,                     inline: true },
                    { name: 'Primary',    value: primary_color,            inline: true },
                    { name: 'Secondary',  value: secondary_color,          inline: true },
                    { name: 'Glow',       value: String(glow),             inline: true },
                    { name: 'Palette',    value: (palette ?? []).join('  '), inline: false },
                )
                .setFooter({ text: 'Sigil \u2022 brand ai \u2014 use /brand share to open this in the Visual Builder' });

            await interaction.editReply({ embeds: [embed], files });
            saveEntry(interaction.user.id, { command: 'brand', text: name, tagline, background, border, primary_color, secondary_color, font, glow });
        }
    },
};
