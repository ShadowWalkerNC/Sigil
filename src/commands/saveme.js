const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { loadHistory, buildCopyCommand } = require('../utils/history.js');
const fs   = require('fs');
const path = require('path');

const KITS_DIR = path.join(__dirname, '../../data/kits');
fs.mkdirSync(KITS_DIR, { recursive: true });

function kitsFile(userId) {
    return path.join(KITS_DIR, `${userId}.json`);
}

function loadKits(userId) {
    const file = kitsFile(userId);
    if (!fs.existsSync(file)) return {};
    try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return {}; }
}

function saveKit(userId, name, entry) {
    const kits = loadKits(userId);
    kits[name] = { ...entry, savedAt: Date.now() };
    fs.writeFileSync(kitsFile(userId), JSON.stringify(kits, null, 2));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('saveme')
        .setDescription('Save your most recent design as a named kit')
        .addStringOption(opt =>
            opt.setName('name')
                .setDescription('Name for this saved kit')
                .setRequired(true)
        ),

    async execute(interaction) {
        const kitName = interaction.options.getString('name');
        const history = loadHistory(interaction.user.id);

        if (!history.length) {
            return interaction.reply({ content: 'You have no recent designs to save. Run a command first!', ephemeral: true });
        }

        const latest = history[0];
        saveKit(interaction.user.id, kitName, latest);

        const copyCmd = buildCopyCommand(latest);

        const embed = new EmbedBuilder()
            .setTitle(`💾 Kit Saved: ${kitName}`)
            .setDescription('Your most recent design has been saved!')
            .addFields(
                { name: 'Command',  value: `\`\`\`\n${copyCmd}\n\`\`\`` },
                { name: 'Saved at', value: `<t:${Math.floor(Date.now() / 1000)}:F>` },
            )
            .setColor('#6a0dad')
            .setFooter({ text: 'Sigil • saveme' });

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },
};
