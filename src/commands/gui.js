import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder().setName('gui').setDescription('Get the link to the visual GUI builder'),
  async execute(client, interaction) {
    const port = process.env.GUI_PORT || 3420;
    return interaction.reply({ embeds: [new EmbedBuilder().setColor('#FF0000').setTitle('\uD83C\uDFA8 Sigil Visual Builder').setDescription('Open in your browser:').addFields({ name: 'Local', value: `http://localhost:${port}` }, { name: 'Tip', value: 'Use Fast Preview for ~1s renders. Use Generate for full AI brand generation.' })], ephemeral: true });
  }
};
