// Detects DISBOARD's successful bump confirmation and records the timestamp.
// DISBOARD bot ID: 302050872383242240
// Detection: interaction response embed whose description contains 'Bump done'

const { Events } = require('discord.js');
const { getConfig, setConfig } = require('../utils/db.js');

const DISBOARD_ID = '302050872383242240';

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        if (message.author.id !== DISBOARD_ID) return;
        if (!message.guild) return;

        // DISBOARD sends an embed on successful bump
        const embed = message.embeds?.[0];
        const desc  = embed?.description ?? embed?.data?.description ?? '';
        if (!desc.toLowerCase().includes('bump done')) return;

        const cfg = getConfig(message.guild.id);
        if (!cfg.bump_enabled) return;

        setConfig(message.guild.id, {
            bump_last_bump_at:     new Date().toISOString(),
            bump_last_reminded_at: null,
        });

        console.log(`[BumpReminder] Bump recorded for guild ${message.guild.id}`);
    },
};
