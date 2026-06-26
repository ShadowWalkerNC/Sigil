'use strict';
const impl = require('./_xprank_impl.js');

module.exports = {
    data: impl.data,
    async execute(interaction) {
        return impl.execute(interaction);
    },
};
