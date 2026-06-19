const {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionFlagsBits,
} = require('discord.js');
const { addCustomCommand, removeCustomCommand, getCustomCommands } = require('../utils/db.js');

const MAX_COMMANDS = 100;
const RESERVED = new Set([
    'help','ping','ban','kick','warn','timeout','unban','purge','slowmode',
    'userinfo','serverinfo','xprank','xpleaderboard','xpadmin','levelroles',
    'starboard','automod','autorole','reactionroles','ticket','poll','giveaway',
    'schedule','twitch','youtube','integrations','sigilconfig','logging','modlog',
]);

module.exports = {
    data: new SlashCommandBuilder()
        .setName('customcmd')
        .setDescription('Manage custom text commands for this server')
        .addSubcommand(sub => sub
            .setName('add')
            .setDescription('Add or update a custom command')
            .addStringOption(opt =>
                opt.setName('trigger')
                    .setDescription('The trigger word/phrase (e.g. !rules)')
                    .setMinLength(1)
                    .setMaxLength(32)
                    .setRequired(true)
            )
            .addStringOption(opt =>
                opt.setName('response')
                    .setDescription('The response text (supports {user}, {username}, {server}, {count})')
                    .setMaxLength(2000)
                    .setRequired(true)
            )
            .addBooleanOption(opt =>
                opt.setName('embed')
                    .setDescription('Send the response as an embed? (default: false)')
                    .setRequired(false)
            )
            .addStringOption(opt =>
                opt.setName('embed_color')
                    .setDescription('Embed color hex (e.g. #FF5733) — only used if embed is true')
                    .setRequired(false)
            )
            .addBooleanOption(opt =>
                opt.setName('delete_trigger')
                    .setDescription('Delete the trigger message after responding? (default: false)')
                    .setRequired(false)
            )
        )
        .addSubcommand(sub => sub
            .setName('remove')
            .setDescription('Remove a custom command')
            .addStringOption(opt =>
                opt.setName('trigger')
                    .setDescription('Trigger to remove')
                    .setRequired(true)
                    .setAutocomplete(true)
            )
        )
        .addSubcommand(sub => sub
            .setName('list')
            .setDescription('List all custom commands for this server')
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async autocomplete(interaction) {
        const focused  = interaction.options.getFocused().toLowerCase();
        const commands = getCustomCommands(interaction.guild.id);
        const choices  = commands
            .filter(c => c.trigger.includes(focused))
            .slice(0, 25)
            .map(c => ({ name: c.trigger, value: c.trigger }));
        await interaction.respond(choices);
    },

    async execute(interaction) {
        const sub     = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        if (sub === 'add') {
            const trigger       = interaction.options.getString('trigger').trim();
            const response      = interaction.options.getString('response');
            const useEmbed      = interaction.options.getBoolean('embed')        ?? false;
            const embedColor    = interaction.options.getString('embed_color')   ?? '#5865F2';
            const deleteTrigger = interaction.options.getBoolean('delete_trigger') ?? false;

            if (RESERVED.has(trigger.replace(/^[!?.]/,'').toLowerCase())) {
                return interaction.reply({ content: `\`${trigger}\` is a reserved command name.`, ephemeral: true });
            }
            if (useEmbed && !/^#[0-9A-Fa-f]{6}$/.test(embedColor)) {
                return interaction.reply({ content: '❌ Invalid embed color. Use format `#RRGGBB`.', ephemeral: true });
            }

            const existing = getCustomCommands(guildId);
            const isUpdate = existing.some(c => c.trigger === trigger.toLowerCase());
            if (!isUpdate && existing.length >= MAX_COMMANDS) {
                return interaction.reply({ content: `❌ Maximum of ${MAX_COMMANDS} custom commands reached.`, ephemeral: true });
            }

            addCustomCommand(guildId, trigger, response, useEmbed, embedColor, deleteTrigger, interaction.user.id);

            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle(isUpdate ? '✏️ Custom Command Updated' : '✅ Custom Command Added')
                        .setColor(isUpdate ? '#FAA61A' : '#43B581')
                        .addFields(
                            { name: 'Trigger',        value: `\`${trigger}\``,           inline: true },
                            { name: 'Embed',          value: useEmbed ? 'Yes' : 'No',    inline: true },
                            { name: 'Delete Trigger', value: deleteTrigger ? 'Yes' : 'No', inline: true },
                            { name: 'Response',       value: response.slice(0, 1024) },
                        )
                        .setTimestamp(),
                ],
                ephemeral: true,
            });
        }

        if (sub === 'remove') {
            const trigger = interaction.options.getString('trigger').trim();
            const removed = removeCustomCommand(guildId, trigger);
            if (!removed) {
                return interaction.reply({ content: `❌ No custom command found with trigger \`${trigger}\`.`, ephemeral: true });
            }
            return interaction.reply({ content: `✅ Custom command \`${trigger}\` removed.`, ephemeral: true });
        }

        if (sub === 'list') {
            const commands = getCustomCommands(guildId);
            if (!commands.length) {
                return interaction.reply({ content: '📋 No custom commands configured yet.\nUse `/customcmd add` to create one.', ephemeral: true });
            }

            const lines = commands.map(c => {
                const flags = [];
                if (c.embed)          flags.push('embed');
                if (c.delete_trigger) flags.push('del');
                return `\`${c.trigger}\`${flags.length ? ` *(${flags.join(', ')})*` : ''}`;
            });

            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle(`📝 Custom Commands (${commands.length}/${MAX_COMMANDS})`)
                        .setDescription(lines.slice(0, 20).join('\n'))
                        .setColor('#5865F2')
                        .setFooter({ text: `${commands.length} command${commands.length !== 1 ? 's' : ''}` })
                        .setTimestamp(),
                ],
                ephemeral: true,
            });
        }
    },
};
