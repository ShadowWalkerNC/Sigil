'use strict';
const { SlashCommandBuilder } = require('discord.js');
const impl = require('./_levelroles_impl.js');
const { isEnabled } = require('../utils/packages.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('levelroles')
        .setDescription('Configure role rewards for XP levels.'),
    async execute(interaction) {
        if (!isEnabled(interaction.guild.id, 'xp')) {
            return interaction.reply({ content: '📦 The **XP & Levels** package is not enabled on this server. An admin can enable it via `/sigilconfig packages`.', ephemeral: true });
        }
        return impl.execute(interaction);
    },
};
