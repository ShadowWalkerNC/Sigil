const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getFontChoices } = require('../utils/fonts');
const { getBackgroundChoices } = require('../utils/backgrounds');

module.exports = {
    cooldown: 1,
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Show all Sigil commands and how to use them.'),

    async execute(interaction) {
        const fontList = getFontChoices().map(f => `\`${f.name}\``).join(', ');
        const bgList   = getBackgroundChoices().map(b => `\`${b.name}\``).join(', ');

        const embed = new EmbedBuilder()
            .setColor('#808080')
            .setTitle('\u2726 Sigil \u2014 Command Reference')
            .setDescription(
                'Generate custom Discord profile icons, server banners, avatar overlays, and transparent logos.\n' +
                'Run `/preview` to see every background as a visual sheet. Run `/mood` to generate a full palette from a vibe.'
            )
            .addFields(
                {
                    name: '`/icon` \u2014 400\u00d7400 profile icon',
                    value:
                        '**Required:** `text` `size` `color` `glow` `background`\n' +
                        '**Optional:** `color2` `opacity` `border` `font`\n' +
                        '\u2022 `color` / `color2` \u2014 pick from the dropdown or type a hex like `#FF4500`\n' +
                        '\u2022 `opacity` 10\u2013100 dims the background toward black\n' +
                        '\u2022 `color2` adds a left\u2192right text gradient\n' +
                        '\u2022 `glow` \u2014 None / Low / Medium / High / Ultra\n' +
                        '\u2022 `border` \u2014 None / Solid / Glow Ring / Gradient Ring / Double / Dashed / Corner Marks / Neon\n' +
                        '**Example:** `/icon text:Nova size:80 color:#FF4500 glow:High background:starfield border:Neon`',
                },
                {
                    name: '`/banner` \u2014 1024\u00d7320 server banner',
                    value:
                        '**Required:** `text` `size` `color` `glow` `background`\n' +
                        '**Optional:** `color2` `opacity` `subtitle` `align` `font`\n' +
                        '\u2022 `color` / `color2` \u2014 pick from the dropdown or type a hex\n' +
                        '\u2022 `subtitle` renders smaller text below the main heading\n' +
                        '\u2022 `align` \u2014 Left / Center / Right (default: Center)\n' +
                        '**Example:** `/banner text:MyServer size:90 color:#00FFFF glow:Medium background:midnight-gradient subtitle:Est. 2024 align:Left`',
                },
                {
                    name: '`/avatar` \u2014 Text overlay on your Discord avatar',
                    value:
                        '**Required:** `text` `size` `color` `glow` `position`\n' +
                        '**Optional:** `color2` `circular` `font`\n' +
                        '\u2022 `color` / `color2` \u2014 pick from the dropdown or type a hex\n' +
                        '\u2022 `position` \u2014 Top / Center / Bottom\n' +
                        '\u2022 `circular` crops the avatar into a circle\n' +
                        '**Example:** `/avatar text:Nova size:60 color:#FFFFFF glow:High position:Bottom circular:True`',
                },
                {
                    name: '`/logo` \u2014 512\u00d7512 transparent PNG logo',
                    value:
                        '**Required:** `text` `size` `color` `glow`\n' +
                        '**Optional:** `color2` `shape` `font`\n' +
                        '\u2022 `color` / `color2` \u2014 pick from the dropdown or type a hex\n' +
                        '\u2022 `shape` \u2014 None / Circle Ring / Underline\n' +
                        '**Example:** `/logo text:Nova size:120 color:#FF4500 glow:High shape:Circle Ring`',
                },
                {
                    name: '`/mood` \u2014 AI palette from a vibe',
                    value:
                        '**Required:** `vibe` (one word or short phrase)\n' +
                        '\u2022 Powered by Gemini \u2014 generates colours, background, glow, and a tagline\n' +
                        '\u2022 Outputs a preview icon + colour palette strip\n' +
                        '\u2022 Use the returned values in `/icon`, `/banner`, or `/brand kit`\n' +
                        '**Example:** `/mood vibe:cyberpunk` \u2022 `/mood vibe:lofi forest`',
                },
                {
                    name: '`/random` \u2014 Surprise icon generator',
                    value:
                        '**Optional:** `text` `seed`\n' +
                        '\u2022 Picks a random background, font, colours, glow, and border for you\n' +
                        '\u2022 `text` defaults to a random word if not provided\n' +
                        '\u2022 `seed` \u2014 any number; share it with friends to recreate the exact same icon\n' +
                        '**Example:** `/random` \u2022 `/random text:Nova seed:42`',
                },
                {
                    name: '`/compare` \u2014 Side-by-side icon comparison',
                    value:
                        '**Required:** `text` `size` `color_a` `glow_a` `background_a` `color_b` `glow_b` `background_b`\n' +
                        '**Optional:** `font` `color2_a/b` `opacity_a/b` `border_a/b`\n' +
                        '\u2022 All colour fields support the dropdown preset picker\n' +
                        '\u2022 Renders both icons in one 880\u00d7480 image with A / B labels\n' +
                        '\u2022 Text and font are shared; everything else is independent per side\n' +
                        '**Example:** `/compare text:Nova size:80 color_a:#FF4500 glow_a:High background_a:starfield color_b:#00FFFF glow_b:Medium background_b:midnight-gradient`',
                },
                {
                    name: '`/brand kit` \u2014 Full server brand kit',
                    value:
                        '**Required:** `name` `color` `background`\n' +
                        '**Optional:** `color2` `font` `tagline`\n' +
                        '\u2022 Generates icon + banner + logo in one command\n' +
                        '\u2022 `color` / `color2` \u2014 pick from the dropdown or type a hex\n' +
                        '**Example:** `/brand kit name:Nova color:#FF4500 background:starfield tagline:Rise`',
                },
                {
                    name: '`/saveme` \u2014 Save icon params to history',
                    value:
                        '**Required:** `command` `text` `size` `color` `glow`\n' +
                        '**Optional:** `background` `color2` `opacity` `border` `font` `label`\n' +
                        '\u2022 Does not regenerate the image \u2014 just saves your params\n' +
                        '\u2022 `label` lets you name the save (e.g. \'red fire icon\')\n' +
                        '\u2022 History is capped at 5 entries; oldest is dropped when full\n' +
                        '**Example:** `/saveme command:/icon text:Nova size:80 color:#FF4500 glow:High background:starfield label:red nova`',
                },
                {
                    name: '`/history` \u2014 View & replay saved icons',
                    value:
                        '**Optional:** `clear`\n' +
                        '\u2022 Lists your last 5 saves with a copy-paste replay command for each\n' +
                        '\u2022 `clear:True` wipes your entire history\n' +
                        '\u2022 Only visible to you\n' +
                        '**Example:** `/history` \u2022 `/history clear:True`',
                },
                {
                    name: '`/preview` \u2014 Background mosaic sheet',
                    value:
                        'Generates a single image showing every available background with its name.\n' +
                        'Use this to pick a background before running `/icon`, `/banner`, or `/compare`.',
                },
                {
                    name: '\uD83C\uDFA8 Available Fonts',
                    value: fontList || 'None registered',
                },
                {
                    name: '\uD83D\uDDBC\uFE0F Available Backgrounds',
                    value: bgList || 'None registered',
                },
                {
                    name: '`/help` \u2014 This reference',
                    value: 'Only visible to you.',
                }
            )
            .setFooter({ text: 'Sigil \u2022 /help \u2022 use /preview to browse backgrounds \u2022 use /mood for AI palettes' });

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },
};
