const {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionFlagsBits,
} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('purge')
        .setDescription('Bulk delete messages from this channel')
        .addIntegerOption(opt =>
            opt.setName('amount')
                .setDescription('Number of messages to scan (1–100)')
                .setMinValue(1)
                .setMaxValue(100)
                .setRequired(true)
        )
        .addUserOption(opt =>
            opt.setName('user')
                .setDescription('Only delete messages from this user')
                .setRequired(false)
        )
        .addStringOption(opt =>
            opt.setName('filter')
                .setDescription('Filter by message type')
                .setRequired(false)
                .addChoices(
                    { name: 'Bots only',       value: 'bots' },
                    { name: 'Humans only',     value: 'humans' },
                    { name: 'Has attachments', value: 'attachments' },
                    { name: 'Has embeds',      value: 'embeds' },
                    { name: 'Has links',       value: 'links' },
                )
        )
        .addStringOption(opt =>
            opt.setName('contains')
                .setDescription('Only delete messages containing this text')
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

    async execute(interaction) {
        const amount   = interaction.options.getInteger('amount');
        const user     = interaction.options.getUser('user');
        const filter   = interaction.options.getString('filter');
        const contains = interaction.options.getString('contains')?.toLowerCase();

        await interaction.deferReply({ ephemeral: true });

        // Fetch messages (Discord only allows bulk-delete on messages < 14 days old)
        let messages;
        try {
            messages = await interaction.channel.messages.fetch({ limit: amount });
        } catch (err) {
            return interaction.editReply({ content: `❌ Failed to fetch messages: ${err.message}` });
        }

        // Apply filters
        let toDelete = [...messages.values()];

        if (user)     toDelete = toDelete.filter(m => m.author.id === user.id);
        if (contains) toDelete = toDelete.filter(m => m.content.toLowerCase().includes(contains));

        if (filter === 'bots')        toDelete = toDelete.filter(m => m.author.bot);
        if (filter === 'humans')      toDelete = toDelete.filter(m => !m.author.bot);
        if (filter === 'attachments') toDelete = toDelete.filter(m => m.attachments.size > 0);
        if (filter === 'embeds')      toDelete = toDelete.filter(m => m.embeds.length > 0);
        if (filter === 'links')       toDelete = toDelete.filter(m => /https?:\/\//.test(m.content));

        // Discord bulk-delete only works on messages < 14 days
        const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
        const deletable   = toDelete.filter(m => m.createdTimestamp > twoWeeksAgo);
        const tooOld      = toDelete.length - deletable.length;

        if (!deletable.length) {
            const note = tooOld ? ' (all matched messages are older than 14 days)' : '';
            return interaction.editReply({ content: `❌ No messages to delete${note}.` });
        }

        let deleted = 0;
        try {
            if (deletable.length === 1) {
                await deletable[0].delete();
                deleted = 1;
            } else {
                const result = await interaction.channel.bulkDelete(deletable, true);
                deleted = result.size;
            }
        } catch (err) {
            return interaction.editReply({ content: `❌ Bulk delete failed: ${err.message}` });
        }

        const parts = [`✅ Deleted **${deleted}** message${deleted !== 1 ? 's' : ''}`.trim()];
        if (user)     parts.push(`from <@${user.id}>`);
        if (filter)   parts.push(`(filter: ${filter})`);
        if (contains) parts.push(`(containing: "${contains}")`);
        if (tooOld)   parts.push(`\n⚠️ ${tooOld} message${tooOld !== 1 ? 's' : ''} skipped — older than 14 days.`);

        await interaction.editReply({ content: parts.join(' ') });
    },
};
