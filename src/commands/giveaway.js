const guard = require('../utils/packageGuard');
const impl = (() => { try { return require('./_giveaway_impl'); } catch { return null; } })();

if (impl) {
    module.exports = { data: impl.data, async autocomplete(i) { return impl.autocomplete?.(i); }, async execute(i) { if (await guard(i, 'polls')) return; return impl.execute(i); } };
} else {
    const { SlashCommandBuilder } = require('discord.js');
    module.exports = {
        data: new SlashCommandBuilder().setName('giveaway').setDescription('Create and manage giveaways'),
        async execute(interaction) {
            if (await guard(interaction, 'polls')) return;
            await interaction.deferReply();
            await interaction.editReply({ content: '🎁 Giveaway system initializing.' });
        },
    };
}
