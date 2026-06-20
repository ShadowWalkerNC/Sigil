const guard = require('../utils/packageGuard');
const impl = (() => { try { return require('./_sermon_impl'); } catch { return null; } })();

if (impl) {
    module.exports = { data: impl.data, async autocomplete(i) { return impl.autocomplete?.(i); }, async execute(i) { if (await guard(i, 'faith')) return; return impl.execute(i); } };
} else {
    const { SlashCommandBuilder } = require('discord.js');
    module.exports = {
        data: new SlashCommandBuilder().setName('sermon').setDescription('Post a sermon or teaching'),
        async execute(interaction) {
            if (await guard(interaction, 'faith')) return;
            await interaction.deferReply();
            await interaction.editReply({ content: '📖 Sermon feature initializing.' });
        },
    };
}
