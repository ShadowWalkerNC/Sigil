const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { loadHistory, buildCopyCommand } = require('../utils/history.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('history')
        .setDescription('View your recent Sigil command history'),

    async execute(interaction) {
        const history = loadHistory(interaction.user.id);

        if (!history.length) {
            return interaction.reply({ content: 'You have no command history yet. Run a command first!', ephemeral: true });
        }

        const fields = history.slice(0, 5).map((entry, i) => ({
            name: `#${i + 1} — /${entry.command} — <t:${Math.floor(entry.timestamp / 1000)}:R>`,
            value: `\`\`\`\n${buildCopyCommand(entry)}\n\`\`\``,
        }));

        const embed = new EmbedBuilder()
            .setTitle('📜 Your Recent Sigil History')
            .setDescription('Copy any command below to replay it.')
            .addFields(...fields)
            .setColor('#6a0dad')
            .setFooter({ text: 'Sigil • history' });

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },
};
