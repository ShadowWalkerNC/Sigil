'use strict';
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const {
    joinVoiceChannel,
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    entersState,
    VoiceConnectionStatus,
} = require('@discordjs/voice');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Per-guild queue store
const queues = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Play audio from a YouTube URL in your voice channel')
        .addStringOption(o =>
            o.setName('url')
             .setDescription('YouTube video or playlist URL')
             .setRequired(true)),

    async execute(interaction) {
        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel) {
            return interaction.reply({ content: '❌ You must be in a voice channel to use this command.', ephemeral: true });
        }

        await interaction.deferReply();
        const url = interaction.options.getString('url');

        // Validate YouTube URL
        if (!/(?:youtu\.be\/|youtube\.com\/(?:watch|shorts|embed))/.test(url)) {
            return interaction.editReply({ content: '❌ Only YouTube URLs are supported.' });
        }

        // Check yt-dlp is available
        const ytdlp = await which('yt-dlp').catch(() => null);
        if (!ytdlp) {
            return interaction.editReply({ content: '⚙️ `yt-dlp` is not installed on this server. Ask the host to run `pip install yt-dlp`.' });
        }

        // Fetch video title
        let title = url;
        try {
            title = await new Promise((res, rej) => {
                exec(`yt-dlp --get-title --no-playlist "${url}"`, (err, stdout) => err ? rej(err) : res(stdout.trim()));
            });
        } catch { /* fallback to URL */ }

        // Add to guild queue
        if (!queues.has(interaction.guildId)) queues.set(interaction.guildId, []);
        const queue = queues.get(interaction.guildId);
        queue.push({ url, title, requestedBy: interaction.user.id });

        const pos = queue.length;
        const embed = new EmbedBuilder()
            .setTitle(`${pos === 1 ? '▶️ Now Playing' : `🎵 Queued #${pos}`}`)
            .setDescription(`[${title}](${url})`)
            .setColor('#39FF14')
            .addFields({ name: 'Requested by', value: `<@${interaction.user.id}>`, inline: true })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });

        // Only start playback if this is the first item
        if (pos === 1) await playNext(interaction.guild, voiceChannel, queues);
    },

    getQueues() { return queues; },
};

async function playNext(guild, voiceChannel, queues) {
    const queue = queues.get(guild.id);
    if (!queue || !queue.length) return;
    const item = queue[0];

    const tmpFile = path.join(os.tmpdir(), `sigil_${guild.id}_${Date.now()}.opus`);

    try {
        // Download audio via yt-dlp
        await new Promise((res, rej) => {
            exec(
                `yt-dlp -x --audio-format opus --no-playlist -o "${tmpFile}" "${item.url}"`,
                { timeout: 120000 },
                (err) => err ? rej(err) : res(),
            );
        });

        const connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator,
        });

        await entersState(connection, VoiceConnectionStatus.Ready, 15_000);

        const player = createAudioPlayer();
        const resource = createAudioResource(tmpFile);
        connection.subscribe(player);
        player.play(resource);

        await entersState(player, AudioPlayerStatus.Idle, 5 * 60 * 1000);

        // Move to next
        queue.shift();
        try { fs.unlinkSync(tmpFile); } catch { /* ignore */ }

        if (queue.length) {
            await playNext(guild, voiceChannel, queues);
        } else {
            connection.destroy();
        }
    } catch (err) {
        queue.shift();
        try { fs.unlinkSync(tmpFile); } catch { /* ignore */ }
        console.error(`[play] Error playing ${item.url}:`, err);
    }
}

function which(cmd) {
    return new Promise((res, rej) => {
        exec(`which ${cmd}`, (err, stdout) => err ? rej(err) : res(stdout.trim()));
    });
}
