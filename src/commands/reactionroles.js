const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionFlagsBits,
} = require('discord.js');
const {
    createPanel, getPanel, getGuildPanels, setPanelMessageId, deletePanel,
    addPanelButton, removePanelButton, getPanelButtons,
} = require('../utils/db.js');

const COLOR_MAP = {
    primary:   ButtonStyle.Primary,
    secondary: ButtonStyle.Secondary,
    success:   ButtonStyle.Success,
    danger:    ButtonStyle.Danger,
};

function buildPanelComponents(panelId, buttons) {
    const rows = [];
    for (let i = 0; i < buttons.length; i += 5) {
        const row = new ActionRowBuilder();
        for (const btn of buttons.slice(i, i + 5)) {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`rr_${panelId}_${btn.role_id}`)
                    .setLabel(btn.label.slice(0, 80))
                    .setStyle(COLOR_MAP[btn.color?.toLowerCase()] ?? ButtonStyle.Primary)
            );
        }
        rows.push(row);
    }
    return rows;
}

module.exports.data = new SlashCommandBuilder()
    .setName('reactionroles')
    .setDescription('Manage reaction role panels')
    .addSubcommand(sub => sub
        .setName('create')
        .setDescription('Create a new reaction role panel')
        .addStringOption(opt => opt.setName('title').setDescription('Panel title').setRequired(true))
        .addStringOption(opt => opt.setName('description').setDescription('Panel description').setRequired(false))
    )
    .addSubcommand(sub => sub
        .setName('add')
        .setDescription('Add a role button to a panel')
        .addIntegerOption(opt => opt.setName('panel_id').setDescription('Panel ID').setRequired(true))
        .addRoleOption(opt => opt.setName('role').setDescription('Role to toggle').setRequired(true))
        .addStringOption(opt => opt.setName('label').setDescription('Button label').setRequired(true))
        .addStringOption(opt => opt
            .setName('color')
            .setDescription('Button color')
            .setRequired(false)
            .addChoices(
                { name: 'Primary (Blurple)', value: 'primary' },
                { name: 'Secondary (Grey)',  value: 'secondary' },
                { name: 'Success (Green)',   value: 'success' },
                { name: 'Danger (Red)',      value: 'danger' },
            )
        )
    )
    .addSubcommand(sub => sub
        .setName('remove')
        .setDescription('Remove a role button from a panel')
        .addIntegerOption(opt => opt.setName('panel_id').setDescription('Panel ID').setRequired(true))
        .addRoleOption(opt => opt.setName('role').setDescription('Role to remove').setRequired(true))
    )
    .addSubcommand(sub => sub
        .setName('post')
        .setDescription('Post (or repost) the panel to a channel')
        .addIntegerOption(opt => opt.setName('panel_id').setDescription('Panel ID').setRequired(true))
        .addChannelOption(opt => opt.setName('channel').setDescription('Channel to post in').setRequired(true))
    )
    .addSubcommand(sub => sub
        .setName('delete')
        .setDescription('Delete a reaction role panel')
        .addIntegerOption(opt => opt.setName('panel_id').setDescription('Panel ID').setRequired(true))
    )
    .addSubcommand(sub => sub
        .setName('list')
        .setDescription('List all reaction role panels in this server')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles);

module.exports.execute = async function execute(interaction) {
    const sub     = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    if (sub === 'create') {
        const title       = interaction.options.getString('title').trim();
        const description = interaction.options.getString('description')?.trim() ?? '';
        const result      = createPanel(guildId, title, description, interaction.user.id);
        return interaction.reply({
            embeds: [new EmbedBuilder()
                .setTitle('✅ Panel Created')
                .setDescription(`Panel **#${result.lastInsertRowid}** created.\nUse \`/reactionroles add\` to add roles, then \`/reactionroles post\` to publish it.`)
                .setColor('#43B581')
                .setTimestamp()],
            ephemeral: true,
        });
    }

    if (sub === 'add') {
        const panelId = interaction.options.getInteger('panel_id');
        const role    = interaction.options.getRole('role');
        const label   = interaction.options.getString('label').trim();
        const color   = interaction.options.getString('color') ?? 'primary';
        const panel   = getPanel(panelId);

        if (!panel || panel.guild_id !== guildId)
            return interaction.reply({ content: `❌ No panel found with ID **${panelId}** in this server.`, ephemeral: true });
        if (role.managed || role.id === interaction.guild.id)
            return interaction.reply({ content: '❌ That role cannot be assigned by the bot.', ephemeral: true });

        const botMember = interaction.guild.members.me;
        if (role.position >= botMember.roles.highest.position)
            return interaction.reply({ content: '❌ That role is higher than my highest role.', ephemeral: true });

        const existing = getPanelButtons(panelId);
        if (existing.length >= 25)
            return interaction.reply({ content: '❌ Panels support a maximum of 25 buttons.', ephemeral: true });
        if (existing.find(b => b.role_id === role.id))
            return interaction.reply({ content: `❌ <@&${role.id}> is already on this panel.`, ephemeral: true });

        addPanelButton(panelId, role.id, label, color);
        return interaction.reply({
            embeds: [new EmbedBuilder()
                .setTitle('✅ Button Added')
                .setDescription(`<@&${role.id}> added to panel **#${panelId}** as \`${label}\`.\nRepost the panel with \`/reactionroles post\` to apply changes.`)
                .setColor('#43B581')
                .setTimestamp()],
            ephemeral: true,
        });
    }

    if (sub === 'remove') {
        const panelId = interaction.options.getInteger('panel_id');
        const role    = interaction.options.getRole('role');
        const panel   = getPanel(panelId);

        if (!panel || panel.guild_id !== guildId)
            return interaction.reply({ content: `❌ No panel found with ID **${panelId}** in this server.`, ephemeral: true });

        const removed = removePanelButton(panelId, role.id);
        if (!removed)
            return interaction.reply({ content: `❌ <@&${role.id}> is not on panel **#${panelId}**.`, ephemeral: true });

        return interaction.reply({
            embeds: [new EmbedBuilder()
                .setTitle('🗑️ Button Removed')
                .setDescription(`<@&${role.id}> removed from panel **#${panelId}**.\nRepost the panel with \`/reactionroles post\` to apply changes.`)
                .setColor('#F04747')
                .setTimestamp()],
            ephemeral: true,
        });
    }

    if (sub === 'post') {
        const panelId = interaction.options.getInteger('panel_id');
        const channel = interaction.options.getChannel('channel');
        const panel   = getPanel(panelId);

        if (!panel || panel.guild_id !== guildId)
            return interaction.reply({ content: `❌ No panel found with ID **${panelId}** in this server.`, ephemeral: true });

        const buttons = getPanelButtons(panelId);
        if (!buttons.length)
            return interaction.reply({ content: '❌ This panel has no buttons. Add some with `/reactionroles add` first.', ephemeral: true });
        if (!channel.isTextBased())
            return interaction.reply({ content: '❌ That channel is not a text channel.', ephemeral: true });

        await interaction.deferReply({ ephemeral: true });

        if (panel.message_id && panel.channel_id) {
            try {
                const oldCh  = await interaction.guild.channels.fetch(panel.channel_id);
                const oldMsg = await oldCh.messages.fetch(panel.message_id);
                await oldMsg.delete();
            } catch { /* already gone */ }
        }

        const embed = new EmbedBuilder()
            .setTitle(panel.title)
            .setDescription(panel.description || 'Click a button below to assign or remove a role.')
            .setColor('#5865F2')
            .setFooter({ text: `Panel ID: ${panelId} • Sigil Reaction Roles` })
            .setTimestamp();

        const rows = buildPanelComponents(panelId, buttons);
        const msg  = await channel.send({ embeds: [embed], components: rows });
        setPanelMessageId(panelId, channel.id, msg.id);

        return interaction.editReply({
            embeds: [new EmbedBuilder()
                .setTitle('✅ Panel Posted')
                .setDescription(`Panel **#${panelId}** posted in <#${channel.id}>.`)
                .setColor('#43B581')
                .setTimestamp()],
        });
    }

    if (sub === 'delete') {
        const panelId = interaction.options.getInteger('panel_id');
        const panel   = getPanel(panelId);

        if (!panel || panel.guild_id !== guildId)
            return interaction.reply({ content: `❌ No panel found with ID **${panelId}** in this server.`, ephemeral: true });

        if (panel.message_id && panel.channel_id) {
            try {
                const ch  = await interaction.guild.channels.fetch(panel.channel_id);
                const msg = await ch.messages.fetch(panel.message_id);
                await msg.delete();
            } catch { /* already gone */ }
        }

        deletePanel(panelId);
        return interaction.reply({
            embeds: [new EmbedBuilder()
                .setTitle('🗑️ Panel Deleted')
                .setDescription(`Panel **#${panelId}** and all its buttons have been deleted.`)
                .setColor('#F04747')
                .setTimestamp()],
            ephemeral: true,
        });
    }

    if (sub === 'list') {
        const panels = getGuildPanels(guildId);
        if (!panels.length)
            return interaction.reply({ content: 'No reaction role panels in this server.', ephemeral: true });

        const embed = new EmbedBuilder()
            .setTitle('🏷️ Reaction Role Panels')
            .setColor('#5865F2')
            .setFooter({ text: `Sigil • ${panels.length} panel${panels.length !== 1 ? 's' : ''}` })
            .setTimestamp();

        for (const p of panels.slice(0, 10)) {
            const btns = getPanelButtons(p.id);
            embed.addFields({
                name:   `#${p.id} — ${p.title}`,
                value:  `${btns.length} button${btns.length !== 1 ? 's' : ''}${p.channel_id ? ` • <#${p.channel_id}>` : ' • not posted'}`,
                inline: false,
            });
        }

        return interaction.reply({ embeds: [embed], ephemeral: true });
    }
};
