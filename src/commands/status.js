const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('status')
    .setDescription('Show bot health and diagnostics'),

  async execute(interaction) {
    const client = interaction.client;
    const up = process.uptime();
    const uptimeStr = `${Math.floor(up / 3600)}h ${Math.floor((up % 3600) / 60)}m ${Math.floor(up % 60)}s`;
    const mem = process.memoryUsage();
    const guilds = client.guilds.cache.size;
    const users  = client.guilds.cache.reduce((a, g) => a + (g.memberCount || 0), 0);

    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor('#00FF00')
          .setTitle('\u2699\uFE0F Sigil Status')
          .addFields(
            { name: '\u23F1 Uptime',       value: uptimeStr,                                   inline: true },
            { name: '\uD83D\uDCBE Memory', value: `${Math.round(mem.heapUsed / 1024 / 1024)}MB`, inline: true },
            { name: '\uD83D\uDD0C Ping',   value: `${client.ws.ping}ms`,                       inline: true },
            { name: '\uD83C\uDF10 Guilds', value: `${guilds}`,                                 inline: true },
            { name: '\uD83D\uDC65 Users',  value: `${users}`,                                 inline: true },
          )
          .setTimestamp()
          .setFooter({ text: `Node ${process.version}` }),
      ],
      ephemeral: true,
    });
  },
};
