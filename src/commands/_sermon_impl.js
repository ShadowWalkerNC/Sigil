'use strict';
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const API_KEY = process.env.BIBLE_API_KEY;
const DEFAULT_BIBLE_ID = process.env.BIBLE_ID || 'de4e12af7f28f599-02';

const data = new SlashCommandBuilder()
    .setName('sermon')
    .setDescription('Get a Bible passage to study or share')
    .addStringOption(o =>
        o.setName('passage')
         .setDescription('Passage reference e.g. Romans 8:1-11, Psalm 23')
         .setRequired(true))
    .addStringOption(o =>
        o.setName('topic')
         .setDescription('Optional topic label e.g. Grace, Faith, Hope')
         .setRequired(false));

async function execute(interaction) {
    if (!API_KEY) {
        return interaction.reply({
            content: '⚙️ Bible API is not configured. Set `BIBLE_API_KEY` in your environment.',
            ephemeral: true,
        });
    }

    await interaction.deferReply();
    const passageRef = interaction.options.getString('passage').trim();
    const topic = interaction.options.getString('topic')?.trim();

    // Search to resolve passage ID
    const searchUrl = `https://api.scripture.api.bible/v1/bibles/${DEFAULT_BIBLE_ID}/search?query=${encodeURIComponent(passageRef)}&limit=1`;
    let verseId;
    try {
        const searchRes = await fetch(searchUrl, { headers: { 'api-key': API_KEY } });
        const searchData = await searchRes.json();
        const verses = searchData?.data?.verses;
        if (!verses || !verses.length) return interaction.editReply({ content: `❌ Could not find passage **${passageRef}**.` });
        verseId = verses[0].id;
    } catch (err) {
        return interaction.editReply({ content: `❌ Search failed: ${err.message}` });
    }

    const url = `https://api.scripture.api.bible/v1/bibles/${DEFAULT_BIBLE_ID}/passages/${encodeURIComponent(verseId)}?content-type=text&include-notes=false&include-titles=true&include-chapter-numbers=false&include-verse-numbers=true`;
    try {
        const res = await fetch(url, { headers: { 'api-key': API_KEY } });
        const json = await res.json();
        const passage = json?.data;
        if (!passage) return interaction.editReply({ content: '❌ Could not retrieve passage text.' });

        const text = passage.content
            .replace(/\[\d+\]/g, '')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 2000);

        const embed = new EmbedBuilder()
            .setTitle(`📜 ${passage.reference}${topic ? ` — ${topic}` : ''}`)
            .setDescription(text)
            .setColor('#5c2d91')
            .setFooter({ text: 'American Standard Version • Use /bible for individual verses' })
            .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
    } catch (err) {
        return interaction.editReply({ content: `❌ Failed to retrieve passage: ${err.message}` });
    }
}

module.exports = { data, execute };
