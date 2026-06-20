const guard = require('../utils/packageGuard');
const _impl = require('./_ticket_impl_placeholder');
// Safe wrapper: guard fires before any ticket logic
const impl = (() => { try { return require('./_ticket_impl'); } catch { return null; } })();

if (impl) {
    module.exports = { data: impl.data, async autocomplete(i) { return impl.autocomplete?.(i); }, async execute(i) { if (await guard(i, 'tickets')) return; return impl.execute(i); } };
} else {
    const { SlashCommandBuilder } = require('discord.js');
    module.exports = {
        data: new SlashCommandBuilder().setName('ticket').setDescription('Open a support ticket'),
        async execute(interaction) {
            if (await guard(interaction, 'tickets')) return;
            await interaction.deferReply({ ephemeral: true });
            await interaction.editReply({ content: '🎟️ Ticket system is initializing.' });
        },
    };
}
