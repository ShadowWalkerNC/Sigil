'use strict';
const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('announce')
        .setDescription('Post a formatted announcement embed to a channel')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addStringOption(opt =>
            opt.setName('message')
                .setDescription('The announcement body text')
                .setRequired(true)
        )
        .addChannelOption(opt =>
            opt.setName('channel')
                .setDescription('Channel to post in (defaults to current channel)')
                .setRequired(false)
        )
        .addStringOption(opt =>
            opt.setName('title')
                .setDescription('Optional title for the announcement embed')
                .setRequired(false)
        )
        .addRoleOption(opt =>
            opt.setName('ping')
                .setDescription('Role to ping with this announcement')
                .setRequired(false)
        )
        .addStringOption(opt =>
            opt.setName('color')
                .setDescription('Embed color as hex (e.g. #FF0000). Defaults to server accent.')
                .setRequired(false)
        )
        .addStringOption(opt =>
            opt.setName('image')
                .setDescription('Optional image URL to attach to the embed')
                .setRequired(false)
        )
        .addStringOption(opt =>
            opt.setName('footer')
                .setDescription('Optional footer text')
                .setRequired(false)
        ),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const body   = interaction.options.getString('message');
        const title  = interaction.options.getString('title');
        const ping   = interaction.options.getRole('ping');
        const color  = interaction.options.getString('color');
        const image  = interaction.options.getString('image');
        const footer = interaction.options.getString('footer');
        const target = interaction.options.getChannel('channel') ?? interaction.channel;

        const hexColor = color && /^#?[0-9A-Fa-f]{6}$/.test(color)
            ? (color.startsWith('#') ? color : `#${color}`)
            : '#5865F2';

        const imageUrl = image && /^https?:\/\/.+/i.test(image) ? image : null;

        const embed = new EmbedBuilder()
            .setDescription(body)
            .setColor(hexColor)
            .setTimestamp();

        if (title)    embed.setTitle(title);
        if (imageUrl) embed.setImage(imageUrl);
        if (footer)   embed.setFooter({ text: footer });
        else          embed.setFooter({ text: `${interaction.guild.name} \u2022 Announcement` });

        const content = ping ? `<@&${ping.id}>` : undefined;

        try {
            await target.send({ content, embeds: [embed] });
            return interaction.editReply({
                content: `\u2705 Announcement posted to <#${target.id}>${ping ? ` with ping to <@&${ping.id}>` : ''}.`,
            });
        } catch (err) {
            console.error('[Announce] Failed to post:', err.message);
            return interaction.editReply({
                content: `\u274c Could not post to <#${target.id}>. Make sure I have permission to send messages there.`,
            });
        }
    },
};
