const guard = require('../utils/packageGuard');
const impl = (() => { try { return require('./_devotional_impl'); } catch { return null; } })();

if (impl) {
    module.exports = { data: impl.data, async autocomplete(i) { return impl.autocomplete?.(i); }, async execute(i) { if (await guard(i, 'faith')) return; return impl.execute(i); } };
} else {
    const { SlashCommandBuilder } = require('discord.js');
    module.exports = {
        data: new SlashCommandBuilder().setName('devotional').setDescription('Get a daily devotional'),
        async execute(interaction) {
            if (await guard(interaction, 'faith')) return;
            await interaction.deferReply();
            await interaction.editReply({ content: '📖 Devotional initializing.' });
        },
    };
}
