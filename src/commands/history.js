'use strict';
const impl = require('./_history_impl.js');

module.exports = {
    data: impl.data,
    async execute(interaction) {
        return impl.execute(interaction);
    },
};
