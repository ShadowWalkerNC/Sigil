const {
    SlashCommandBuilder, EmbedBuilder,
} = require('discord.js');

// In-memory store — survives restarts if you add persistence later
const reminders = [];

function parseTime(str) {
    const re = /(\d+)\s*(d(?:ays?)?|h(?:ours?)?|m(?:in(?:utes?)?)?|s(?:ec(?:onds?)?)?)/gi;
    let ms = 0, match;
    while ((match = re.exec(str)) !== null) {
        const n = parseInt(match[1]);
        const u = match[2][0].toLowerCase();
        if (u === 'd') ms += n * 86_400_000;
        else if (u === 'h') ms += n * 3_600_000;
        else if (u === 'm') ms += n * 60_000;
        else if (u === 's') ms += n * 1_000;
    }
    return ms;
}

function startReminderTick(client) {
    setInterval(async () => {
        const now = Date.now();
        const due = reminders.filter(r => !r.fired && r.fireAt <= now);
        for (const r of due) {
            r.fired = true;
            try {
                if (r.type === 'dm') {
                    const user = await client.users.fetch(r.userId).catch(() => null);
                    if (user) await user.send({
                        embeds: [new EmbedBuilder()
                            .setTitle('\u23F0 Reminder!')
                            .setDescription(r.message)
                            .setColor('#FEE75C')
                            .setFooter({ text: 'Sigil \u2022 Reminder' })
                            .setTimestamp()],
                    });
                } else {
                    const channel = await client.channels.fetch(r.channelId).catch(() => null);
                    if (channel) await channel.send({
                        content: `<@${r.userId}>`,
                        embeds: [new EmbedBuilder()
                            .setTitle('\u23F0 Reminder!')
                            .setDescription(r.message)
                            .setColor('#FEE75C')
                            .setFooter({ text: 'Sigil \u2022 Reminder' })
                            .setTimestamp()],
                    });
                }
            } catch (e) {
                console.error('[Remind] Fire error:', e.message);
            }
        }
        // Clean up fired
        for (let i = reminders.length - 1; i >= 0; i--) {
            if (reminders[i].fired) reminders.splice(i, 1);
        }
    }, 15_000);
}

module.exports = {
    startReminderTick,

    data: new SlashCommandBuilder()
        .setName('remind')
        .setDescription('Set a reminder for yourself or a channel')
        .addStringOption(opt => opt.setName('in').setDescription('When to remind you (e.g. 30m, 2h, 1d)').setRequired(true))
        .addStringOption(opt => opt.setName('message').setDescription('What to remind you about').setRequired(true))
        .addStringOption(opt => opt.setName('type').setDescription('DM (default) or channel').setRequired(false)
            .addChoices(
                { name: 'DM (private)', value: 'dm' },
                { name: 'This channel', value: 'channel' },
            )
        ),

    async execute(interaction) {
        const inStr   = interaction.options.getString('in');
        const message = interaction.options.getString('message');
        const type    = interaction.options.getString('type') ?? 'dm';

        const ms = parseTime(inStr);
        if (!ms || ms < 10_000)
            return interaction.reply({ content: '\u274C Invalid time. Try `30m`, `2h`, `1d`. Minimum is 10 seconds.', ephemeral: true });
        if (ms > 30 * 86_400_000)
            return interaction.reply({ content: '\u274C Maximum reminder time is 30 days.', ephemeral: true });

        const fireAt = Date.now() + ms;

        reminders.push({
            userId:    interaction.user.id,
            channelId: interaction.channel.id,
            message,
            type,
            fireAt,
            fired: false,
        });

        const ts = Math.floor(fireAt / 1000);
        return interaction.reply({
            embeds: [new EmbedBuilder()
                .setTitle('\u23F0 Reminder Set')
                .setDescription(`I'll remind you <t:${ts}:R> (at <t:${ts}:t>).\n\n**Message:** ${message}`)
                .setColor('#FEE75C')
                .setFooter({ text: `Sigil \u2022 Delivery: ${type === 'dm' ? 'DM' : 'This channel'}` })
                .setTimestamp()],
            ephemeral: true,
        });
    },
};
