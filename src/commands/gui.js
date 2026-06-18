const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('gui')
        .setDescription('Get the link to the Sigil visual brand builder')
        .addSubcommand(sub =>
            sub.setName('open')
                .setDescription('Get the GUI link')
        )
        .addSubcommand(sub =>
            sub.setName('status')
                .setDescription('Check if the GUI server is online')
        ),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const guiUrl = process.env.GUI_URL ?? `http://localhost:${process.env.PORT ?? 3420}`;

        if (sub === 'open') {
            const embed = new EmbedBuilder()
                .setTitle('🎨 Sigil Visual Brand Builder')
                .setDescription(
                    `Open the GUI to visually design your server's brand kit.\n\n` +
                    `**[Click here to open the GUI](${guiUrl})**\n\n` +
                    `The GUI lets you:\n` +
                    `• Pick colors, backgrounds, fonts & borders\n` +
                    `• Preview your icon and banner live\n` +
                    `• Generate a full AI brand kit\n` +
                    `• Download all assets`
                )
                .setColor('#6a0dad')
                .setFooter({ text: 'Sigil • GUI' });

            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        if (sub === 'status') {
            try {
                const { default: fetch } = await import('node-fetch').catch(() => ({ default: null }));
                if (!fetch) {
                    return interaction.reply({ content: '⚠️ Cannot check GUI status (node-fetch not available).', ephemeral: true });
                }
                const res = await fetch(`${guiUrl}/health`, { signal: AbortSignal.timeout(3000) });
                const data = await res.json();
                return interaction.reply({
                    content: `✅ GUI server is **online** at ${guiUrl} (v${data.version ?? '?'})`,
                    ephemeral: true,
                });
            } catch {
                return interaction.reply({
                    content: `❌ GUI server appears **offline** at ${guiUrl}`,
                    ephemeral: true,
                });
            }
        }
    },
};
