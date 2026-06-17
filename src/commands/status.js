import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { db } from '../utils/database.js';
import os from 'os';

export default {
  data: new SlashCommandBuilder().setName('status').setDescription('Show bot health and diagnostics'),
  async execute(client, interaction) {
    const up = process.uptime();
    const uptimeStr = `${Math.floor(up/3600)}h ${Math.floor((up%3600)/60)}m ${Math.floor(up%60)}s`;
    const mem = process.memoryUsage();
    const pending = db.prepare("SELECT COUNT(*) as n FROM jobs WHERE status = 'pending'").get().n;
    const done    = db.prepare("SELECT COUNT(*) as n FROM jobs WHERE status = 'done'").get().n;
    const failed  = db.prepare("SELECT COUNT(*) as n FROM jobs WHERE status = 'failed'").get().n;
    const guilds  = client.guilds.cache.size;
    const users   = client.guilds.cache.reduce((a,g) => a + (g.memberCount||0), 0);
    return interaction.reply({ embeds: [new EmbedBuilder().setColor(failed > 0 ? '#FFD700' : '#00FF00').setTitle('\u2699\uFE0F Sigil Status').addFields(
      { name: '\u23F1 Uptime',      value: uptimeStr,                                              inline: true },
      { name: '\uD83D\uDCBE Memory', value: `${Math.round(mem.heapUsed/1024/1024)}MB`,             inline: true },
      { name: '\uD83D\uDD0C Ping',  value: `${client.ws.ping}ms`,                                 inline: true },
      { name: '\uD83C\uDF10 Guilds',value: `${guilds}`,                                            inline: true },
      { name: '\uD83D\uDC65 Users', value: `${users}`,                                            inline: true },
      { name: '\uD83D\uDCEC Pending',value:`${pending}`,                                           inline: true },
      { name: '\u2705 Done',        value: `${done}`,                                             inline: true },
      { name: '\u274C Failed',      value: `${failed}`,                                           inline: true }
    ).setTimestamp().setFooter({ text: `Node ${process.version}` })], ephemeral: true });
  }
};
