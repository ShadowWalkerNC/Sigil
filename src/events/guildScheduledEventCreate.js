const { handleEventCreate } = require('../automation/eventBannerHandler.js');

module.exports = {
    name: 'guildScheduledEventCreate',
    async execute(scheduledEvent) {
        try { await handleEventCreate(scheduledEvent); }
        catch (e) { console.error('[guildScheduledEventCreate]', e); }
    },
};
