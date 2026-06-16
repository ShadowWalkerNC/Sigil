const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Show all available commands and how to use them.'),

    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setColor('#808080')
            .setTitle('Discord Icon Gen — Command Reference')
            .setDescription('Generate custom profile icons directly in Discord.')
            .addFields(
                {
                    name: '`/icon` — Generate a profile icon',
                    value: [
                        '**`text`** *(required)* — Text to display. Max 20 characters.',
                        '**`size`** *(required)* — Font size in pixels. Range: 10–200.',
                        '**`color`** *(required)* — Text color as a hex code (e.g. `#FF0000`).',
                        '**`glow`** *(required)* — Glow intensity: `Low`, `Medium`, or `High`.',
                        '**`background`** *(required)* — Background style: `Plain (Black)`, `Custom Background 1`, or `Custom Background 2`.',
                        '**`font`** *(optional)* — Font style. Defaults to `Another Danger`.',
                        '',
                        '**Example:** `/icon text:Nova size:80 color:#FF4500 glow:High background:Plain (Black)`',
                    ].join('\n'),
                },
                {
                    name: '`/help` — Show this reference',
                    value: 'Displays all commands and their options. Only visible to you.',
                }
            )
            .setFooter({ text: 'Discord Icon Gen • forked from NoVa-Gh0ul' });

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },
};
