'use strict';
const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');

const data = new SlashCommandBuilder()
    .setName('saveme')
    .setDescription('Get immediate crisis support resources — you are not alone');

async function execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const embed = new EmbedBuilder()
        .setTitle('\ud83d\udc99 You Are Not Alone')
        .setDescription(
            'If you are in crisis or need someone to talk to, please reach out. ' +
            'These resources are free, confidential, and available 24/7.'
        )
        .setColor('#0057b7')
        .addFields(
            {
                name: '\ud83d\udcde 988 Suicide & Crisis Lifeline (US)',
                value: 'Call or text **988**\n[Chat online](https://988lifeline.org)',
            },
            {
                name: '\ud83d\udcac Crisis Text Line',
                value: 'Text **HOME** to **741741** (US, UK, Canada, Ireland)',
            },
            {
                name: '\ud83c\udf0d International Association for Suicide Prevention',
                value: '[Find a crisis centre near you](https://www.iasp.info/resources/Crisis_Centres/)',
            },
            {
                name: '\ud83d\ude4f Prayer & Spiritual Support',
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

    // Attempt to DM so resources stay in their inbox even after dismissing
    let dmSent = false;
    try {
        await interaction.user.send({ embeds: [embed], components: [row] });
        dmSent = true;
    } catch {
        // DMs disabled or blocked — ephemeral reply is the fallback
    }

    const replyEmbed = new EmbedBuilder()
        .setTitle('\ud83d\udc99 You Are Not Alone')
        .setDescription(
            'If you are in crisis or need someone to talk to, please reach out. ' +
            'These resources are free, confidential, and available 24/7.'
        )
        .setColor('#0057b7')
        .addFields(
            {
                name: '\ud83d\udcde 988 Suicide & Crisis Lifeline (US)',
                value: 'Call or text **988**\n[Chat online](https://988lifeline.org)',
            },
            {
                name: '\ud83d\udcac Crisis Text Line',
                value: 'Text **HOME** to **741741** (US, UK, Canada, Ireland)',
            },
            {
                name: '\ud83c\udf0d International Association for Suicide Prevention',
                value: '[Find a crisis centre near you](https://www.iasp.info/resources/Crisis_Centres/)',
            },
            {
                name: '\ud83d\ude4f Prayer & Spiritual Support',
                value: 'Use `/prayer request` to share with your community.',
            },
        )
        .setFooter({ text: dmSent
            ? '\ud83d\udce8 A copy has been sent to your DMs. You matter.'
            : 'This message is only visible to you. You matter.'
        })
        .setTimestamp();

    return interaction.editReply({ embeds: [replyEmbed], components: [row] });
}

module.exports = { data, execute };
