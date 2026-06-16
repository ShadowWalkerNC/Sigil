const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const { getFontChoices } = require('../utils/fonts');
const { getBackgroundChoices } = require('../utils/backgrounds');

module.exports = {
    cooldown: 1,
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Show all available commands and how to use them.'),

    async execute(interaction) {
        const fontList = getFontChoices().map(f => `\`${f.name}\``).join(', ');
        const bgList   = getBackgroundChoices().map(b => `\`${b.name}\``).join(', ');

        const embed = new EmbedBuilder()
            .setColor('#808080')
            .setTitle('Discord Icon Gen \u2014 Command Reference')
            .setDescription(
                'Generate custom Discord profile icons, server banners, avatar overlays, and transparent logos.\n' +
                'Run `/preview` to see every background as a visual sheet.'
            )
            .addFields(
                {
                    name: '`/icon` \u2014 400\u00d7400 profile icon',
                    value:
                        '**Required:** `text` `size` `color` `glow` `background`\n' +
                        '**Optional:** `color2` `opacity` `border` `font`\n' +
                        '\u2022 `opacity` 10\u2013100 dims the background toward black\n' +
                        '\u2022 `color2` adds a left\u2192right text gradient\n' +
                        '\u2022 `border` \u2014 None / Solid / Glow Ring / Gradient Ring\n' +
                        '**Example:** `/icon text:Nova size:80 color:#FF4500 glow:High background:starfield border:Glow Ring`',
                },
                {
                    name: '`/banner` \u2014 1024\u00d7320 server banner',
                    value:
                        '**Required:** `text` `size` `color` `glow` `background`\n' +
                        '**Optional:** `color2` `opacity` `subtitle` `align` `font`\n' +
                        '\u2022 `subtitle` renders smaller text below the main heading\n' +
                        '\u2022 `align` \u2014 Left / Center / Right (default: Center)\n' +
                        '**Example:** `/banner text:MyServer size:90 color:#00FFFF glow:Medium background:midnight-gradient subtitle:Est. 2024 align:Left`',
                },
                {
                    name: '`/avatar` \u2014 Text overlay on your Discord avatar',
                    value:
                        '**Required:** `text` `size` `color` `glow` `position`\n' +
                        '**Optional:** `color2` `circular` `font`\n' +
                        '\u2022 `position` \u2014 Top / Center / Bottom\n' +
                        '\u2022 `circular` crops the avatar into a circle\n' +
                        '**Example:** `/avatar text:Nova size:60 color:#FFFFFF glow:High position:Bottom circular:True`',
                },
                {
                    name: '`/logo` \u2014 512\u00d7512 transparent PNG logo',
                    value:
                        '**Required:** `text` `size` `color` `glow`\n' +
                        '**Optional:** `color2` `shape` `font`\n' +
                        '\u2022 `shape` \u2014 None / Circle Ring / Underline\n' +
                        '**Example:** `/logo text:Nova size:120 color:#FF4500 glow:High shape:Circle Ring`',
                },
                {
                    name: '`/random` \u2014 Surprise icon generator',
                    value:
                        '**Optional:** `text` `seed`\n' +
                        '\u2022 Picks a random background, font, colours, glow, and border for you\n' +
                        '\u2022 `text` defaults to your Discord username if not provided\n' +
                        '\u2022 `seed` \u2014 any number; share it with friends to recreate the exact same icon\n' +
                        '**Example:** `/random` \u2022 `/random text:Nova seed:42`',
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
                        'Use this to pick a background before running `/icon` or `/banner`.',
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
            .setFooter({ text: 'Discord Icon Gen \u2022 forked from NoVa-Gh0ul \u2022 use /preview to browse backgrounds' });

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },
};
