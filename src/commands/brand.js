const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { registerAllFonts, getAllFontFamilies, renderIcon, renderBanner, renderPalette, renderKit } = require('../utils/canvas.js');
const { getBackgroundChoices } = require('../utils/backgrounds.js');
const { getBorderChoices } = require('../utils/borders.js');
const { geminiRequest, geminiImageRequest, extractJson } = require('../utils/gemini.js');
const { saveEntry } = require('../utils/history.js');

registerAllFonts();

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
        ),

    async autocomplete(interaction) {
        const { colorAutocomplete } = require('../utils/colors.js');
        await colorAutocomplete(interaction);
    },

    async execute(interaction) {
        await interaction.deferReply();
        const sub = interaction.options.getSubcommand();

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
                .setTitle(`🎨 ${name} — Brand Kit`)
                .setDescription(tagline || 'Your custom brand kit is ready!')
                .setImage('attachment://banner.png')
                .setThumbnail('attachment://icon.png')
                .setColor(primary)
                .addFields(
                    { name: 'Background', value: background,      inline: true },
                    { name: 'Border',     value: border,          inline: true },
                    { name: 'Font',       value: font,            inline: true },
                    { name: 'Primary',    value: primary,         inline: true },
                    { name: 'Secondary',  value: secondary,       inline: true },
                    { name: 'Glow',       value: String(glow),    inline: true },
                )
                .setFooter({ text: 'Sigil • brand kit' });

            await interaction.editReply({ embeds: [embed], files });
            saveEntry(interaction.user.id, { command: 'brand', text: name, tagline, background, border, primary_color: primary, secondary_color: secondary, font, glow });

        } else if (sub === 'ai') {
            const description  = interaction.options.getString('description');
            const customPrompt = interaction.options.getString('image_prompt');

            // Ask Gemini to design a brand kit
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
                return interaction.editReply('❌ Gemini returned an unexpected response. Please try again.');
            }

            const { name, tagline, primary_color, secondary_color, background, border, font, glow, palette, image_prompt } = brand;

            // Render kit
            const { iconBuf, bannerBuf, paletteBuf } = await renderKit({
                text: name, subtitle: tagline,
                background, border,
                primary: primary_color, secondary: secondary_color,
                font, glow,
                palette,
            });

            // Try AI image generation
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
                .setTitle(`✨ ${name} — AI Brand Kit`)
                .setDescription(tagline || 'Your AI-designed brand kit is ready!')
                .setImage('attachment://banner.png')
                .setThumbnail('attachment://icon.png')
                .setColor(primary_color)
                .addFields(
                    { name: 'Background', value: background,                        inline: true },
                    { name: 'Border',     value: border,                            inline: true },
                    { name: 'Font',       value: font,                              inline: true },
                    { name: 'Primary',    value: primary_color,                     inline: true },
                    { name: 'Secondary',  value: secondary_color,                   inline: true },
                    { name: 'Glow',       value: String(glow),                      inline: true },
                    { name: 'Palette',    value: (palette ?? []).join('  '),        inline: false },
                )
                .setFooter({ text: 'Sigil • brand ai' });

            await interaction.editReply({ embeds: [embed], files });
            saveEntry(interaction.user.id, { command: 'brand', text: name, tagline, background, border, primary_color, secondary_color: secondary_color, font, glow });
        }
    },
};
