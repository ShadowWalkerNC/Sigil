'use strict';
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getGuildTickets, createTicket, setTicketThreadId, getConfig } = require('../utils/db.js');

const data = new SlashCommandBuilder()
    .setName('prayer')
    .setDescription('Submit or view prayer requests')
    .addSubcommand(sub =>
        sub.setName('request')
           .setDescription('Submit a prayer request to the community')
           .addStringOption(o =>
               o.setName('request')
                .setDescription('Your prayer request')
                .setRequired(true))
           .addBooleanOption(o =>
               o.setName('anonymous')
                .setDescription('Hide your name (default: false)')
                .setRequired(false)))
    .addSubcommand(sub =>
        sub.setName('list')
           .setDescription('View recent open prayer requests'));

async function execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'request') {
        await interaction.deferReply({ ephemeral: true });
        const request = interaction.options.getString('request').trim();
        const anon = interaction.options.getBoolean('anonymous') ?? false;

        // Try to post to prayer log channel if configured
        const prayerChannel = getConfig(interaction.guildId, 'prayer_log_channel');
        const displayName = anon ? 'Anonymous' : `${interaction.user.username}`;

        const embed = new EmbedBuilder()
            .setTitle('🙏 Prayer Request')
            .setDescription(request)
            .setColor('#d4a017')
            .addFields({ name: 'Submitted by', value: displayName })
            .setTimestamp();

        if (prayerChannel) {
            try {
                const ch = await interaction.guild.channels.fetch(prayerChannel);
                await ch.send({ embeds: [embed] });
            } catch { /* channel may be invalid */ }
        }

        return interaction.editReply({
            content: `✅ Your prayer request has been submitted${prayerChannel ? ' to the prayer channel' : ''}.`,
        });
    }

    if (sub === 'list') {
        await interaction.deferReply({ ephemeral: true });
        const prayerChannel = getConfig(interaction.guildId, 'prayer_log_channel');
        if (!prayerChannel) {
            return interaction.editReply({
                content: '⚙️ No prayer channel is configured. An admin can set one with `/sigilconfig`.',
            });
        }
        try {
            const ch = await interaction.guild.channels.fetch(prayerChannel);
            const msgs = await ch.messages.fetch({ limit: 10 });
            const requests = msgs.filter(m => m.embeds.length && m.embeds[0].title === '🙏 Prayer Request');
            if (!requests.size) return interaction.editReply({ content: 'No recent prayer requests found.' });
            const lines = requests.map(m => `• **${m.embeds[0].fields[0]?.value ?? 'Anonymous'}**: ${m.embeds[0].description?.slice(0, 80)}`).join('\n');
            return interaction.editReply({ content: `**Recent Prayer Requests:**\n${lines}` });
        } catch {
            return interaction.editReply({ content: '❌ Could not read prayer channel.' });
        }
    }
}

module.exports = { data, execute };
