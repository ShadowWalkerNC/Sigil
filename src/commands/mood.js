const guard = require('../utils/packageGuard');
const impl = (() => { try { return require('./_mood_impl'); } catch { return null; } })();

if (impl) {
    module.exports = { data: impl.data, async autocomplete(i) { return impl.autocomplete?.(i); }, async execute(i) { if (await guard(i, 'aitools')) return; return impl.execute(i); } };
} else {
    const { SlashCommandBuilder } = require('discord.js');
    module.exports = {
        data: new SlashCommandBuilder().setName('mood').setDescription('AI mood analysis'),
        async execute(interaction) {
            if (await guard(interaction, 'aitools')) return;
            await interaction.deferReply();
            await interaction.editReply({ content: '🧠 Mood analysis initializing.' });
        },
    };
}
