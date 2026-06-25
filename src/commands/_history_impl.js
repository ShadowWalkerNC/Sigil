'use strict';
const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const historyUtil = require('../utils/history.js');

const data = new SlashCommandBuilder()
    .setName('history')
    .setDescription('View your recent command and activity history in this server')
    .addUserOption(o =>
        o.setName('user')
         .setDescription('User to look up (admin only, defaults to yourself)')
         .setRequired(false));

async function execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const target = interaction.options.getUser('user');
    const isSelf = !target || target.id === interaction.user.id;

    // Only admins can view others
    if (!isSelf && !interaction.member.permissions.has('Administrator')) {
        return interaction.editReply({ content: '❌ You need Administrator permission to view another user\'s history.' });
    }

    const userId = isSelf ? interaction.user.id : target.id;
    const displayUser = isSelf ? interaction.user : target;

    let entries;
    try {
        entries = historyUtil.getHistory
            ? historyUtil.getHistory(interaction.guildId, userId)
            : historyUtil.get?.(interaction.guildId, userId);
    } catch {
        entries = null;
    }

    if (!entries || !entries.length) {
        return interaction.editReply({
            content: `No recorded history for **${displayUser.username}** in this server yet.`,
        });
    }

    const lines = entries
        .slice(-20)
        .reverse()
        .map((e, i) => `\`${String(i + 1).padStart(2)}.\` **/${e.command ?? e.action ?? 'unknown'}** — <t:${Math.floor((e.timestamp ?? Date.now()) / 1000)}:R>`);

    const embed = new EmbedBuilder()
        .setTitle(`📋 Activity History — ${displayUser.username}`)
        .setDescription(lines.join('\n'))
        .setColor('#5865F2')
        .setThumbnail(displayUser.displayAvatarURL())
        .setFooter({ text: 'Showing up to 20 most recent entries' })
        .setTimestamp();

    return interaction.editReply({ embeds: [embed] });
}

module.exports = { data, execute };
