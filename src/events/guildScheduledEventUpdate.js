const { handleEventEnd } = require('../automation/eventRecapHandler.js');
const { GuildScheduledEventStatus } = require('discord.js');

module.exports = {
    name: 'guildScheduledEventUpdate',
    async execute(oldEvent, newEvent) {
        if (
            oldEvent.status !== GuildScheduledEventStatus.Completed &&
            newEvent.status === GuildScheduledEventStatus.Completed
        ) {
            try { await handleEventEnd(newEvent); }
            catch (e) { console.error('[guildScheduledEventUpdate]', e); }
        }
    },
};
