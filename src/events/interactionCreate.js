const { EmbedBuilder } = require('discord.js');

// NOTE: slash command routing is handled directly in src/index.js.
// This event handler is scoped to button interactions only.
module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        if (!interaction.isButton()) return;

        const { customId, guildId } = interaction;

        if (customId === 'setup_brand') {
            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#00FF00')
                    .setTitle('\u2713 Step 1 \u2014 Brand')
                    .setDescription('Run `/brand ai` or `/brand kit` to design your brand, then `/brand share` to open it in the Visual Builder.')],
                ephemeral: true,
            });
        }

        if (customId === 'setup_emoji') {
            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#00FF00')
                    .setTitle('\u2713 Step 2 \u2014 Emoji')
                    .setDescription('Upload custom emoji via Server Settings \u2192 Emoji.')],
                ephemeral: true,
            });
        }

        if (customId === 'setup_roles') {
            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#00FF00')
                    .setTitle('\u2713 Step 3 \u2014 Roles')
                    .setDescription('Create and assign roles via Server Settings \u2192 Roles.')],
                ephemeral: true,
            });
        }

        if (customId === 'setup_auto') {
            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#00FF00')
                    .setTitle('\u2713 Step 4 \u2014 Automation')
                    .setDescription('Automation settings enabled.')],
                ephemeral: true,
            });
        }
    },
};
