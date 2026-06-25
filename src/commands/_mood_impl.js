'use strict';
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const MOOD_MAP = {
    joyful:    { emoji: '😄', color: '#FFD700', verse: 'NEH.8.10',  label: 'Nehemiah 8:10' },
    peaceful:  { emoji: '☮️',  color: '#87CEEB', verse: 'PHP.4.7',   label: 'Philippians 4:7' },
    anxious:   { emoji: '😰', color: '#FF8C00', verse: 'PHP.4.6',   label: 'Philippians 4:6' },
    sad:       { emoji: '😢', color: '#4682B4', verse: 'PSA.34.18', label: 'Psalm 34:18' },
    angry:     { emoji: '😤', color: '#DC143C', verse: 'EPH.4.26',  label: 'Ephesians 4:26' },
    grateful:  { emoji: '🙏', color: '#32CD32', verse: '1TH.5.18', label: '1 Thessalonians 5:18' },
    hopeful:   { emoji: '🌅', color: '#FFA07A', verse: 'ROM.15.13', label: 'Romans 15:13' },
    lonely:    { emoji: '🥺', color: '#9370DB', verse: 'PSA.23.4',  label: 'Psalm 23:4' },
    tired:     { emoji: '😴', color: '#708090', verse: 'MAT.11.28', label: 'Matthew 11:28' },
    confident: { emoji: '💪', color: '#FF4500', verse: 'PHP.4.13',  label: 'Philippians 4:13' },
};

const API_KEY = process.env.BIBLE_API_KEY;
const DEFAULT_BIBLE_ID = process.env.BIBLE_ID || 'de4e12af7f28f599-02';

const data = new SlashCommandBuilder()
    .setName('mood')
    .setDescription('Share how you are feeling and receive an encouraging verse')
    .addStringOption(o =>
        o.setName('mood')
         .setDescription('How are you feeling?')
         .setRequired(true)
         .addChoices(
             { name: '😄 Joyful',    value: 'joyful' },
             { name: '☮️ Peaceful',  value: 'peaceful' },
             { name: '😰 Anxious',   value: 'anxious' },
             { name: '😢 Sad',       value: 'sad' },
             { name: '😤 Angry',     value: 'angry' },
             { name: '🙏 Grateful',  value: 'grateful' },
             { name: '🌅 Hopeful',   value: 'hopeful' },
             { name: '🥺 Lonely',    value: 'lonely' },
             { name: '😴 Tired',     value: 'tired' },
             { name: '💪 Confident', value: 'confident' },
         ));

async function execute(interaction) {
    await interaction.deferReply();
    const mood = interaction.options.getString('mood');
    const entry = MOOD_MAP[mood];

    if (!API_KEY) {
        // Still respond meaningfully without API
        const embed = new EmbedBuilder()
            .setTitle(`${entry.emoji} Feeling ${mood.charAt(0).toUpperCase() + mood.slice(1)}`)
            .setDescription(`A verse for you: **${entry.label}**`)
            .setColor(entry.color)
            .setFooter({ text: 'Configure BIBLE_API_KEY to display the full verse.' })
            .setTimestamp();
        return interaction.editReply({ embeds: [embed] });
    }

    // Fetch the verse
    const url = `https://api.scripture.api.bible/v1/bibles/${DEFAULT_BIBLE_ID}/passages/${encodeURIComponent(entry.verse)}?content-type=text&include-notes=false&include-titles=false&include-chapter-numbers=false&include-verse-numbers=true`;
    try {
        const res = await fetch(url, { headers: { 'api-key': API_KEY } });
        const json = await res.json();
        const passage = json?.data;
        const text = passage?.content
            ?.replace(/\[\d+\]/g, '')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 1500) ?? entry.label;

        const embed = new EmbedBuilder()
            .setTitle(`${entry.emoji} Feeling ${mood.charAt(0).toUpperCase() + mood.slice(1)}, ${interaction.user.displayName}?`)
            .setDescription(`*${text}*\n\n— **${passage?.reference ?? entry.label}**`)
            .setColor(entry.color)
            .setFooter({ text: 'American Standard Version • /devotional for your daily verse' })
            .setTimestamp();

        return interaction.editReply({ embeds: [embed] });
    } catch (err) {
        return interaction.editReply({ content: `❌ Could not fetch verse: ${err.message}` });
    }
}

module.exports = { data, execute };
