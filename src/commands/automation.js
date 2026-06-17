import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { db } from '../utils/database.js';

export default {
  data: new SlashCommandBuilder()
    .setName('automation')
    .setDescription('Control server automation features')
    .addSubcommand(sub => sub.setName('enable').setDescription('Enable automations')
      .addChannelOption(opt => opt.setName('welcome_channel').setDescription('Channel for welcome/goodbye cards').setRequired(false)))
    .addSubcommand(sub => sub.setName('disable').setDescription('Disable all automations'))
    .addSubcommand(sub => sub.setName('status').setDescription('Show current automation status')),

  async execute(client, interaction) {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId;
    if (sub === 'enable') {
      const ch = interaction.options.getChannel('welcome_channel');
      db.prepare('INSERT OR REPLACE INTO server_settings (guild_id, automation_mode, welcome_channel_id) VALUES (?, \'on\', ?)').run(guildId, ch?.id || null);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor('#00FF00').setTitle('\u2713 Automation Enabled').addFields({ name: '\uD83D\uDCE8 Welcome channel', value: ch ? `<#${ch.id}>` : 'System channel', inline: true })] });
    }
    if (sub === 'disable') {
      db.prepare('INSERT OR REPLACE INTO server_settings (guild_id, automation_mode) VALUES (?, \'off\')').run(guildId);
      return interaction.reply({ embeds: [new EmbedBuilder().setColor('#FF0000').setTitle('\u2713 Automation Disabled').setDescription('All automations are now off.')] });
    }
    if (sub === 'status') {
      const s = db.prepare('SELECT * FROM server_settings WHERE guild_id = ?').get(guildId);
      const mode = s?.automation_mode || 'off';
      return interaction.reply({ embeds: [new EmbedBuilder().setColor(mode === 'on' ? '#00FF00' : '#FF0000').setTitle('Automation Status').addFields({ name: '\uD83D\uDD04 Mode', value: mode === 'on' ? '\uD83D\uDFE2 On' : '\uD83D\uDD34 Off', inline: true }, { name: '\uD83D\uDCE8 Welcome channel', value: s?.welcome_channel_id ? `<#${s.welcome_channel_id}>` : 'Not set', inline: true })] });
    }
  }
};
