'use strict';

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { guiGet } = require('../util/guiRequest.js');

const INDICATOR = { ok: '🟢', degraded: '🟡', down: '🔴', unknown: '⚫' };

function indicator(ok, reachable = true) {
    if (!reachable) return INDICATOR.down;
    return ok ? INDICATOR.ok : INDICATOR.degraded;
}

function fmtUptime(ms) {
    if (!ms) return 'unknown';
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60)  % 60;
    const h = Math.floor(s / 3600) % 24;
    const d = Math.floor(s / 86400);
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m ${s % 60}s`;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('status')
        .setDescription('Show the health status of the entire Sigil + ASCILINE stack'),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        let res;
        try {
            res = await guiGet('/api/status/full');
        } catch (err) {
            return interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor(0xFF0000)
                    .setTitle('❌ gui-server Unreachable')
                    .setDescription('Cannot fetch status. Make sure `gui-server.js` is running.')
                    .setFooter({ text: err.message })],
            });
        }

        const { bot, gui, asciline, last_error } = res;

        // Overall color: red if any layer is down, yellow if degraded, green if all ok
        const allOk = bot?.ok && gui?.ok && asciline?.ok;
        const anyDown = !bot?.reachable || !gui?.reachable || !asciline?.reachable;
        const color = anyDown ? 0xFF0000 : allOk ? 0x39FF14 : 0xFFA500;

        const fields = [
            {
                name: `${indicator(bot?.ok, bot?.reachable)} Bot`,
                value: bot?.reachable
                    ? `Online · ${bot.guilds ?? '?'} guild(s) · latency ${bot.latency ?? '?'}ms`
                    : 'Unreachable',
                inline: false,
            },
            {
                name: `${indicator(gui?.ok, gui?.reachable)} gui-server`,
                value: gui?.reachable
                    ? `v${gui.version} · up ${fmtUptime(gui.uptime_ms)}`
                    : 'Unreachable',
                inline: false,
            },
            {
                name: `${indicator(asciline?.ok, asciline?.reachable)} ASCILINE`,
                value: asciline?.reachable
                    ? (asciline.playing
                        ? `▶ Playing · mode ${asciline.mode} · ${asciline.cols} cols`
                        : 'Idle — queue empty')
                    : 'Unreachable (stream_server.py offline?)',
                inline: false,
            },
        ];

        if (last_error) {
            const t = new Date(last_error.ts).toTimeString().slice(0, 8);
            fields.push({
                name: '🔴 Last Error',
                value: `\`[${t}]\` ${last_error.text.slice(0, 200)}`,
                inline: false,
            });
        }

        return interaction.editReply({
            embeds: [new EmbedBuilder()
                .setColor(color)
                .setTitle('📊 Sigil Stack Status')
                .addFields(fields)
                .setFooter({ text: 'Sigil gui-server.js' })
                .setTimestamp()],
        });
    },
};
