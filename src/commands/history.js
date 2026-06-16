/**
 * /history — view and replay your last saved icons.
 */

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { loadHistory, clearHistory, MAX_ITEMS } = require('../utils/history');

function buildCopyCommand(cmd, params) {
    const parts = [`/${cmd}`];
    const order = ['text','size','color','glow','background','color2','opacity','border','font','position','circular','subtitle','align','shape','seed'];
    for (const key of order) {
        if (params[key] !== undefined && params[key] !== null) {
            parts.push(`${key}:${params[key]}`);
        }
    }
    return parts.join(' ');
}

module.exports = {
    cooldown: 3,
    data: new SlashCommandBuilder()
        .setName('history')
        .setDescription(`View your last ${MAX_ITEMS} saved icons.`)
        .addBooleanOption(o =>
            o.setName('clear')
             .setDescription('Clear your entire history')
             .setRequired(false)),

    async execute(interaction) {
        const doClear = interaction.options.getBoolean('clear') || false;

        if (doClear) {
            clearHistory(interaction.user.id);
            return interaction.reply({
                embeds: [new EmbedBuilder().setColor('#808080').setDescription('\uD83D\uDDD1\uFE0F Your icon history has been cleared.')],
                ephemeral: true,
            });
        }

        const history = loadHistory(interaction.user.id);

        if (history.length === 0) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#808080')
                        .setTitle('Your icon history is empty')
                        .setDescription('Use `/saveme` after any command to save your params here.\nYou can store up to ' + MAX_ITEMS + ' icons.'),
                ],
                ephemeral: true,
            });
        }

        const embed = new EmbedBuilder()
            .setColor('#808080')
            .setTitle(`\uD83D\uDDC2\uFE0F Your icon history (${history.length}/${MAX_ITEMS})`)
            .setFooter({ text: 'Discord Icon Gen \u2022 /history \u2022 copy a command and paste it into Discord to recreate' });

        history.forEach((entry, i) => {
            const copyCmd = buildCopyCommand(entry.command, entry.params);
            const date    = new Date(entry.timestamp).toISOString().slice(0, 16).replace('T', ' ');
            embed.addFields({
                name:  `${i + 1}. ${entry.label}  \u2014  /${entry.command}  \u2014  ${date} UTC`,
                value: `\`\`\`\n${copyCmd}\n\`\`\``,
                inline: false,
            });
        });

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },
};
