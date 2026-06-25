'use strict';
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getVoiceConnection } = require('@discordjs/voice');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('View or manage the audio queue')
        .addSubcommand(s =>
            s.setName('list').setDescription('Show the current audio queue'))
        .addSubcommand(s =>
            s.setName('skip').setDescription('Skip the currently playing track'))
        .addSubcommand(s =>
            s.setName('stop').setDescription('Stop playback and clear the queue'))
        .addSubcommand(s =>
            s.setName('remove')
             .setDescription('Remove a track from the queue by position')
             .addIntegerOption(o =>
                 o.setName('position')
                  .setDescription('Queue position to remove (2 or higher)')
                  .setMinValue(2)
                  .setRequired(true))),

    async execute(interaction) {
        await interaction.deferReply();
        const sub = interaction.options.getSubcommand();

        let playCmd;
        try { playCmd = require('./play.js'); } catch {
            return interaction.editReply({ content: '❌ Music module unavailable.' });
        }

        const queues = playCmd.getQueues?.();
        const queue = queues?.get(interaction.guildId) ?? [];

        if (sub === 'list') {
            if (!queue.length) {
                return interaction.editReply({
                    embeds: [new EmbedBuilder()
                        .setTitle('📋 Queue Empty')
                        .setDescription('Nothing queued. Use `/play` to add a YouTube URL.')
                        .setColor('#5865F2')],
                });
            }
            const lines = queue.map((t, i) =>
                `\`${String(i + 1).padStart(2)}.\` ${i === 0 ? '**▶️** ' : ''}[${t.title}](${t.url}) — <@${t.requestedBy}>`
            );
            let desc = lines.join('\n');
            if (desc.length > 3900) desc = desc.slice(0, 3900) + '\n…';
            return interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setTitle(`📋 Queue — ${queue.length} track(s)`)
                    .setDescription(desc)
                    .setColor('#5865F2')
                    .setTimestamp()],
            });
        }

        if (sub === 'skip') {
            if (!queue.length) return interaction.editReply({ content: '❌ Nothing is playing.' });
            const skipped = queue.shift();
            // Destroy connection so playNext triggers naturally
            const conn = getVoiceConnection(interaction.guildId);
            conn?.destroy();
            return interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setTitle('⏭️ Skipped')
                    .setDescription(`Skipped **${skipped.title}**.`)
                    .setColor('#FFA500')],
            });
        }

        if (sub === 'stop') {
            queues?.set(interaction.guildId, []);
            const conn = getVoiceConnection(interaction.guildId);
            conn?.destroy();
            return interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setTitle('⏹️ Stopped')
                    .setDescription('Playback stopped and queue cleared.')
                    .setColor('#FF0000')],
            });
        }

        if (sub === 'remove') {
            const pos = interaction.options.getInteger('position');
            if (pos > queue.length) return interaction.editReply({ content: `❌ No track at position ${pos}.` });
            const removed = queue.splice(pos - 1, 1)[0];
            return interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setTitle('🗑️ Removed')
                    .setDescription(`Removed **${removed.title}** from position ${pos}.`)
                    .setColor('#888888')],
            });
        }
    },
};
