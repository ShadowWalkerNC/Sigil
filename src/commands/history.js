const guard = require('../utils/packageGuard');
const impl = (() => { try { return require('./_history_impl'); } catch { return null; } })();

if (impl) {
    module.exports = { data: impl.data, async autocomplete(i) { return impl.autocomplete?.(i); }, async execute(i) { if (await guard(i, 'aitools')) return; return impl.execute(i); } };
} else {
    const { SlashCommandBuilder } = require('discord.js');
    module.exports = {
        data: new SlashCommandBuilder().setName('history').setDescription('View your command history'),
        async execute(interaction) {
            if (await guard(interaction, 'aitools')) return;
            await interaction.deferReply({ ephemeral: true });
            await interaction.editReply({ content: '📜 History initializing.' });
        },
    };
}
