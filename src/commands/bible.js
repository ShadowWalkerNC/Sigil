'use strict';
const impl = require('./_bible_impl.js');
const { isEnabled } = require('../utils/packages.js');

module.exports = {
    data: impl.data,
    async execute(interaction) {
        if (!isEnabled(interaction.guild.id, 'faith')) {
            return interaction.reply({ content: '📦 The **Faith** package is not enabled on this server. An admin can enable it via `/sigilconfig packages`.', ephemeral: true });
        }
        return impl.execute(interaction);
    },
};
