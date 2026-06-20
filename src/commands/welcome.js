const {
    SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits,
} = require('discord.js');
const Database = require('better-sqlite3');
const path     = require('path');

const db = new Database(path.join(__dirname, '../../data/sigil.db'));
db.exec(`
    CREATE TABLE IF NOT EXISTS welcome_config (
        guild_id         TEXT PRIMARY KEY,
        channel_id       TEXT,
        message          TEXT,
        embed_title      TEXT,
        embed_color      TEXT  DEFAULT '#5865F2',
        dm_enabled       INTEGER DEFAULT 0,
        dm_message       TEXT,
        enabled          INTEGER DEFAULT 1
    );
`);

const upsert = db.prepare(`
    INSERT OR REPLACE INTO welcome_config
    (guild_id, channel_id, message, embed_title, embed_color, dm_enabled, dm_message, enabled)
    VALUES (?,?,?,?,?,?,?,?)
`);
const get    = db.prepare('SELECT * FROM welcome_config WHERE guild_id = ?');
const del    = db.prepare('DELETE FROM welcome_config WHERE guild_id = ?');

async function sendWelcome(member) {
    const cfg = get.get(member.guild.id);
    if (!cfg || !cfg.enabled) return;

    const replacements = (str) => str
        ?.replace(/{user}/gi,   `<@${member.user.id}>`)
        ?.replace(/{username}/gi, member.user.username)
        ?.replace(/{server}/gi,   member.guild.name)
        ?.replace(/{count}/gi,    member.guild.memberCount.toString());

    if (cfg.channel_id) {
        const channel = await member.guild.channels.fetch(cfg.channel_id).catch(() => null);
        if (channel) {
            const embed = new EmbedBuilder()
                .setColor(cfg.embed_color ?? '#5865F2')
                .setTitle(replacements(cfg.embed_title) ?? `Welcome to ${member.guild.name}!`)
                .setDescription(replacements(cfg.message) ?? `Hey <@${member.user.id}>, welcome to **${member.guild.name}**! You are member #${member.guild.memberCount}.`)
                .setThumbnail(member.user.displayAvatarURL())
                .setTimestamp()
                .setFooter({ text: `Sigil \u2022 ${member.guild.name}` });
            await channel.send({ embeds: [embed] }).catch(() => {});
        }
    }

    if (cfg.dm_enabled && cfg.dm_message) {
        const dm = replacements(cfg.dm_message);
        await member.user.send(dm).catch(() => {});
    }
}

module.exports = {
    sendWelcome,

    data: new SlashCommandBuilder()
        .setName('welcome')
        .setDescription('Configure the welcome system')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand(sub =>
            sub.setName('set')
                .setDescription('Set up or update the welcome message')
                .addChannelOption(opt => opt.setName('channel').setDescription('Welcome channel').setRequired(true))
                .addStringOption(opt => opt.setName('message').setDescription('Welcome message. Use {user}, {username}, {server}, {count}').setRequired(false))
                .addStringOption(opt => opt.setName('title').setDescription('Embed title').setRequired(false))
                .addStringOption(opt => opt.setName('color').setDescription('Embed color (hex)').setRequired(false))
                .addBooleanOption(opt => opt.setName('dm').setDescription('Also DM the new member?').setRequired(false))
                .addStringOption(opt => opt.setName('dm_message').setDescription('DM message content').setRequired(false))
        )
        .addSubcommand(sub => sub.setName('disable').setDescription('Disable the welcome system'))
        .addSubcommand(sub => sub.setName('test').setDescription('Preview the welcome message for yourself'))
        .addSubcommand(sub => sub.setName('view').setDescription('View current welcome config')),

    async execute(interaction) {
        const sub = interaction.options.getSubcommand();
        const gId = interaction.guild.id;

        if (sub === 'set') {
            const channel  = interaction.options.getChannel('channel');
            const message  = interaction.options.getString('message') ?? 'Hey {user}, welcome to **{server}**! You are member #{count}.';
            const title    = interaction.options.getString('title')   ?? `Welcome to ${interaction.guild.name}!`;
            const color    = interaction.options.getString('color')   ?? '#5865F2';
            const dm       = interaction.options.getBoolean('dm')     ?? false;
            const dmMsg    = interaction.options.getString('dm_message') ?? null;

            upsert.run(gId, channel.id, message, title, color, dm ? 1 : 0, dmMsg, 1);
            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setTitle('\u2705 Welcome System Configured')
                    .setColor('#57F287')
                    .setDescription(
                        `**Channel:** <#${channel.id}>\n` +
                        `**Title:** ${title}\n` +
                        `**Message:** ${message}\n` +
                        `**DM:** ${dm ? 'Yes' : 'No'}` +
                        (dmMsg ? `\n**DM Message:** ${dmMsg}` : '')
                    )],
                ephemeral: true,
            });
        }

        if (sub === 'disable') {
            del.run(gId);
            return interaction.reply({ content: '\u2705 Welcome system disabled.', ephemeral: true });
        }

        if (sub === 'test') {
            await sendWelcome({ user: interaction.user, guild: interaction.guild, guild: { ...interaction.guild, memberCount: interaction.guild.memberCount } });
            return interaction.reply({ content: '\uD83D\uDC40 Test welcome sent (check the configured channel).', ephemeral: true });
        }

        if (sub === 'view') {
            const cfg = get.get(gId);
            if (!cfg) return interaction.reply({ content: 'No welcome config set. Use `/welcome set` first.', ephemeral: true });
            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setTitle('Welcome Config')
                    .setColor(cfg.embed_color ?? '#5865F2')
                    .setDescription(
                        `**Channel:** ${cfg.channel_id ? `<#${cfg.channel_id}>` : 'None'}\n` +
                        `**Title:** ${cfg.embed_title ?? 'Default'}\n` +
                        `**Message:** ${cfg.message ?? 'Default'}\n` +
                        `**DM enabled:** ${cfg.dm_enabled ? 'Yes' : 'No'}\n` +
                        `**DM Message:** ${cfg.dm_message ?? 'None'}\n` +
                        `**Enabled:** ${cfg.enabled ? 'Yes' : 'No'}`
                    )],
                ephemeral: true,
            });
        }
    },
};
