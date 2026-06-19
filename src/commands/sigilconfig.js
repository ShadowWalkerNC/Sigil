const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const crypto = require('crypto');
const { getConfig, setConfig } = require('../utils/db.js');
const { getBackgroundChoices } = require('../utils/backgrounds.js');
const { getAllFontFamilies } = require('../utils/canvas.js');
const { getColorAutocomplete } = require('../utils/colors.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('sigilconfig')
        .setDescription('Configure Sigil automations for this server (admin only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(sub => sub
            .setName('welcome')
            .setDescription('Configure auto-welcome cards')
            .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable auto-welcome cards').setRequired(true))
            .addChannelOption(opt => opt.setName('channel').setDescription('Channel to post welcome cards in').addChannelTypes(ChannelType.GuildText))
            .addStringOption(opt => opt.setName('color').setDescription('Accent color (hex)').setAutocomplete(true))
            .addStringOption(opt => opt.setName('background').setDescription('Background style').addChoices(...getBackgroundChoices()))
            .addStringOption(opt => opt.setName('font').setDescription('Font').addChoices(...getAllFontFamilies().map(f => ({ name: f, value: f }))))
        )
        .addSubcommand(sub => sub
            .setName('goodbye')
            .setDescription('Configure auto-goodbye cards')
            .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable auto-goodbye cards').setRequired(true))
            .addChannelOption(opt => opt.setName('channel').setDescription('Channel to post goodbye cards in').addChannelTypes(ChannelType.GuildText))
        )
        .addSubcommand(sub => sub
            .setName('milestone')
            .setDescription('Configure auto-milestone celebration cards')
            .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable milestone cards').setRequired(true))
            .addChannelOption(opt => opt.setName('channel').setDescription('Channel to post milestone cards in').addChannelTypes(ChannelType.GuildText))
        )
        .addSubcommand(sub => sub
            .setName('boost')
            .setDescription('Configure auto-boost thank-you cards')
            .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable boost cards').setRequired(true))
            .addChannelOption(opt => opt.setName('channel').setDescription('Channel to post boost cards in').addChannelTypes(ChannelType.GuildText))
        )
        .addSubcommand(sub => sub
            .setName('events')
            .setDescription('Configure auto-event banners and recap cards')
            .addBooleanOption(opt => opt.setName('enabled').setDescription('Enable auto-event banners and recaps').setRequired(true))
            .addChannelOption(opt => opt.setName('channel').setDescription('Channel to post event banners and recaps in').addChannelTypes(ChannelType.GuildText))
        )
        .addSubcommand(sub => sub
            .setName('stats')
            .setDescription('Configure weekly server health report')
            .addChannelOption(opt => opt.setName('channel').setDescription('Channel to post weekly reports in (leave blank to disable)').addChannelTypes(ChannelType.GuildText))
        )
        .addSubcommand(sub => sub
            .setName('mod')
            .setDescription('Configure the mod log channel')
            .addChannelOption(opt => opt.setName('channel').setDescription('Channel to post mod cases in (leave blank to disable)').addChannelTypes(ChannelType.GuildText))
        )
        .addSubcommand(sub => sub
            .setName('webhook')
            .setDescription('Configure the external webhook trigger channel and secret')
            .addChannelOption(opt => opt.setName('channel').setDescription('Channel to post webhook notifications in').addChannelTypes(ChannelType.GuildText))
            .addStringOption(opt => opt.setName('action').setDescription('What to do with the webhook secret').setRequired(false)
                .addChoices(
                    { name: 'Generate new secret', value: 'generate' },
                    { name: 'Clear secret (disable HMAC)', value: 'clear' },
                )
            )
        )
        .addSubcommand(sub => sub
            .setName('status')
            .setDescription('Show current automation status for this server')
        ),

    async autocomplete(interaction) {
        const focused = interaction.options.getFocused();
        const results = getColorAutocomplete(focused);
        await interaction.respond(results);
    },

    async execute(interaction) {
        const sub     = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        // ── STATUS ──────────────────────────────────────────────────────────
        if (sub === 'status') {
            const cfg = getConfig(guildId);
            const embed = new EmbedBuilder()
                .setTitle('⚙️ Sigil Automation Status')
                .setColor('#5865F2')
                .addFields(
                    { name: '👋 Welcome',      value: cfg.welcome_enabled      ? `🟢 On — <#${cfg.welcome_channel}>`      : '🔴 Off', inline: true },
                    { name: '👋 Goodbye',      value: cfg.goodbye_enabled      ? `🟢 On — <#${cfg.goodbye_channel}>`      : '🔴 Off', inline: true },
                    { name: '🎉 Milestone',    value: cfg.milestone_enabled    ? `🟢 On — <#${cfg.milestone_channel}>`    : '🔴 Off', inline: true },
                    { name: '🚀 Boost',        value: cfg.boost_enabled        ? `🟢 On — <#${cfg.boost_channel}>`        : '🔴 Off', inline: true },
                    { name: '📅 Events',       value: cfg.event_banner_enabled ? `🟢 On — <#${cfg.event_banner_channel}>` : '🔴 Off', inline: true },
                    { name: '📊 Weekly Stats', value: cfg.stats_channel        ? `🟢 On — <#${cfg.stats_channel}>`        : '🔴 Off', inline: true },
                    { name: '🔗 Webhooks',     value: cfg.webhook_channel      ? `🟢 On — <#${cfg.webhook_channel}>${cfg.webhook_secret ? ' 🔒 HMAC set' : ' ⚠️ No secret'}` : '🔴 Off', inline: true },
                    { name: '🛡️ Mod Log',      value: cfg.mod_log_channel      ? `🟢 On — <#${cfg.mod_log_channel}>`      : '🔴 Off', inline: true },
                )
                .setFooter({ text: 'Sigil • sigilconfig status' });
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        // ── STATS ────────────────────────────────────────────────────────────
        if (sub === 'stats') {
            const channel = interaction.options.getChannel('channel');
            setConfig(guildId, { stats_channel: channel ? channel.id : null });
            const embed = new EmbedBuilder()
                .setTitle('✅ Sigil — Stats Updated')
                .setDescription(channel
                    ? `Weekly server reports will post every **Monday 9:00 UTC** in <#${channel.id}>.`
                    : 'Weekly server reports have been **disabled**.')
                .setColor(channel ? '#39FF14' : '#ff4444')
                .setFooter({ text: 'Sigil • sigilconfig stats' });
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        // ── MOD ──────────────────────────────────────────────────────────────
        if (sub === 'mod') {
            const channel = interaction.options.getChannel('channel');
            setConfig(guildId, { mod_log_channel: channel ? channel.id : null });
            const embed = new EmbedBuilder()
                .setTitle('✅ Sigil — Mod Log Updated')
                .setDescription(channel
                    ? `Mod actions (warn/kick/ban) will be logged in <#${channel.id}>.`
                    : 'Mod log channel has been **disabled**.')
                .setColor(channel ? '#39FF14' : '#ff4444')
                .setFooter({ text: 'Sigil • sigilconfig mod' });
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        // ── WEBHOOK ──────────────────────────────────────────────────────────
        if (sub === 'webhook') {
            const channel = interaction.options.getChannel('channel');
            const action  = interaction.options.getString('action');
            const update  = {};

            if (channel) update.webhook_channel = channel.id;

            let secretMsg = '';
            if (action === 'generate') {
                const secret = crypto.randomBytes(32).toString('hex');
                update.webhook_secret = secret;
                secretMsg = `\n\n🔒 **Your new HMAC secret (save this now — it won\'t be shown again):**\n\`\`\`${secret}\`\`\``;
            } else if (action === 'clear') {
                update.webhook_secret = null;
                secretMsg = '\n\n⚠️ HMAC validation **disabled** — endpoint will accept unsigned requests.';
            }

            if (Object.keys(update).length) setConfig(guildId, update);

            const cfg = getConfig(guildId);
            const embed = new EmbedBuilder()
                .setTitle('✅ Sigil — Webhook Updated')
                .setDescription(
                    `**Webhook notifications** will post in ${channel ? `<#${channel.id}>` : cfg.webhook_channel ? `<#${cfg.webhook_channel}>` : '*(no channel set)*'}.` +
                    secretMsg +
                    `\n\n**Endpoint:** \`POST /webhook/trigger\`` +
                    `\n**Headers required:**` +
                    `\n\`x-sigil-guild-id: ${guildId}\`` +
                    `\n\`x-sigil-signature: sha256=<hmac>\`` +
                    `\n\n**Supported types:** \`twitch.live\` • \`youtube.upload\` • \`github.push\``
                )
                .setColor('#39FF14')
                .setFooter({ text: 'Sigil • sigilconfig webhook' });

            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        // ── ALL OTHER SUBCOMMANDS (have enabled boolean) ─────────────────────
        const enabled = interaction.options.getBoolean('enabled');
        const channel = interaction.options.getChannel('channel');

        if (sub === 'welcome') {
            const color  = interaction.options.getString('color')      ?? null;
            const bg     = interaction.options.getString('background') ?? null;
            const font   = interaction.options.getString('font')       ?? null;
            const update = { welcome_enabled: enabled ? 1 : 0 };
            if (channel) update.welcome_channel = channel.id;
            if (color)   update.welcome_color   = color;
            if (bg)      update.welcome_bg       = bg;
            if (font)    update.welcome_font     = font;
            setConfig(guildId, update);
        } else if (sub === 'goodbye') {
            const update = { goodbye_enabled: enabled ? 1 : 0 };
            if (channel) update.goodbye_channel = channel.id;
            setConfig(guildId, update);
        } else if (sub === 'milestone') {
            const update = { milestone_enabled: enabled ? 1 : 0 };
            if (channel) update.milestone_channel = channel.id;
            setConfig(guildId, update);
        } else if (sub === 'boost') {
            const update = { boost_enabled: enabled ? 1 : 0 };
            if (channel) update.boost_channel = channel.id;
            setConfig(guildId, update);
        } else if (sub === 'events') {
            const update = { event_banner_enabled: enabled ? 1 : 0 };
            if (channel) update.event_banner_channel = channel.id;
            setConfig(guildId, update);
        }

        const embed = new EmbedBuilder()
            .setTitle(`✅ Sigil — ${sub.charAt(0).toUpperCase() + sub.slice(1)} Updated`)
            .setDescription(`**${sub}** automation is now **${enabled ? 'enabled' : 'disabled'}**${channel ? ` in <#${channel.id}>` : ''}.`)
            .setColor(enabled ? '#39FF14' : '#ff4444')
            .setFooter({ text: 'Sigil • sigilconfig' });

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },
};
