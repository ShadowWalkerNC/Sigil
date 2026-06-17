import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

const GROUPS = [
  { name: '\uD83C\uDFA8 Branding', cmds: '`/brand ai` `/brand manual` `/brand apply` `/brand health`\n`/theme apply` `/theme list`\n`/profile manual` `/profile show`\n`/anime season`' },
  { name: '\uD83D\uDE00 Assets',   cmds: '`/emoji pack` `/emoji apply`\n`/sticker pack` `/sticker apply`\n`/role badge`' },
  { name: '\uD83C\uDFC6 Community',cmds: '`/tournament create` `/tournament end`\n`/leaderboard show` `/leaderboard add` `/leaderboard remove`\n`/clan create` `/clan join` `/clan leave` `/clan list`\n`/rank setup` `/rank add` `/rank show`' },
  { name: '\uD83D\uDCC5 Events',   cmds: '`/event create` `/event auto` `/event list`' },
  { name: '\u2699\uFE0F Server',   cmds: '`/server setup` `/server preflight`\n`/automation enable` `/automation disable` `/automation status`\n`/status` `/gui`' },
];

export default {
  data: new SlashCommandBuilder().setName('help').setDescription('Show all Sigil commands'),
  async execute(client, interaction) {
    const embed = new EmbedBuilder().setColor('#FF0000').setTitle('Sigil \u2014 Command Reference').setDescription('All 17 commands grouped by category.').setFooter({ text: 'Run /server preflight before first setup' });
    for (const g of GROUPS) embed.addFields({ name: g.name, value: g.cmds });
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
