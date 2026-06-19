const {
    SlashCommandBuilder, EmbedBuilder, ActionRowBuilder,
    ButtonBuilder, ButtonStyle, PermissionFlagsBits,
} = require('discord.js');

// In-memory store: messageId -> { userId, request, anonymous, prayCount: Set }
const prayerStore = new Map();

function buildEmbed(data, guild) {
    const embed = new EmbedBuilder()
        .setTitle('\uD83D\uDE4F Prayer Request')
        .setColor('#F4C842')
        .setTimestamp();

    const author = data.anonymous ? '\uD83D\uDC64 Anonymous' : `<@${data.userId}>`;
    embed.setDescription(`${author} has submitted a prayer request:\n\n*"${data.request}"*\n\n\uD83D\uDE4F **${data.prayCount.size}** ${data.prayCount.size === 1 ? 'person is' : 'people are'} praying`);
    embed.setFooter({ text: `Sigil \u2022 Prayer Wall \u2022 ${guild.name}` });
    return embed;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('prayer')
        .setDescription('Submit a prayer request to the prayer wall')
        .addStringOption(opt =>
            opt.setName('request').setDescription('Your prayer request').setRequired(true).setMaxLength(500)
        )
        .addBooleanOption(opt =>
            opt.setName('anonymous').setDescription('Hide your name? (default false)').setRequired(false)
        )
        .addChannelOption(opt =>
            opt.setName('channel').setDescription('Channel to post in (defaults to current)').setRequired(false)
        )
        .addRoleOption(opt =>
            opt.setName('notify').setDescription('Role to notify (e.g. @Prayer Team)').setRequired(false)
        ),

    async execute(interaction) {
        const request   = interaction.options.getString('request');
        const anonymous = interaction.options.getBoolean('anonymous') ?? false;
        const target    = interaction.options.getChannel('channel') ?? interaction.channel;
        const notify    = interaction.options.getRole('notify');
        const guild     = interaction.guild;

        const data = {
            userId: interaction.user.id,
            request,
            anonymous,
            prayCount: new Set(),
            guild,
        };

        const embed   = buildEmbed(data, guild);
        const content = notify ? `<@&${notify.id}>` : undefined;
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('prayer_pray_placeholder')
                .setLabel('\uD83D\uDE4F I am Praying')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId('prayer_answered_placeholder')
                .setLabel('\u2705 Answered!')
                .setStyle(ButtonStyle.Success),
        );

        let msg;
        try {
            msg = await target.send({ content, embeds: [embed], components: [row] });
        } catch (err) {
            console.error('[Prayer] Failed to post:', err.message);
            return interaction.reply({
                content: `\u274C Could not post to <#${target.id}>. Check my permissions.`,
                ephemeral: true,
            });
        }

        // Update customIds now that we have message id
        data.messageId = msg.id;
        prayerStore.set(msg.id, data);

        const realRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`prayer_pray_${msg.id}`)
                .setLabel('\uD83D\uDE4F I am Praying')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`prayer_answered_${msg.id}`)
                .setLabel('\u2705 Answered!')
                .setStyle(ButtonStyle.Success),
        );
        await msg.edit({ components: [realRow] }).catch(() => {});

        await interaction.reply({
            content: `\u2705 Your prayer request has been posted to <#${target.id}>.`,
            ephemeral: true,
        });
    },

    async handleButton(interaction) {
        const id = interaction.customId;
        if (!id.startsWith('prayer_')) return false;

        const parts     = id.split('_');
        const action    = parts[1]; // pray | answered
        const messageId = parts.slice(2).join('_');
        const data      = prayerStore.get(messageId);

        if (!data) {
            return interaction.reply({ content: 'This prayer request is no longer active.', ephemeral: true });
        }

        const userId = interaction.user.id;

        if (action === 'pray') {
            if (data.prayCount.has(userId)) {
                data.prayCount.delete(userId);
            } else {
                data.prayCount.add(userId);
            }
            const updated = buildEmbed(data, data.guild);
            await interaction.update({ embeds: [updated] });
            return true;
        }

        if (action === 'answered') {
            // Only the original poster or a mod can mark answered
            const isMod = interaction.memberPermissions?.has('ManageMessages');
            if (userId !== data.userId && !isMod) {
                return interaction.reply({
                    content: '\u274C Only the person who submitted this request or a moderator can mark it as answered.',
                    ephemeral: true,
                });
            }

            const answeredEmbed = new EmbedBuilder()
                .setTitle('\u2705 Prayer Answered!')
                .setColor('#57F287')
                .setDescription(
                    `${data.anonymous ? '\uD83D\uDC64 Anonymous' : `<@${data.userId}>`}'s prayer request has been answered!\n\n` +
                    `*"${data.request}"*\n\n` +
                    `\uD83D\uDE4F **${data.prayCount.size}** ${data.prayCount.size === 1 ? 'person was' : 'people were'} praying`
                )
                .setFooter({ text: `Sigil \u2022 Prayer Wall \u2022 ${data.guild.name}` })
                .setTimestamp();

            await interaction.update({ embeds: [answeredEmbed], components: [] });
            prayerStore.delete(messageId);
            return true;
        }

        return false;
    },
};
