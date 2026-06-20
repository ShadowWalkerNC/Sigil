const { SlashCommandBuilder } = require('discord.js');
const guard = require('../utils/packageGuard');

const _impl = (() => { try { return require('./_levelroles_impl'); } catch { return null; } })();

if (_impl) {
    module.exports = { data: _impl.data, async autocomplete(i) { return _impl.autocomplete?.(i); }, async execute(i) { if (await guard(i, 'xp')) return; return _impl.execute(i); } };
} else {
    module.exports = {
        data: new SlashCommandBuilder().setName('levelroles').setDescription('Configure level-up role rewards'),
        async execute(interaction) {
            if (await guard(interaction, 'xp')) return;
            await interaction.deferReply();
            await interaction.editReply({ content: '⭐ Level roles feature coming soon.' });
        },
    };
}
