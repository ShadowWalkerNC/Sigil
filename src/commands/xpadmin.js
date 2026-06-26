'use strict';
const { SlashCommandBuilder } = require('discord.js');
const impl = require('./_xpadmin_impl.js');
const { isEnabled } = require('../utils/packages.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('xpadmin')
        .setDescription('Admin controls for the XP system.'),
    async execute(interaction) {
        if (!isEnabled(interaction.guild.id, 'xp')) {
            return interaction.reply({ content: '📦 The **XP & Levels** package is not enabled on this server. An admin can enable it via `/sigilconfig packages`.', ephemeral: true });
        }
        return impl.execute(interaction);
    },
};
