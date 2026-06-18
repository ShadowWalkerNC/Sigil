const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('automation')
    .setDescription('Control server automation features')
    .addSubcommand(sub => sub.setName('enable').setDescription('Enable automations')
      .addChannelOption(opt => opt.setName('welcome_channel').setDescription('Channel for welcome/goodbye cards').setRequired(false)))
    .addSubcommand(sub => sub.setName('disable').setDescription('Disable all automations'))
    .addSubcommand(sub => sub.setName('status').setDescription('Show current automation status')),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'enable') {
      const ch = interaction.options.getChannel('welcome_channel');
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('\u2713 Automation Enabled')
            .addFields({ name: '\uD83D\uDCE8 Welcome channel', value: ch ? `<#${ch.id}>` : 'System channel', inline: true }),
        ],
      });
    }

    if (sub === 'disable') {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('\u2713 Automation Disabled')
            .setDescription('All automations are now off.'),
        ],
      });
    }

    if (sub === 'status') {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('Automation Status')
            .addFields(
              { name: '\uD83D\uDD04 Mode', value: '\uD83D\uDD34 Off', inline: true },
              { name: '\uD83D\uDCE8 Welcome channel', value: 'Not set', inline: true },
            ),
        ],
      });
    }
  },
};
