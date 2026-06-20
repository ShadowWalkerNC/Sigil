const { Events } = require('discord.js');
const { sendWelcome }    = require('../commands/welcome.js');
const { applyAutoRoles } = require('../commands/autorole.js');

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member) {
        await sendWelcome(member);
        await applyAutoRoles(member);
    },
};
