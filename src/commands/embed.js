const {
    SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits,
    ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder,
    ButtonBuilder, ButtonStyle,
} = require('discord.js');

// Per-user draft store: userId -> EmbedBuilder state object
const drafts = new Map();

function emptyDraft() {
    return {
        title: null, description: null, color: '#5865F2',
        footer: null, thumbnail: null, image: null,
        authorName: null, authorIcon: null,
        fields: [],   // [{ name, value, inline }]
        timestamp: false,
    };
}

function buildFromDraft(d) {
    const e = new EmbedBuilder().setColor(d.color ?? '#5865F2');
    if (d.title)       e.setTitle(d.title);
    if (d.description) e.setDescription(d.description);
    if (d.footer)      e.setFooter({ text: d.footer });
    if (d.thumbnail)   e.setThumbnail(d.thumbnail);
    if (d.image)       e.setImage(d.image);
    if (d.authorName)  e.setAuthor({ name: d.authorName, iconURL: d.authorIcon ?? undefined });
    if (d.timestamp)   e.setTimestamp();
    if (d.fields.length) e.addFields(d.fields);
    return e;
}

function controlRow(userId) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`emb_edit_${userId}`).setLabel('\u270F\uFE0F Edit Content').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`emb_field_${userId}`).setLabel('\u2795 Add Field').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`emb_image_${userId}`).setLabel('\uD83D\uDDBC\uFE0F Set Images').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId(`emb_send_${userId}`).setLabel('\uD83D\uDE80 Send').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`emb_discard_${userId}`).setLabel('\uD83D\uDDD1\uFE0F Discard').setStyle(ButtonStyle.Danger),
    );
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('embed')
        .setDescription('Build and send a custom embed')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addSubcommand(sub =>
            sub.setName('create')
                .setDescription('Open the embed builder')
                .addStringOption(opt => opt.setName('title').setDescription('Embed title').setRequired(false))
                .addStringOption(opt => opt.setName('description').setDescription('Embed body text').setRequired(false))
                .addStringOption(opt => opt.setName('color').setDescription('Hex color (e.g. #FF5733)').setRequired(false))
                .addChannelOption(opt => opt.setName('channel').setDescription('Where to send (defaults to current)').setRequired(false))
                .addBooleanOption(opt => opt.setName('timestamp').setDescription('Add a timestamp').setRequired(false))
        )
        .addSubcommand(sub =>
            sub.setName('quick')
                .setDescription('Send a simple embed immediately without the builder UI')
                .addStringOption(opt => opt.setName('description').setDescription('Embed body').setRequired(true))
                .addStringOption(opt => opt.setName('title').setDescription('Embed title').setRequired(false))
                .addStringOption(opt => opt.setName('color').setDescription('Hex color').setRequired(false))
                .addChannelOption(opt => opt.setName('channel').setDescription('Where to send').setRequired(false))
                .addRoleOption(opt => opt.setName('ping').setDescription('Role to ping').setRequired(false))
        ),

    async execute(interaction) {
        const sub    = interaction.options.getSubcommand();
        const userId = interaction.user.id;

        if (sub === 'quick') {
            const title  = interaction.options.getString('title');
            const desc   = interaction.options.getString('description');
            const color  = interaction.options.getString('color') ?? '#5865F2';
            const target = interaction.options.getChannel('channel') ?? interaction.channel;
            const ping   = interaction.options.getRole('ping');

            const embed = new EmbedBuilder().setDescription(desc).setColor(color);
            if (title) embed.setTitle(title);
            embed.setFooter({ text: `Sigil \u2022 ${interaction.guild.name}` }).setTimestamp();

            try {
                await target.send({ content: ping ? `<@&${ping.id}>` : undefined, embeds: [embed] });
                return interaction.reply({ content: `\u2705 Embed sent to <#${target.id}>.`, ephemeral: true });
            } catch (e) {
                return interaction.reply({ content: `\u274C Could not post: ${e.message}`, ephemeral: true });
            }
        }

        if (sub === 'create') {
            const draft = emptyDraft();
            draft.title       = interaction.options.getString('title')   ?? null;
            draft.description = interaction.options.getString('description') ?? null;
            draft.color       = interaction.options.getString('color')   ?? '#5865F2';
            draft.timestamp   = interaction.options.getBoolean('timestamp') ?? false;
            draft.targetChannel = (interaction.options.getChannel('channel') ?? interaction.channel).id;

            drafts.set(userId, draft);

            const preview = buildFromDraft(draft);
            preview.setFooter({ text: `Sigil \u2022 Embed Builder \u2022 Preview` });

            const hasContent = draft.title || draft.description;
            if (!hasContent)
                preview.setDescription('*Your embed preview will appear here.*\nClick **\u270F\uFE0F Edit Content** to start.');

            return interaction.reply({
                content: '**\uD83D\uDCE6 Embed Builder** \u2014 this is your live preview. Use the buttons below.',
                embeds: [preview],
                components: [controlRow(userId)],
                ephemeral: true,
            });
        }
    },

    async handleButton(interaction) {
        const id = interaction.customId;
        if (!id.startsWith('emb_')) return false;

        const parts  = id.split('_');
        const action = parts[1];
        const owner  = parts.slice(2).join('_');

        if (interaction.user.id !== owner)
            return interaction.reply({ content: 'This embed builder belongs to someone else.', ephemeral: true });

        const draft = drafts.get(owner);
        if (!draft)
            return interaction.reply({ content: 'Draft expired or not found. Run `/embed create` again.', ephemeral: true });

        if (action === 'edit') {
            const modal = new ModalBuilder()
                .setCustomId(`embm_edit_${owner}`)
                .setTitle('Edit Embed Content');
            modal.addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId('emb_m_title').setLabel('Title').setStyle(TextInputStyle.Short)
                        .setValue(draft.title ?? '').setRequired(false).setMaxLength(256)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId('emb_m_desc').setLabel('Description').setStyle(TextInputStyle.Paragraph)
                        .setValue(draft.description ?? '').setRequired(false).setMaxLength(4000)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId('emb_m_color').setLabel('Hex Color (e.g. #FF5733)').setStyle(TextInputStyle.Short)
                        .setValue(draft.color ?? '#5865F2').setRequired(false)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId('emb_m_footer').setLabel('Footer text').setStyle(TextInputStyle.Short)
                        .setValue(draft.footer ?? '').setRequired(false).setMaxLength(2048)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId('emb_m_author').setLabel('Author name').setStyle(TextInputStyle.Short)
                        .setValue(draft.authorName ?? '').setRequired(false).setMaxLength(256)
                ),
            );
            await interaction.showModal(modal);
            return true;
        }

        if (action === 'field') {
            if (draft.fields.length >= 25)
                return interaction.reply({ content: '\u274C Maximum 25 fields per embed.', ephemeral: true });
            const modal = new ModalBuilder()
                .setCustomId(`embm_field_${owner}`)
                .setTitle('Add Field');
            modal.addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId('emb_f_name').setLabel('Field name').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(256)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId('emb_f_value').setLabel('Field value').setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(1024)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId('emb_f_inline').setLabel('Inline? (yes/no)').setStyle(TextInputStyle.Short).setValue('no').setRequired(false)
                ),
            );
            await interaction.showModal(modal);
            return true;
        }

        if (action === 'image') {
            const modal = new ModalBuilder()
                .setCustomId(`embm_image_${owner}`)
                .setTitle('Set Images');
            modal.addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId('emb_i_thumb').setLabel('Thumbnail URL').setStyle(TextInputStyle.Short)
                        .setValue(draft.thumbnail ?? '').setRequired(false)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId('emb_i_image').setLabel('Large Image URL').setStyle(TextInputStyle.Short)
                        .setValue(draft.image ?? '').setRequired(false)
                ),
            );
            await interaction.showModal(modal);
            return true;
        }

        if (action === 'discard') {
            drafts.delete(owner);
            return interaction.update({
                content: '\uD83D\uDDD1\uFE0F Embed discarded.',
                embeds: [], components: [],
            });
        }

        if (action === 'send') {
            const guild   = interaction.guild;
            const channel = await guild.channels.fetch(draft.targetChannel).catch(() => null);
            if (!channel)
                return interaction.reply({ content: '\u274C Target channel not found.', ephemeral: true });

            if (!draft.title && !draft.description && !draft.fields.length)
                return interaction.reply({ content: '\u274C Your embed has no content. Add a title or description first.', ephemeral: true });

            const embed = buildFromDraft(draft);
            embed.setFooter({ text: `Sigil \u2022 ${guild.name}` }).setTimestamp();

            try {
                await channel.send({ embeds: [embed] });
                drafts.delete(owner);
                return interaction.update({
                    content: `\u2705 Embed sent to <#${channel.id}>.`,
                    embeds: [], components: [],
                });
            } catch (e) {
                return interaction.reply({ content: `\u274C Failed to send: ${e.message}`, ephemeral: true });
            }
        }

        return false;
    },

    async handleModal(interaction) {
        const id = interaction.customId;
        if (!id.startsWith('embm_')) return false;

        const parts  = id.split('_');
        const action = parts[1];
        const owner  = parts.slice(2).join('_');

        if (interaction.user.id !== owner)
            return interaction.reply({ content: 'This is not your embed builder.', ephemeral: true });

        const draft = drafts.get(owner);
        if (!draft)
            return interaction.reply({ content: 'Draft expired. Run `/embed create` again.', ephemeral: true });

        if (action === 'edit') {
            const title  = interaction.fields.getTextInputValue('emb_m_title').trim();
            const desc   = interaction.fields.getTextInputValue('emb_m_desc').trim();
            const color  = interaction.fields.getTextInputValue('emb_m_color').trim();
            const footer = interaction.fields.getTextInputValue('emb_m_footer').trim();
            const author = interaction.fields.getTextInputValue('emb_m_author').trim();

            if (title)  draft.title       = title;
            if (desc)   draft.description = desc;
            if (color)  draft.color       = /^#[0-9A-Fa-f]{6}$/.test(color) ? color : draft.color;
            draft.footer     = footer   || null;
            draft.authorName = author   || null;
        }

        if (action === 'field') {
            const name   = interaction.fields.getTextInputValue('emb_f_name').trim();
            const value  = interaction.fields.getTextInputValue('emb_f_value').trim();
            const inline = interaction.fields.getTextInputValue('emb_f_inline').trim().toLowerCase() === 'yes';
            draft.fields.push({ name, value, inline });
        }

        if (action === 'image') {
            const thumb = interaction.fields.getTextInputValue('emb_i_thumb').trim();
            const image = interaction.fields.getTextInputValue('emb_i_image').trim();
            draft.thumbnail = thumb || null;
            draft.image     = image || null;
        }

        const preview = buildFromDraft(draft);
        preview.setFooter({ text: 'Sigil \u2022 Embed Builder \u2022 Preview' });
        if (!draft.title && !draft.description && !draft.fields.length)
            preview.setDescription('*Your embed preview will appear here.*');

        return interaction.update({
            embeds: [preview],
            components: [controlRow(owner)],
        });
    },
};
