'use strict';
const { SlashCommandBuilder } = require('discord.js');
const impl = require('./_ticket_impl.js');
const { isEnabled } = require('../utils/packages.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('Open or manage a support ticket.'),
    async execute(interaction) {
        if (!isEnabled(interaction.guild.id, 'tickets')) {
            return interaction.reply({ content: '📦 The **Tickets** package is not enabled on this server. An admin can enable it via `/sigilconfig packages`.', ephemeral: true });
        }
        return impl.execute(interaction);
    },
};
