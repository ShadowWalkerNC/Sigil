'use strict';

const { SlashCommandBuilder, EmbedBuilder, codeBlock } = require('discord.js');
const { guiGet } = require('../util/guiRequest.js');

const LEVEL_EMOJI = { info: '🔵', warn: '🟡', error: '🔴' };

module.exports = {
    data: new SlashCommandBuilder()
        .setName('logs')
        .setDescription('View recent Sigil server logs')
        .addIntegerOption(o =>
            o.setName('lines')
             .setDescription('Number of lines to fetch (default 20, max 50)')
             .setMinValue(1).setMaxValue(50))
        .addStringOption(o =>
            o.setName('level')
             .setDescription('Filter by log level')
             .addChoices(
                 { name: 'All',   value: 'all'   },
                 { name: 'Info',  value: 'info'  },
                 { name: 'Warn',  value: 'warn'  },
                 { name: 'Error', value: 'error' },
             )),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const n     = interaction.options.getInteger('lines') ?? 20;
        const level = interaction.options.getString('level');
        const filter = (!level || level === 'all') ? '' : `&level=${level}`;

        let res;
        try {
            res = await guiGet(`/api/logs?tail=${n}${filter}`);
        } catch (err) {
            return interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle('❌ gui-server Unreachable')
                    .setDescription('Cannot fetch logs. Make sure `gui-server.js` is running.')
                    .setFooter({ text: err.message })],
            });
        }

        if (!res.ok) {
            return interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor(0xFF6600)
                    .setTitle('⚠️ Log Error')
                    .setDescription(res.error || 'Unknown error.')],
            });
        }

        const lines = res.lines || [];
        if (!lines.length) {
            return interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor(0x5865F2)
                    .setTitle('📋 Logs')
                    .setDescription('Log buffer is empty.')],
            });
        }

        // Format lines: [HH:MM:SS] LEVEL  text
        const formatted = lines.map(l => {
            const t   = new Date(l.ts).toTimeString().slice(0, 8);
            const tag = l.level.toUpperCase().padEnd(5);
            const emoji = LEVEL_EMOJI[l.level] || '⚪';
            return `${emoji} \`[${t}]\` \`${tag}\`  ${l.text.slice(0, 120)}`;
        }).join('\n');

        // Discord embed description cap = 4096 chars
        const desc = formatted.length > 3900
            ? formatted.slice(0, 3900) + '\n…truncated'
            : formatted;

        const errorCount = lines.filter(l => l.level === 'error').length;
        const warnCount  = lines.filter(l => l.level === 'warn').length;
        const color = errorCount > 0 ? 0xFF0000 : warnCount > 0 ? 0xFFA500 : 0x39FF14;

        return interaction.editReply({
            embeds: [new EmbedBuilder()
                .setColor(color)
                .setTitle(`📋 Last ${lines.length} Log Line(s)${level && level !== 'all' ? ` — ${level.toUpperCase()}` : ''}`)
                .setDescription(desc)
                .addFields({ name: 'Summary', value: `🔴 ${errorCount} error(s)  🟡 ${warnCount} warn(s)  🔵 ${lines.length - errorCount - warnCount} info(s)` })
                .setFooter({ text: 'Sigil gui-server.js log buffer' })
                .setTimestamp()],
        });
    },
};
