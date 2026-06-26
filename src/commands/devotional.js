'use strict';
const { SlashCommandBuilder } = require('discord.js');
const impl = require('./_devotional_impl.js');
const { isEnabled } = require('../utils/packages.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('devotional')
        .setDescription('Post or schedule the daily devotional.'),
    startScheduler: impl.startScheduler ?? null,
    async execute(interaction) {
        if (!isEnabled(interaction.guild.id, 'faith')) {
            return interaction.reply({ content: '📦 The **Faith** package is not enabled on this server. An admin can enable it via `/sigilconfig packages`.', ephemeral: true });
        }
        return impl.execute(interaction);
    },
};
