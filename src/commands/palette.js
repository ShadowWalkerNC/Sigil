'use strict';
const { SlashCommandBuilder } = require('discord.js');
const impl = require('./_palette_impl.js');
const { isEnabled } = require('../utils/packages.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('palette')
        .setDescription('Extract a color palette from an image.'),
    async execute(interaction) {
        if (!isEnabled(interaction.guild.id, 'aitools')) {
            return interaction.reply({ content: '📦 The **AI Tools** package is not enabled on this server. An admin can enable it via `/sigilconfig packages`.', ephemeral: true });
        }
        return impl.execute(interaction);
    },
};
