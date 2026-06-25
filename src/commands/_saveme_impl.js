'use strict';
const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');

const data = new SlashCommandBuilder()
    .setName('saveme')
    .setDescription('Get immediate crisis support resources — you are not alone');

async function execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const embed = new EmbedBuilder()
        .setTitle('💙 You Are Not Alone')
        .setDescription(
            'If you are in crisis or need someone to talk to, please reach out. ' +
            'These resources are free, confidential, and available 24/7.'
        )
        .setColor('#0057b7')
        .addFields(
            {
                name: '📞 988 Suicide & Crisis Lifeline (US)',
                value: 'Call or text **988**\n[Chat online](https://988lifeline.org)',
            },
            {
                name: '💬 Crisis Text Line',
                value: 'Text **HOME** to **741741** (US, UK, Canada, Ireland)',
            },
            {
                name: '🌍 International Association for Suicide Prevention',
                value: '[Find a crisis centre near you](https://www.iasp.info/resources/Crisis_Centres/)',
            },
            {
                name: '🙏 Prayer & Spiritual Support',
                value: 'Use `/prayer request` to share with your community.',
            },
        )
        .setFooter({ text: 'This message is only visible to you. You matter.' })
        .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setLabel('988 Lifeline')
            .setStyle(ButtonStyle.Link)
            .setURL('https://988lifeline.org'),
        new ButtonBuilder()
            .setLabel('Crisis Text Line')
            .setStyle(ButtonStyle.Link)
            .setURL('https://www.crisistextline.org'),
        new ButtonBuilder()
            .setLabel('Find Global Help')
            .setStyle(ButtonStyle.Link)
            .setURL('https://www.iasp.info/resources/Crisis_Centres/'),
    );

    return interaction.editReply({ embeds: [embed], components: [row] });
}

module.exports = { data, execute };
