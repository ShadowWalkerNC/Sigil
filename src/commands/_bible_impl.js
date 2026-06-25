'use strict';
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const API_KEY = process.env.BIBLE_API_KEY;
const DEFAULT_BIBLE_ID = process.env.BIBLE_ID || 'de4e12af7f28f599-02'; // ASV free

const data = new SlashCommandBuilder()
    .setName('bible')
    .setDescription('Look up a Bible verse')
    .addStringOption(o =>
        o.setName('reference')
         .setDescription('Verse reference e.g. John 3:16, Genesis 1:1-3')
         .setRequired(true));

async function execute(interaction) {
    if (!API_KEY) {
        return interaction.reply({
            content: '⚙️ Bible API is not configured. Set `BIBLE_API_KEY` in your environment.',
            ephemeral: true,
        });
    }

    await interaction.deferReply();
    const ref = interaction.options.getString('reference').trim();

    // Search for the passage
    const searchUrl = `https://api.scripture.api.bible/v1/bibles/${DEFAULT_BIBLE_ID}/search?query=${encodeURIComponent(ref)}&limit=1`;
    let verseId;
    try {
        const searchRes = await fetch(searchUrl, { headers: { 'api-key': API_KEY } });
        const searchData = await searchRes.json();
        const verses = searchData?.data?.verses;
        if (!verses || verses.length === 0) {
            return interaction.editReply({ content: `❌ No results found for **${ref}**.` });
        }
        verseId = verses[0].id;
    } catch (err) {
        return interaction.editReply({ content: `❌ Failed to search for verse: ${err.message}` });
    }

    // Fetch full passage text
    const passageUrl = `https://api.scripture.api.bible/v1/bibles/${DEFAULT_BIBLE_ID}/passages/${encodeURIComponent(verseId)}?content-type=text&include-notes=false&include-titles=false&include-chapter-numbers=false&include-verse-numbers=true`;
    try {
        const passageRes = await fetch(passageUrl, { headers: { 'api-key': API_KEY } });
        const passageData = await passageRes.json();
        const passage = passageData?.data;
        if (!passage) {
            return interaction.editReply({ content: `❌ Could not retrieve passage text.` });
        }

        const text = passage.content
            .replace(/\[\d+\]/g, '')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 1900);

        const embed = new EmbedBuilder()
            .setTitle(`📖 ${passage.reference}`)
            .setDescription(text)
            .setColor('#1e3a5f')
            .setFooter({ text: passage.bibleId === 'de4e12af7f28f599-02' ? 'American Standard Version' : passage.bibleId })
            .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
    } catch (err) {
        return interaction.editReply({ content: `❌ Failed to retrieve passage: ${err.message}` });
    }
}

module.exports = { data, execute };
