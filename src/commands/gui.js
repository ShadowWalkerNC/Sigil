const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('gui')
        .setDescription('Open or check the Sigil Visual Brand Builder')
        .addSubcommand(sub =>
            sub.setName('open')
                .setDescription('Get the link to the Sigil Visual Brand Builder')
        )
        .addSubcommand(sub =>
            sub.setName('status')
                .setDescription('Check if the Sigil GUI server is currently online')
        ),

    async execute(interaction) {
        const sub    = interaction.options.getSubcommand();
        const guiUrl = process.env.GUI_URL ?? `http://localhost:${process.env.PORT ?? 3420}`;

        if (sub === 'open') {
            const embed = new EmbedBuilder()
                .setTitle('🎨 Sigil Visual Brand Builder')
                .setDescription(
                    `Use the GUI to visually design and export your server\'s full brand kit.\n\n` +
                    `**[➜ Open the Brand Builder](${guiUrl})**\n\n` +
                    `**What you can do:**\n` +
                    `• Pick colors, backgrounds, fonts, and borders\n` +
                    `• Preview your server icon, banner, and rank card live\n` +
                    `• Generate a full AI-powered brand kit with one click\n` +
                    `• Download all assets as PNG files\n\n` +
                    `> 💡 Set \`GUI_URL\` in \`.env\` if you\'re hosting the GUI remotely.`
                )
                .setColor('#6a0dad')
                .setFooter({ text: 'Sigil • Visual Brand Builder • /gui open' })
                .setTimestamp();

            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        if (sub === 'status') {
            await interaction.deferReply({ ephemeral: true });
            try {
                const { default: fetch } = await import('node-fetch').catch(() => ({ default: null }));
                if (!fetch) {
                    return interaction.editReply({ content: '⚠️ Cannot check GUI status — `node-fetch` is not available.' });
                }
                const res  = await fetch(`${guiUrl}/health`, { signal: AbortSignal.timeout(4000) });
                const data = await res.json().catch(() => ({}));
                return interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle('✅ GUI Server Online')
                            .setDescription(`The Sigil Brand Builder is running at:\n**[${guiUrl}](${guiUrl})**`)
                            .addFields({ name: 'Version', value: data.version ?? 'unknown', inline: true })
                            .setColor('#39FF14')
                            .setFooter({ text: 'Sigil • GUI Status' })
                            .setTimestamp(),
                    ],
                });
            } catch {
                return interaction.editReply({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle('❌ GUI Server Offline')
                            .setDescription(
                                `Could not reach the GUI at:\n**${guiUrl}**\n\n` +
                                `Make sure the GUI server is running and \`GUI_URL\` is set correctly in \`.env\`.`
                            )
                            .setColor('#FF4444')
                            .setFooter({ text: 'Sigil • GUI Status' })
                            .setTimestamp(),
                    ],
                });
            }
        }
    },
};
