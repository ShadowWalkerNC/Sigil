'use strict';
const { SlashCommandBuilder } = require('discord.js');
const impl = require('./_xpleaderboard_impl.js');
const { isEnabled } = require('../utils/packages.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('xpleaderboard')
        .setDescription('View the XP leaderboard.'),
    async execute(interaction) {
        if (!isEnabled(interaction.guild.id, 'xp')) {
            return interaction.reply({ content: '📦 The **XP & Levels** package is not enabled on this server. An admin can enable it via `/sigilconfig packages`.', ephemeral: true });
        }
        return impl.execute(interaction);
    },
};
