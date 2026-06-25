'use strict';
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const API_KEY = process.env.BIBLE_API_KEY;
const DEFAULT_BIBLE_ID = process.env.BIBLE_ID || 'de4e12af7f28f599-02';

// Curated list of devotional verse IDs (ASV)
const DEVOTIONAL_VERSES = [
    'JHN.3.16', 'PSA.23.1', 'ROM.8.28', 'PHP.4.13', 'ISA.40.31',
    'JER.29.11', 'PRO.3.5-PRO.3.6', 'MAT.6.33', 'PSA.46.1', 'ROM.12.2',
    'GAL.5.22-GAL.5.23', 'EPH.2.8-EPH.2.9', 'HEB.11.1', 'JAM.1.2-JAM.1.4',
    '1CO.13.4-1CO.13.7', 'PSA.119.105', 'MAT.11.28-MAT.11.30', 'JHN.14.6',
    'PHP.4.6-PHP.4.7', '2TI.1.7',
];

const data = new SlashCommandBuilder()
    .setName('devotional')
    .setDescription('Get a daily devotional verse');

async function execute(interaction) {
    if (!API_KEY) {
        return interaction.reply({
            content: '⚙️ Bible API is not configured. Set `BIBLE_API_KEY` in your environment.',
            ephemeral: true,
        });
    }

    await interaction.deferReply();

    // Pick verse based on day of year for consistency
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
    const verseId = DEVOTIONAL_VERSES[dayOfYear % DEVOTIONAL_VERSES.length];

    const url = `https://api.scripture.api.bible/v1/bibles/${DEFAULT_BIBLE_ID}/passages/${encodeURIComponent(verseId)}?content-type=text&include-notes=false&include-titles=false&include-chapter-numbers=false&include-verse-numbers=true`;

    try {
        const res = await fetch(url, { headers: { 'api-key': API_KEY } });
        const json = await res.json();
        const passage = json?.data;
        if (!passage) return interaction.editReply({ content: '❌ Could not load today\'s devotional.' });

        const text = passage.content
            .replace(/\[\d+\]/g, '')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 1900);

        const now = new Date();
        const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

        const embed = new EmbedBuilder()
            .setTitle(`🙏 Daily Devotional — ${dateStr}`)
            .setDescription(`**${passage.reference}**\n\n${text}`)
            .setColor('#d4a017')
            .setFooter({ text: 'American Standard Version • api.bible' })
            .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
    } catch (err) {
        return interaction.editReply({ content: `❌ Error fetching devotional: ${err.message}` });
    }
}

module.exports = { data, execute };
