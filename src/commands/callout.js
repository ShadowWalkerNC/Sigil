const {
    SlashCommandBuilder, EmbedBuilder,
} = require('discord.js');
const Database = require('better-sqlite3');
const path     = require('path');

const db = new Database(path.join(__dirname, '../../data/sigil.db'));

// Ensure tables exist — callout.js may load before myshift.js on cold start
db.exec(`
    CREATE TABLE IF NOT EXISTS shift_links (
        discord_id  TEXT PRIMARY KEY,
        staff_name  TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS scheduler_config (
        guild_id        TEXT PRIMARY KEY,
        api_url         TEXT NOT NULL,
        bridge_key      TEXT NOT NULL,
        post_channel    TEXT,
        post_time       TEXT NOT NULL DEFAULT '07:00',
        timezone        TEXT NOT NULL DEFAULT 'America/New_York'
    );
`);

const getLink = db.prepare('SELECT staff_name FROM shift_links WHERE discord_id = ?');
const getCfg  = db.prepare('SELECT * FROM scheduler_config WHERE guild_id = ?');

async function postCallout(apiUrl, bridgeKey, payload) {
    const res = await fetch(`${apiUrl}/api/discord/callout`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'x-bridge-key': bridgeKey },
        body:    JSON.stringify(payload),
        signal:  AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`Scheduler API returned ${res.status}`);
    return res.json();
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('callout')
        .setDescription('Submit a shift callout to the scheduler')
        .addStringOption(opt =>
            opt.setName('date').setDescription('Date of the shift you\'re calling out from (YYYY-MM-DD, defaults to today)').setRequired(false)
        )
        .addStringOption(opt =>
            opt.setName('reason').setDescription('Reason for calling out').setRequired(false)
        ),

    async execute(interaction) {
        const guildId = interaction.guild.id;
        const userId  = interaction.user.id;

        const link = getLink.get(userId);
        if (!link)
            return interaction.reply({
                content: '\u274C You haven\'t linked your name yet. Run `/myshift link name:YourName` first.',
                ephemeral: true,
            });

        const cfg = getCfg.get(guildId);
        if (!cfg)
            return interaction.reply({
                content: '\u274C No scheduler connected. Ask an admin to run `/myshift setup`.',
                ephemeral: true,
            });

        const date   = interaction.options.getString('date') ?? new Date().toISOString().slice(0, 10);
        const reason = interaction.options.getString('reason') ?? 'No reason provided';

        await interaction.deferReply({ ephemeral: true });

        try {
            await postCallout(cfg.api_url, cfg.bridge_key, {
                staffName:   link.staff_name,
                date,
                reason,
                submittedAt: new Date().toISOString(),
                submittedBy: `${interaction.user.username} (Discord)`,
            });

            return interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setTitle('\uD83D\uDCCB Callout Submitted')
                    .setColor('#FFA500')
                    .setDescription(
                        `**Staff:** ${link.staff_name}\n` +
                        `**Date:** ${date}\n` +
                        `**Reason:** ${reason}\n\n` +
                        '*Your callout has been recorded in the scheduler.*'
                    )
                    .setFooter({ text: 'Sigil \u2022 Scheduler Bridge' })
                    .setTimestamp()],
            });
        } catch (e) {
            return interaction.editReply({
                content: `\u274C Failed to submit callout: \`${e.message}\`\nThe scheduler may be offline.`,
            });
        }
    },
};
