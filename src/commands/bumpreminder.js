const {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionFlagsBits,
} = require('discord.js');
const { getConfig, setConfig } = require('../utils/db.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('bumpreminder')
        .setDescription('Configure the DISBOARD bump reminder')
        .addSubcommand(sub => sub
            .setName('setup')
            .setDescription('Set the channel and enable/disable bump reminders')
            .addChannelOption(opt =>
                opt.setName('channel')
                    .setDescription('Channel to send the bump reminder in')
                    .setRequired(true)
            )
            .addBooleanOption(opt =>
                opt.setName('enabled')
                    .setDescription('Enable or disable bump reminders')
                    .setRequired(true)
            )
            .addStringOption(opt =>
                opt.setName('message')
                    .setDescription('Custom reminder message (default: “Time to bump the server! Use /bump on DISBOARD.”)')
                    .setMaxLength(500)
                    .setRequired(false)
            )
        )
        .addSubcommand(sub => sub
            .setName('status')
            .setDescription('Show the current bump reminder configuration')
        )
        .addSubcommand(sub => sub
            .setName('disable')
            .setDescription('Disable bump reminders')
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

    async execute(interaction) {
        const sub     = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;
        const cfg     = getConfig(guildId);

        if (sub === 'setup') {
            const channel = interaction.options.getChannel('channel');
            const enabled = interaction.options.getBoolean('enabled');
            const message = interaction.options.getString('message') ?? null;

            if (!channel.isTextBased()) {
                return interaction.reply({ content: '❌ Bump reminders require a text-based channel.', ephemeral: true });
            }

            setConfig(guildId, {
                bump_enabled:  enabled ? 1 : 0,
                bump_channel:  channel.id,
                bump_message:  message,
            });

            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle(`📨 Bump Reminder ${enabled ? 'Enabled' : 'Disabled'}`)
                        .setColor(enabled ? '#43B581' : '#F04747')
                        .addFields(
                            { name: 'Channel', value: `<#${channel.id}>`, inline: true },
                            { name: 'Status',  value: enabled ? '✅ Active' : '❌ Disabled', inline: true },
                            { name: 'Message', value: message ?? '*Default message*' },
                        )
                        .setFooter({ text: 'Sigil will remind you 2 hours after each successful /bump' })
                        .setTimestamp(),
                ],
                ephemeral: true,
            });
        }

        if (sub === 'disable') {
            setConfig(guildId, { bump_enabled: 0 });
            return interaction.reply({ content: '✅ Bump reminders disabled.', ephemeral: true });
        }

        if (sub === 'status') {
            if (!cfg.bump_enabled || !cfg.bump_channel) {
                return interaction.reply({ content: '📋 Bump reminders are not configured. Use `/bumpreminder setup` to get started.', ephemeral: true });
            }

            const lastBump = cfg.bump_last_bump_at
                ? `<t:${Math.floor(new Date(cfg.bump_last_bump_at).getTime() / 1000)}:R>`
                : 'Never';

            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('📨 Bump Reminder Status')
                        .setColor('#5865F2')
                        .addFields(
                            { name: 'Status',    value: cfg.bump_enabled ? '✅ Enabled' : '❌ Disabled', inline: true },
                            { name: 'Channel',   value: `<#${cfg.bump_channel}>`,                     inline: true },
                            { name: 'Last Bump', value: lastBump,                                     inline: true },
                            { name: 'Message',   value: cfg.bump_message ?? '*Default message*' },
                        )
                        .setTimestamp(),
                ],
                ephemeral: true,
            });
        }
    },
};
