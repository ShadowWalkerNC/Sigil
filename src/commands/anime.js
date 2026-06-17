import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { db } from '../utils/database.js';
import { enqueue } from '../utils/queue.js';

const SEASONS = {
  'spring-2026': { name: 'Spring 2026', primary: '#FF69B4', secondary: '#98FB98', bg: 'plain-white',  emoji: '\uD83C\uDF38' },
  'summer-2026': { name: 'Summer 2026', primary: '#FFD700', secondary: '#00BFFF', bg: 'sunset',       emoji: '\u2600\uFE0F' },
  'fall-2026':   { name: 'Fall 2026',   primary: '#FF4500', secondary: '#8B4513', bg: 'sunset',       emoji: '\uD83C\uDF42' },
  'winter-2026': { name: 'Winter 2026', primary: '#00BFFF', secondary: '#FFFFFF', bg: 'starfield',    emoji: '\u2744\uFE0F' },
  'spring-2027': { name: 'Spring 2027', primary: '#FF69B4', secondary: '#98FB98', bg: 'plain-white',  emoji: '\uD83C\uDF38' },
};

export default {
  data: new SlashCommandBuilder()
    .setName('anime')
    .setDescription('Seasonal theme and anime tools')
    .addSubcommand(sub => sub.setName('season').setDescription('Swap server to a seasonal theme')
      .addStringOption(opt => opt.setName('season').setDescription('Season').setRequired(true)
        .addChoices(...Object.entries(SEASONS).map(([k,v]) => ({ name: v.name, value: k })))))
    .addSubcommand(sub => sub.setName('list').setDescription('List all seasonal themes')),

  async execute(client, interaction) {
    const sub = interaction.options.getSubcommand();
    if (sub === 'list') {
      const lines = Object.entries(SEASONS).map(([k,v]) => `${v.emoji} **${v.name}** (\`${k}\`) — ${v.primary} / ${v.secondary}`).join('\n');
      return interaction.reply({ embeds: [new EmbedBuilder().setColor('#FF69B4').setTitle('\uD83C\uDF38 Seasonal Themes').setDescription(lines).setFooter({ text: 'Use /anime season <key> to apply' })] });
    }
    if (sub === 'season') {
      const key = interaction.options.getString('season');
      const s   = SEASONS[key];
      if (!s) return interaction.reply({ content: `\u2717 Unknown season: ${key}`, ephemeral: true });
      db.prepare('INSERT OR REPLACE INTO server_profiles (guild_id, primary_color, secondary_color, background_key, theme_key) VALUES (?, ?, ?, ?, ?)').run(interaction.guildId, s.primary, s.secondary, s.bg, key);
      await enqueue('emoji_upload', { guild_id: interaction.guildId, count: 10 });
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(s.primary).setTitle(`${s.emoji} Seasonal Theme Applied — ${s.name}`).addFields({ name: '\uD83C\uDFA8 Primary', value: s.primary, inline: true }, { name: '\uD83C\uDFA8 Secondary', value: s.secondary, inline: true }).setFooter({ text: 'Run /brand apply to push icon + banner' })] });
    }
  }
};
