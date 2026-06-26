'use strict';
const { SlashCommandBuilder } = require('discord.js');
const impl = require('./_bible_impl.js');
const { isEnabled } = require('../utils/packages.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bible')
        .setDescription('Look up a Bible verse.')
        .addStringOption(o => o.setName('verse').setDescription('e.g. John 3:16').setRequired(true)),
    async execute(interaction) {
        if (!isEnabled(interaction.guild.id, 'faith')) {
            return interaction.reply({ content: '📦 The **Faith** package is not enabled on this server. An admin can enable it via `/sigilconfig packages`.', ephemeral: true });
        }
        return impl.execute(interaction);
    },
};
