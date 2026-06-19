const {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionFlagsBits,
    ChannelType,
} = require('discord.js');
const { getConfig, setConfig, getAutomodConfig, setAutomodRule, clearAutomodRule } = require('../utils/db.js');

module.exports.data = new SlashCommandBuilder()
    .setName('automod')
    .setDescription('Configure the AutoMod system')
    .addSubcommand(sub => sub
        .setName('setup')
        .setDescription('Enable and configure AutoMod rules')
        .addBooleanOption(opt => opt.setName('anti_spam').setDescription('Block repeated/fast messages').setRequired(false))
        .addBooleanOption(opt => opt.setName('anti_links').setDescription('Block links from non-mods').setRequired(false))
        .addBooleanOption(opt => opt.setName('anti_mentions').setDescription('Block mass mention spam').setRequired(false))
        .addBooleanOption(opt => opt.setName('anti_caps').setDescription('Block all-caps messages').setRequired(false))
        .addBooleanOption(opt => opt.setName('bad_words').setDescription('Block configured bad words').setRequired(false))
        .addIntegerOption(opt => opt.setName('spam_threshold').setDescription('Messages per 5s before action (default 5)').setMinValue(2).setMaxValue(20).setRequired(false))
        .addIntegerOption(opt => opt.setName('mention_threshold').setDescription('Mentions per message before action (default 5)').setMinValue(2).setMaxValue(20).setRequired(false))
        .addIntegerOption(opt => opt.setName('caps_threshold').setDescription('% caps before action (default 70)').setMinValue(10).setMaxValue(100).setRequired(false))
        .addChannelOption(opt => opt.setName('log_channel').setDescription('Channel to log AutoMod actions').addChannelTypes(ChannelType.GuildText).setRequired(false))
        .addRoleOption(opt => opt.setName('bypass_role').setDescription('Role that bypasses AutoMod').setRequired(false))
    )
    .addSubcommand(sub => sub
        .setName('badwords')
        .setDescription('Manage the bad words list')
        .addStringOption(opt => opt.setName('action').setDescription('add or remove').addChoices({ name: 'add', value: 'add' }, { name: 'remove', value: 'remove' }, { name: 'list', value: 'list' }).setRequired(true))
        .addStringOption(opt => opt.setName('word').setDescription('Word to add or remove').setRequired(false))
    )
    .addSubcommand(sub => sub
        .setName('allowlinks')
        .setDescription('Allow or disallow a specific domain')
        .addStringOption(opt => opt.setName('action').setDescription('add or remove').addChoices({ name: 'allow', value: 'allow' }, { name: 'disallow', value: 'disallow' }, { name: 'list', value: 'list' }).setRequired(true))
        .addStringOption(opt => opt.setName('domain').setDescription('Domain to allow (e.g. youtube.com)').setRequired(false))
    )
    .addSubcommand(sub => sub
        .setName('status')
        .setDescription('Show current AutoMod configuration')
    )
    .addSubcommand(sub => sub
        .setName('disable')
        .setDescription('Disable all AutoMod rules')
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);

module.exports.execute = async function execute(interaction) {
    const sub     = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    if (sub === 'setup') {
        const updates = {};
        const antiSpam    = interaction.options.getBoolean('anti_spam');
        const antiLinks   = interaction.options.getBoolean('anti_links');
        const antiMention = interaction.options.getBoolean('anti_mentions');
        const antiCaps    = interaction.options.getBoolean('anti_caps');
        const badWords    = interaction.options.getBoolean('bad_words');
        const spamThresh  = interaction.options.getInteger('spam_threshold');
        const mentThresh  = interaction.options.getInteger('mention_threshold');
        const capsThresh  = interaction.options.getInteger('caps_threshold');
        const logCh       = interaction.options.getChannel('log_channel');
        const bypassRole  = interaction.options.getRole('bypass_role');

        if (antiSpam    !== null) updates.automod_anti_spam    = antiSpam    ? 1 : 0;
        if (antiLinks   !== null) updates.automod_anti_links   = antiLinks   ? 1 : 0;
        if (antiMention !== null) updates.automod_anti_mentions= antiMention ? 1 : 0;
        if (antiCaps    !== null) updates.automod_anti_caps    = antiCaps    ? 1 : 0;
        if (badWords    !== null) updates.automod_bad_words    = badWords    ? 1 : 0;
        if (spamThresh  !== null) updates.automod_spam_threshold    = spamThresh;
        if (mentThresh  !== null) updates.automod_mention_threshold = mentThresh;
        if (capsThresh  !== null) updates.automod_caps_threshold    = capsThresh;
        if (logCh)               updates.automod_log_channel  = logCh.id;
        if (bypassRole)          updates.automod_bypass_role  = bypassRole.id;

        if (!Object.keys(updates).length)
            return interaction.reply({ content: '\u274c Provide at least one option to configure.', ephemeral: true });

        setConfig(guildId, updates);

        const lines = [];
        if (antiSpam    !== null) lines.push(`Anti-Spam: **${antiSpam    ? 'on' : 'off'}**`);
        if (antiLinks   !== null) lines.push(`Anti-Links: **${antiLinks   ? 'on' : 'off'}**`);
        if (antiMention !== null) lines.push(`Anti-Mentions: **${antiMention ? 'on' : 'off'}**`);
        if (antiCaps    !== null) lines.push(`Anti-Caps: **${antiCaps    ? 'on' : 'off'}**`);
        if (badWords    !== null) lines.push(`Bad Words: **${badWords    ? 'on' : 'off'}**`);
        if (spamThresh  !== null) lines.push(`Spam threshold: **${spamThresh}** msgs/5s`);
        if (mentThresh  !== null) lines.push(`Mention threshold: **${mentThresh}** mentions`);
        if (capsThresh  !== null) lines.push(`Caps threshold: **${capsThresh}%**`);
        if (logCh)               lines.push(`Log channel: <#${logCh.id}>`);
        if (bypassRole)          lines.push(`Bypass role: <@&${bypassRole.id}>`);

        return interaction.reply({
            embeds: [new EmbedBuilder().setTitle('\ud83d\udee1\ufe0f AutoMod Updated').setDescription(lines.join('\n')).setColor('#5865F2').setTimestamp()],
            ephemeral: true,
        });
    }

    if (sub === 'badwords') {
        const action = interaction.options.getString('action');
        const word   = interaction.options.getString('word')?.toLowerCase().trim();
        const cfg    = getConfig(guildId);
        let list     = cfg.automod_badwords ? JSON.parse(cfg.automod_badwords) : [];

        if (action === 'list') {
            return interaction.reply({
                embeds: [new EmbedBuilder().setTitle('\ud83d\udcdd Bad Words List').setDescription(list.length ? list.map(w => `\`${w}\``).join(', ') : '*None configured.*').setColor('#FAA61A')],
                ephemeral: true,
            });
        }
        if (!word) return interaction.reply({ content: '\u274c Provide a word.', ephemeral: true });
        if (action === 'add') {
            if (!list.includes(word)) list.push(word);
        } else {
            list = list.filter(w => w !== word);
        }
        setConfig(guildId, { automod_badwords: JSON.stringify(list) });
        return interaction.reply({ content: `\u2705 Word \`${word}\` ${action === 'add' ? 'added to' : 'removed from'} the bad words list.`, ephemeral: true });
    }

    if (sub === 'allowlinks') {
        const action = interaction.options.getString('action');
        const domain = interaction.options.getString('domain')?.toLowerCase().trim();
        const cfg    = getConfig(guildId);
        let list     = cfg.automod_allowed_domains ? JSON.parse(cfg.automod_allowed_domains) : [];

        if (action === 'list') {
            return interaction.reply({
                embeds: [new EmbedBuilder().setTitle('\ud83d\udd17 Allowed Domains').setDescription(list.length ? list.map(d => `\`${d}\``).join(', ') : '*None — all links blocked when anti-links is on.*').setColor('#43B581')],
                ephemeral: true,
            });
        }
        if (!domain) return interaction.reply({ content: '\u274c Provide a domain.', ephemeral: true });
        if (action === 'allow') {
            if (!list.includes(domain)) list.push(domain);
        } else {
            list = list.filter(d => d !== domain);
        }
        setConfig(guildId, { automod_allowed_domains: JSON.stringify(list) });
        return interaction.reply({ content: `\u2705 Domain \`${domain}\` ${action === 'allow' ? 'allowed' : 'removed from allowlist'}.`, ephemeral: true });
    }

    if (sub === 'status') {
        const cfg = getConfig(guildId);
        const on  = v => v ? '\u2705 On' : '\u274c Off';
        const embed = new EmbedBuilder()
            .setTitle('\ud83d\udee1\ufe0f AutoMod Status')
            .setColor('#5865F2')
            .addFields(
                { name: 'Anti-Spam',     value: on(cfg.automod_anti_spam),     inline: true },
                { name: 'Anti-Links',    value: on(cfg.automod_anti_links),    inline: true },
                { name: 'Anti-Mentions', value: on(cfg.automod_anti_mentions), inline: true },
                { name: 'Anti-Caps',     value: on(cfg.automod_anti_caps),     inline: true },
                { name: 'Bad Words',     value: on(cfg.automod_bad_words),     inline: true },
                { name: 'Log Channel',   value: cfg.automod_log_channel ? `<#${cfg.automod_log_channel}>` : 'Not set', inline: true },
                { name: 'Bypass Role',   value: cfg.automod_bypass_role  ? `<@&${cfg.automod_bypass_role}>` : 'None', inline: true },
                { name: 'Spam Threshold',   value: `${cfg.automod_spam_threshold    ?? 5} msgs/5s`,   inline: true },
                { name: 'Mention Threshold', value: `${cfg.automod_mention_threshold ?? 5} mentions`, inline: true },
                { name: 'Caps Threshold',    value: `${cfg.automod_caps_threshold    ?? 70}%`,        inline: true }
            )
            .setTimestamp();
        return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (sub === 'disable') {
        setConfig(guildId, {
            automod_anti_spam: 0, automod_anti_links: 0,
            automod_anti_mentions: 0, automod_anti_caps: 0, automod_bad_words: 0,
        });
        return interaction.reply({
            embeds: [new EmbedBuilder().setTitle('\ud83d\udd15 AutoMod Disabled').setDescription('All AutoMod rules have been turned off.').setColor('#F04747').setTimestamp()],
            ephemeral: true,
        });
    }
};
