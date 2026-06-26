'use strict';
const { SlashCommandBuilder } = require('discord.js');
const impl = require('./_poll_impl.js');
const { isEnabled } = require('../utils/packages.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('poll')
        .setDescription('Create a multi-option poll.'),
    async execute(interaction) {
        if (!isEnabled(interaction.guild.id, 'polls')) {
            return interaction.reply({ content: '📦 The **Polls** package is not enabled on this server. An admin can enable it via `/sigilconfig packages`.', ephemeral: true });
        }
        return impl.execute(interaction);
    },
};
