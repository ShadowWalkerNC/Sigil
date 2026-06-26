'use strict';
const { SlashCommandBuilder } = require('discord.js');
const impl = require('./_serverstats_impl.js');
const { isEnabled } = require('../utils/packages.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('serverstats')
        .setDescription('View live server health stats.'),
    async execute(interaction) {
        if (!isEnabled(interaction.guild.id, 'analytics')) {
            return interaction.reply({ content: '📦 The **Analytics** package is not enabled on this server. An admin can enable it via `/sigilconfig packages`.', ephemeral: true });
        }
        return impl.execute(interaction);
    },
};
