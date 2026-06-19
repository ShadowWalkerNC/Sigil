const {
    SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits,
} = require('discord.js');
const Database = require('better-sqlite3');
const path     = require('path');

const db = new Database(path.join(__dirname, '../../data/sigil.db'));

db.exec(`
    CREATE TABLE IF NOT EXISTS devotional_schedules (
        guild_id    TEXT NOT NULL,
        channel_id  TEXT NOT NULL,
        post_time   TEXT NOT NULL DEFAULT '08:00',
        timezone    TEXT NOT NULL DEFAULT 'America/New_York',
        role_ping   TEXT,
        custom_text TEXT,
        use_verse   INTEGER NOT NULL DEFAULT 1,
        active      INTEGER NOT NULL DEFAULT 1,
        PRIMARY KEY (guild_id)
    );
    CREATE TABLE IF NOT EXISTS devotional_queue (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        guild_id    TEXT NOT NULL,
        content     TEXT NOT NULL,
        author      TEXT,
        used        INTEGER NOT NULL DEFAULT 0
    );
`);

const getSchedule   = db.prepare('SELECT * FROM devotional_schedules WHERE guild_id = ?');
const upsertSched   = db.prepare(`
    INSERT INTO devotional_schedules (guild_id, channel_id, post_time, timezone, role_ping, custom_text, use_verse, active)
    VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    ON CONFLICT(guild_id) DO UPDATE SET
        channel_id = excluded.channel_id,
        post_time  = excluded.post_time,
        timezone   = excluded.timezone,
        role_ping  = excluded.role_ping,
        custom_text= excluded.custom_text,
        use_verse  = excluded.use_verse,
        active     = 1
`);
const disableSched  = db.prepare('UPDATE devotional_schedules SET active = 0 WHERE guild_id = ?');
const addQueue      = db.prepare('INSERT INTO devotional_queue (guild_id, content, author) VALUES (?, ?, ?)');
const getNextQueue  = db.prepare('SELECT * FROM devotional_queue WHERE guild_id = ? AND used = 0 ORDER BY id ASC LIMIT 1');
const markUsed      = db.prepare('UPDATE devotional_queue SET used = 1 WHERE id = ?');
const listQueue     = db.prepare('SELECT * FROM devotional_queue WHERE guild_id = ? AND used = 0 ORDER BY id ASC');
const getAllActive  = db.prepare('SELECT * FROM devotional_schedules WHERE active = 1');

// Fetch a random Bible verse from bible-api.com (free, no key)
async function fetchVerse() {
    const verses = [
        'john 3:16', 'psalm 23:1', 'philippians 4:13', 'jeremiah 29:11',
        'romans 8:28', 'proverbs 3:5', 'isaiah 40:31', 'matthew 11:28',
        'psalm 46:1', 'hebrews 11:1', 'romans 12:2', '1 corinthians 13:4',
        'ephesians 2:8', 'psalm 119:105', 'galatians 5:22', 'joshua 1:9',
    ];
    const ref = verses[Math.floor(Math.random() * verses.length)];
    try {
        const res  = await fetch(`https://bible-api.com/${encodeURIComponent(ref)}?translation=kjv`);
        const data = await res.json();
        return { text: data.text?.trim(), reference: data.reference };
    } catch {
        return { text: 'Trust in the LORD with all your heart and lean not on your own understanding.', reference: 'Proverbs 3:5-6' };
    }
}

function buildDevotionalEmbed(guild, verse, queueItem, schedule, isPreview = false) {
    const embed = new EmbedBuilder()
        .setTitle(`\uD83D\uDCD6 ${isPreview ? 'Preview — ' : ''}Daily Devotional`)
        .setColor('#F4C842')
        .setTimestamp();

    let desc = '';

    if (verse) {
        desc += `*"${verse.text}"*\n\n\u2014 **${verse.reference}**\n\n`;
    }

    if (queueItem) {
        desc += `\uD83D\uDCA1 **Reflection:**\n${queueItem.content}`;
        if (queueItem.author) desc += `\n\n\u2014 *${queueItem.author}*`;
    } else if (schedule?.custom_text) {
        desc += `\uD83D\uDCA1 **Reflection:**\n${schedule.custom_text}`;
    }

    if (!desc) desc = '\uD83D\uDE4F Take a moment to reflect and be grateful today.';

    embed.setDescription(desc);
    embed.setFooter({ text: `Sigil \u2022 Daily Devotional \u2022 ${guild.name}` });
    return embed;
}

// Scheduler — called on bot start, checks every minute
function startScheduler(client) {
    setInterval(async () => {
        const now     = new Date();
        const hhmm    = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
        const schedules = getAllActive.all();

        for (const sched of schedules) {
            // Simple time match — for production use node-cron with timezone support
            const localTime = new Date(now.toLocaleString('en-US', { timeZone: sched.timezone }));
            const localHHMM = `${String(localTime.getHours()).padStart(2,'0')}:${String(localTime.getMinutes()).padStart(2,'0')}`;
            if (localHHMM !== sched.post_time) continue;

            const guild   = await client.guilds.fetch(sched.guild_id).catch(() => null);
            if (!guild) continue;
            const channel = await guild.channels.fetch(sched.channel_id).catch(() => null);
            if (!channel) continue;

            const verse     = sched.use_verse ? await fetchVerse() : null;
            const queueItem = getNextQueue.get(sched.guild_id);
            if (queueItem) markUsed.run(queueItem.id);

            const embed   = buildDevotionalEmbed(guild, verse, queueItem, sched);
            const content = sched.role_ping ? `<@&${sched.role_ping}>` : undefined;

            await channel.send({ content, embeds: [embed] }).catch(err =>
                console.error(`[Devotional] Failed to post to ${sched.guild_id}:`, err.message)
            );
        }
    }, 60_000); // check every minute
}

module.exports = {
    startScheduler,

    data: new SlashCommandBuilder()
        .setName('devotional')
        .setDescription('Manage daily devotional posts')
        .addSubcommand(sub =>
            sub.setName('setup')
                .setDescription('Set up the daily devotional schedule')
                .addChannelOption(opt => opt.setName('channel').setDescription('Channel to post in').setRequired(true))
                .addStringOption(opt => opt.setName('time').setDescription('Post time in HH:MM 24h format (e.g. 08:00)').setRequired(false))
                .addStringOption(opt => opt.setName('timezone').setDescription('Timezone (e.g. America/New_York, America/Chicago)').setRequired(false))
                .addRoleOption(opt => opt.setName('ping').setDescription('Role to ping daily').setRequired(false))
                .addBooleanOption(opt => opt.setName('verse').setDescription('Include a Bible verse? (default true)').setRequired(false))
                .addStringOption(opt => opt.setName('reflection').setDescription('Default reflection text (shown when queue is empty)').setRequired(false))
        )
        .addSubcommand(sub =>
            sub.setName('queue')
                .setDescription('Add a custom reflection to the devotional queue')
                .addStringOption(opt => opt.setName('content').setDescription('Reflection, quote, or message').setRequired(true).setMaxLength(800))
                .addStringOption(opt => opt.setName('author').setDescription('Attribution (optional)').setRequired(false))
        )
        .addSubcommand(sub =>
            sub.setName('list')
                .setDescription('List upcoming queued devotional reflections')
        )
        .addSubcommand(sub =>
            sub.setName('preview')
                .setDescription('Preview what today\'s devotional will look like')
        )
        .addSubcommand(sub =>
            sub.setName('post')
                .setDescription('Manually post the devotional right now')
                .addChannelOption(opt => opt.setName('channel').setDescription('Channel to post in (defaults to configured channel)').setRequired(false))
        )
        .addSubcommand(sub =>
            sub.setName('disable')
                .setDescription('Disable the daily devotional schedule')
        ),

    async execute(interaction) {
        const sub     = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        if (['setup','queue','post','disable'].includes(sub) &&
            !interaction.memberPermissions.has('ManageGuild')) {
            return interaction.reply({ content: '\u274C You need **Manage Server** to configure devotionals.', ephemeral: true });
        }

        if (sub === 'setup') {
            const channel    = interaction.options.getChannel('channel');
            const time       = interaction.options.getString('time') ?? '08:00';
            const timezone   = interaction.options.getString('timezone') ?? 'America/New_York';
            const ping       = interaction.options.getRole('ping');
            const useVerse   = interaction.options.getBoolean('verse') ?? true;
            const reflection = interaction.options.getString('reflection');

            // Validate time format
            if (!/^\d{2}:\d{2}$/.test(time)) {
                return interaction.reply({ content: '\u274C Time must be in HH:MM format (e.g. 08:00).', ephemeral: true });
            }

            upsertSched.run(guildId, channel.id, time, timezone, ping?.id ?? null, reflection ?? null, useVerse ? 1 : 0);

            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setTitle('\uD83D\uDCD6 Devotional Schedule Saved')
                    .setColor('#57F287')
                    .setDescription(
                        `**Channel:** <#${channel.id}>\n` +
                        `**Time:** ${time} (${timezone})\n` +
                        `**Bible verse:** ${useVerse ? 'Yes' : 'No'}\n` +
                        (ping ? `**Ping:** <@&${ping.id}>\n` : '') +
                        (reflection ? `**Default reflection:** ${reflection}` : '')
                    )
                    .setFooter({ text: `Sigil \u2022 Devotional \u2022 ${interaction.guild.name}` })
                    .setTimestamp()],
                ephemeral: true,
            });
        }

        if (sub === 'queue') {
            const content = interaction.options.getString('content');
            const author  = interaction.options.getString('author');
            addQueue.run(guildId, content, author ?? null);
            const count = listQueue.all(guildId).length;
            return interaction.reply({
                content: `\u2705 Reflection added to the queue. **${count}** item${count !== 1 ? 's' : ''} queued.`,
                ephemeral: true,
            });
        }

        if (sub === 'list') {
            const items = listQueue.all(guildId);
            const desc  = items.length === 0
                ? '*Queue is empty. Use `/devotional queue` to add reflections.*'
                : items.map((item, i) =>
                    `**${i + 1}.** ${item.content.slice(0, 80)}${item.content.length > 80 ? '\u2026' : ''}${item.author ? ` \u2014 *${item.author}*` : ''}`
                  ).join('\n');
            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setTitle('\uD83D\uDCD6 Devotional Queue')
                    .setDescription(desc)
                    .setColor('#5865F2')
                    .setFooter({ text: `Sigil \u2022 Devotional \u2022 ${interaction.guild.name}` })
                    .setTimestamp()],
                ephemeral: true,
            });
        }

        if (sub === 'preview') {
            await interaction.deferReply({ ephemeral: true });
            const sched     = getSchedule.get(guildId);
            const verse     = sched?.use_verse ? await fetchVerse() : null;
            const queueItem = getNextQueue.get(guildId);
            const embed     = buildDevotionalEmbed(interaction.guild, verse, queueItem, sched, true);
            return interaction.editReply({ embeds: [embed] });
        }

        if (sub === 'post') {
            await interaction.deferReply({ ephemeral: true });
            const sched   = getSchedule.get(guildId);
            const chanOpt = interaction.options.getChannel('channel');
            const chanId  = chanOpt?.id ?? sched?.channel_id;

            if (!chanId) return interaction.editReply({ content: '\u274C No channel configured. Run `/devotional setup` first.' });

            const channel   = await interaction.guild.channels.fetch(chanId).catch(() => null);
            if (!channel) return interaction.editReply({ content: '\u274C Channel not found.' });

            const verse     = sched?.use_verse !== 0 ? await fetchVerse() : null;
            const queueItem = getNextQueue.get(guildId);
            if (queueItem) markUsed.run(queueItem.id);

            const embed   = buildDevotionalEmbed(interaction.guild, verse, queueItem, sched);
            const content = sched?.role_ping ? `<@&${sched.role_ping}>` : undefined;

            await channel.send({ content, embeds: [embed] });
            return interaction.editReply({ content: `\u2705 Devotional posted to <#${chanId}>.` });
        }

        if (sub === 'disable') {
            disableSched.run(guildId);
            return interaction.reply({ content: '\u2705 Daily devotional schedule disabled.', ephemeral: true });
        }
    },
};
