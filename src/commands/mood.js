const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { registerAllFonts, getAllFontFamilies, renderIcon } = require('../utils/canvas.js');
const { geminiRequest, extractJson } = require('../utils/gemini.js');

registerAllFonts();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mood')
        .setDescription('Generate a color palette from a mood description using AI')
        .addStringOption(opt =>
            opt.setName('mood')
                .setDescription('Describe a mood, vibe, or aesthetic (e.g. "cozy autumn evening")')
                .setRequired(true)
        ),

    async execute(interaction) {
        await interaction.deferReply();
        const mood = interaction.options.getString('mood');

        const prompt = `
You are a color palette designer. Given a mood or vibe, generate a 5-color palette.
Mood: "${mood}"

Respond with ONLY valid JSON (no markdown, no extra text):
{
  "palette": ["#hex1", "#hex2", "#hex3", "#hex4", "#hex5"],
  "primary": "#hex",
  "secondary": "#hex",
  "background": "<one of: gradient-purple, gradient-blue, gradient-red, gradient-green, gradient-gold, gradient-teal, gradient-pink, gradient-orange, solid-black, solid-dark, noise-dark, radial-purple, radial-blue>",
  "description": "<1-2 sentence description of the palette>"
}
`.trim();

        let data;
        try {
            const raw = await geminiRequest(prompt);
            data = extractJson(raw);
        } catch (err) {
            console.error('[mood] Gemini error:', err);
            return interaction.editReply('❌ Gemini returned an unexpected response. Please try again.');
        }

        const { palette, primary, secondary, background, description } = data;

        // Render a preview icon using the mood palette
        const font = getAllFontFamilies()[0] ?? 'Arial';
        const buf = await renderIcon({
            text: mood.slice(0, 20),
            background: background ?? 'solid-dark',
            border: 'glow',
            primary:   primary   ?? palette[0] ?? '#ffffff',
            secondary: secondary ?? palette[1] ?? '#aaaaaa',
            font,
            glow: 15,
        });

        const attachment = new AttachmentBuilder(buf, { name: 'mood.png' });

        const paletteDisplay = (palette ?? []).map(c => `\`${c}\``).join('  ');

        const embed = new EmbedBuilder()
            .setTitle(`🎭 Mood: ${mood}`)
            .setDescription(description ?? 'Your AI-generated mood palette.')
            .addFields(
                { name: 'Palette', value: paletteDisplay || 'N/A' },
                { name: 'Primary',   value: primary   ?? 'N/A', inline: true },
                { name: 'Secondary', value: secondary ?? 'N/A', inline: true },
            )
            .setImage('attachment://mood.png')
            .setColor(primary ?? '#6a0dad')
            .setFooter({ text: 'Sigil • mood' });

        await interaction.editReply({ embeds: [embed], files: [attachment] });
    },
};
