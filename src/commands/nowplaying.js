'use strict';
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { AudioPlayerStatus } = require('@discordjs/voice');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('nowplaying')
        .setDescription('Show what is currently playing in the voice channel'),

    async execute(interaction) {
        await interaction.deferReply();

        // Access the shared queue from play.js
        let playCmd;
        try { playCmd = require('./play.js'); } catch {
            return interaction.editReply({ content: '❌ Music module unavailable.' });
        }

        const queue = playCmd.getQueues?.()?.get(interaction.guildId);
        if (!queue || !queue.length) {
            return interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setTitle('⏹️ Nothing Playing')
                    .setDescription('The queue is empty. Use `/play` to add a YouTube URL.')
                    .setColor('#5865F2')],
            });
        }

        const current = queue[0];
        const upcoming = queue.slice(1, 4);

        const embed = new EmbedBuilder()
            .setTitle('🎵 Now Playing')
            .setDescription(`[${current.title}](${current.url})`)
            .setColor('#39FF14')
            .addFields(
                { name: 'Requested by', value: `<@${current.requestedBy}>`, inline: true },
                { name: 'Queue', value: `${queue.length} track(s)`, inline: true },
            )
            .setTimestamp();

        if (upcoming.length) {
            embed.addFields({
                name: 'Up Next',
                value: upcoming.map((t, i) => `${i + 2}. [${t.title}](${t.url})`).join('\n'),
            });
        }

        return interaction.editReply({ embeds: [embed] });
    },
};
