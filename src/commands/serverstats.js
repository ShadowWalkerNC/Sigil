const guard = require('../utils/packageGuard');
const impl = (() => { try { return require('./_serverstats_impl'); } catch { return null; } })();

if (impl) {
    module.exports = { data: impl.data, async autocomplete(i) { return impl.autocomplete?.(i); }, async execute(i) { if (await guard(i, 'analytics')) return; return impl.execute(i); } };
} else {
    const { SlashCommandBuilder } = require('discord.js');
    module.exports = {
        data: new SlashCommandBuilder().setName('serverstats').setDescription('View server statistics'),
        async execute(interaction) {
            if (await guard(interaction, 'analytics')) return;
            await interaction.deferReply();
            await interaction.editReply({ content: '📊 Server stats initializing.' });
        },
    };
}
