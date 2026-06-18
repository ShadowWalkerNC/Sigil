const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Show all Sigil commands and how to use them'),

    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('📖 Sigil — Command Reference')
            .setDescription('**Sigil** is your AI-powered Discord server branding bot. Use slash commands or the **Visual Brand Builder** GUI to create icons, banners, logos, and full brand kits.')
            .setColor('#6a0dad')
            .addFields(
                {
                    name: '🖥️ /gui — Visual Brand Builder',
                    value: [
                        '`/gui open` — Get the link to the browser-based brand builder.',
                        '`/gui status` — Check if the GUI server is online.',
                        '',
                        'The GUI includes **8 brand templates** (Dark Fantasy, Cyberpunk, Fantasy RPG, Community, Racing, Tactical FPS, Survival RPG, Sci-Fi), live preview, 7 platform size presets, shareable links, randomize, and optional AI generation.',
                    ].join('\n'),
                },
                {
                    name: '🎨 /brand',
                    value: [
                        '`/brand kit` — Build a full brand kit (icon + banner + palette) from your own options.',
                        '`/brand ai` — Describe your server and let AI design your entire brand kit.',
                        '`  description:` Your server in a sentence.',
                        '`  image_prompt:` Custom prompt for the AI image (optional).',
                    ].join('\n'),
                },
                {
                    name: '🖼️ /icon',
                    value: 'Generate a standalone server icon.\n`text` `background` `border` `primary_color` `secondary_color` `font` `glow` `opacity`',
                },
                {
                    name: '🏳️ /banner',
                    value: 'Generate a wide server banner.\n`text` `subtitle` `background` `border` `primary_color` `secondary_color` `font` `align` `glow` `opacity`',
                },
                {
                    name: '🪙 /logo',
                    value: 'Generate a logo-style icon with a solid or transparent background.\n`text` `background` `border` `primary_color` `secondary_color` `font` `glow`',
                },
                {
                    name: '👤 /avatar',
                    value: 'Generate a server avatar/profile icon, optionally with an image overlay.\n`text` `overlay` `background` `border` `primary_color` `secondary_color` `font` `glow` `opacity`',
                },
                {
                    name: '🎭 /mood',
                    value: 'Describe a mood and let AI generate a matching color palette + preview.\n`mood:` e.g. *"cozy autumn evening"*',
                },
                {
                    name: '⚖️ /compare',
                    value: 'Compare two icon designs side by side.\n`text_a` `text_b` + background/border/color/glow options for each.',
                },
                {
                    name: '🎲 /random',
                    value: 'Generate a completely random icon — surprise yourself!\n`text` (optional)',
                },
                {
                    name: '👁️ /preview',
                    value: 'Preview all available backgrounds and borders in a quick grid.\n`text` `primary_color` `secondary_color`',
                },
                {
                    name: '💾 /saveme',
                    value: 'Save your last generated design as a kit you can replay.\n`name:` A label for this saved kit.',
                },
                {
                    name: '📜 /history',
                    value: 'View your recent command history with copy-paste commands.',
                },
                {
                    name: '📐 Output Size Presets (GUI)',
                    value: [
                        'Discord Icon — 512×512',
                        'Discord Banner — 960×540',
                        'Twitch Panel — 320×160',
                        'Twitch Banner — 1200×480',
                        'YouTube Channel Art — 2560×1440',
                        'Reddit Banner — 1920×384',
                        'Square — 1024×1024',
                    ].join('\n'),
                },
            )
            .setFooter({ text: 'Sigil v1.4.0 • Your server\'s mark. Crafted by AI.' });

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },
};
