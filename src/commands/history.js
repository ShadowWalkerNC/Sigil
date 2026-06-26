'use strict';
const { SlashCommandBuilder } = require('discord.js');
const impl = require('./_history_impl.js');
const { isEnabled } = require('../utils/packages.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('history')
        .setDescription('View your AI conversation history.'),
    async execute(interaction) {
        if (!isEnabled(interaction.guild.id, 'aitools')) {
            return interaction.reply({ content: '📦 The **AI Tools** package is not enabled on this server. An admin can enable it via `/sigilconfig packages`.', ephemeral: true });
        }
        return impl.execute(interaction);
    },
};
