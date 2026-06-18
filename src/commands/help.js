const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Show all Sigil commands and options'),

    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('\uD83D\uDCD6 Sigil \u2014 Command Reference')
            .setColor('#8B0000')
            .setDescription(
                'Generate Discord server icons, banners, and full brand kits \u2014 powered by Canvas and optional Gemini AI.\n' +
                '**32 backgrounds \u2022 8 border styles \u2022 5 shapes \u2022 8 fonts \u2022 8 built-in templates**'
            )
            .addFields(
                {
                    name: '\uD83D\uDDBC\uFE0F `/icon`',
                    value: [
                        '`text` *(required)* \u2014 up to 4 characters to render',
                        '`shape` \u2014 Circle / Rounded / Square / Hexagon / Diamond',
                        '`background` \u2014 32 presets (gradients, solids, patterns, named)',
                        '`border` \u2014 none / solid / glow / gradient / double / dashed / neon / rainbow',
                        '`primary_color` / `secondary_color` \u2014 hex with autocomplete',
                        '`font` \u2014 Arial Black, Impact, Bebas Neue, Oswald, Playfair Display\u2026',
                        '`glow` \u2014 0\u201325 \u2022 `opacity` \u2014 0.0\u20131.0',
                    ].join('\n'),
                },
                {
                    name: '\uD83C\uDFA8 `/logo`',
                    value: [
                        '`text` *(required)*',
                        '`shape` \u2014 Circle / Rounded / Square / Hexagon / Diamond',
                        '`background`, `primary_color`, `secondary_color`, `font`, `glow`',
                        '`transparent` \u2014 true/false for transparent background',
                    ].join('\n'),
                },
                {
                    name: '\uD83C\uDF05 `/banner`',
                    value: [
                        '`text` *(required)*',
                        '`subtitle`, `background`, `border`, `primary_color`, `secondary_color`',
                        '`font`, `glow`, `opacity`, `align` \u2014 left / center / right',
                    ].join('\n'),
                },
                {
                    name: '\uD83C\uDF9F\uFE0F `/template`',
                    value: [
                        'Load a built-in brand template and instantly render its full kit (icon + banner + palette)',
                        '`name` *(required)* \u2014 Demonfall, Cyber Nexus, Arcane Order, Cozy Den, Neon Drift, Polar Ops, Emerald Fang, Void Protocol',
                        '`icon_text` \u2014 override icon initials \u2022 `brand_name` \u2014 override brand name',
                    ].join('\n'),
                },
                {
                    name: '\uD83E\uDD16 `/brand ai`',
                    value: 'Describe your server \u2192 Gemini designs a full brand kit (icon + banner + palette + AI image)',
                },
                {
                    name: '\uD83D\uDCE6 `/brand kit`',
                    value: 'Manually specify brand name, tagline, colors, background, border, font, glow, shape',
                },
                {
                    name: '\uD83D\uDD17 `/brand share`',
                    value: 'Generate a shareable GUI link pre-loaded with your last kit \u2014 opens the Visual Builder with your exact settings',
                },
                {
                    name: '\uD83C\uDFA8 `/palette export`',
                    value: [
                        'Export your palette in developer-ready formats',
                        '`format` *(required)* \u2014 CSS Variables / Tailwind Config / Hex List',
                        '`primary` / `secondary` / `color3\u20135` \u2014 manual hex inputs (optional, uses last kit if omitted)',
                    ].join('\n'),
                },
                {
                    name: '\uD83C\uDFB2 `/random`',
                    value: 'Fully randomized icon \u2014 random shape, colors, background, border, font, glow',
                },
                {
                    name: '\uD83D\uDD0D `/compare`',
                    value: 'Side-by-side comparison of two icon configs, each with independent shape, colors, background, border',
                },
                {
                    name: '\uD83E\uDDD1\u200D\uD83C\uDFA8 `/avatar`',
                    value: 'Server avatar / profile icon with optional overlay image, supports all 5 shapes',
                },
                {
                    name: '\uD83C\uDF08 `/mood`',
                    value: 'Generate a 5-color palette from a mood description (AI)',
                },
                {
                    name: '\uD83D\uDDC2\uFE0F `/preview`',
                    value: 'Grid preview of all 32 available backgrounds',
                },
                {
                    name: '\uD83D\uDCBE `/saveme`',
                    value: 'Save your most recent design as a named kit',
                },
                {
                    name: '\uD83D\uDCDC `/history`',
                    value: 'View recent command history with copy-paste commands',
                },
                {
                    name: '\uD83D\uDDA5\uFE0F `/gui open`',
                    value: 'Get the link to the Visual Brand Builder \u2014 full GUI with live preview, templates, and AI Generate',
                },
                {
                    name: '\uD83D\uDFE2 `/gui status`',
                    value: 'Check if the GUI server is online',
                },
                {
                    name: '\u2139\uFE0F `/status`',
                    value: 'Show bot uptime and version',
                },
            )
            .setFooter({ text: 'Sigil v1.11.0 \u2022 /help \u2014 use /template for instant kits \u2022 /brand share for the GUI link \u2022 /palette export for dev assets' });

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },
};
