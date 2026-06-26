'use strict';
const { SlashCommandBuilder } = require('discord.js');
const impl = require('./_prayer_impl.js');
const { isEnabled } = require('../utils/packages.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('prayer')
        .setDescription('Submit or view prayer requests.'),
    async execute(interaction) {
        if (!isEnabled(interaction.guild.id, 'faith')) {
            return interaction.reply({ content: '📦 The **Faith** package is not enabled on this server. An admin can enable it via `/sigilconfig packages`.', ephemeral: true });
        }
        return impl.execute(interaction);
    },
};
