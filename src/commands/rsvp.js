const {
    SlashCommandBuilder, EmbedBuilder, ActionRowBuilder,
    ButtonBuilder, ButtonStyle, PermissionFlagsBits,
} = require('discord.js');
const { getConfig } = require('../utils/db.js');

// In-memory RSVP store: rsvpId -> { yes: Set, no: Set, maybe: Set, message, reminderFired }
const rsvps = new Map();

// Parse human duration strings like "2h", "30m", "1d", "2 hours", "in 3 days"
function parseDuration(str) {
    if (!str) return null;
    const s = str.toLowerCase().replace(/in\s+/, '');
    const match = s.match(/(\d+)\s*(d(?:ays?)?|h(?:ours?)?|m(?:in(?:utes?)?)?)/);
    if (!match) return null;
    const n = parseInt(match[1]);
    const unit = match[2][0];
    if (unit === 'd') return n * 86_400_000;
    if (unit === 'h') return n * 3_600_000;
    if (unit === 'm') return n * 60_000;
    return null;
}

function buildEmbed(guild, title, description, when, location, organizer, counts, ended = false) {
    const embed = new EmbedBuilder()
        .setTitle(`\uD83D\uDCCB ${title}`)
        .setColor(ended ? '#555555' : '#5865F2')
        .setTimestamp();

    let desc = description ? `${description}\n\n` : '';
    if (when)       desc += `\u23F0 **When:** ${when}\n`;
    if (location)   desc += `\uD83D\uDCCD **Where:** ${location}\n`;
    if (organizer)  desc += `\uD83D\uDC64 **Organizer:** <@${organizer}>\n`;
    desc += `\n\u2705 Going: **${counts.yes}**  \u274C Not Going: **${counts.no}**  \uD83E\uDD14 Maybe: **${counts.maybe}**`;
    if (ended) desc += '\n\n*This RSVP is closed.*';

    embed.setDescription(desc);
    embed.setFooter({ text: `Sigil \u2022 RSVP \u2022 ${guild.name}` });
    return embed;
}

function buildButtons(rsvpId, disabled = false) {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`rsvp_yes_${rsvpId}`)
            .setLabel('\u2705 Going')
            .setStyle(ButtonStyle.Success)
            .setDisabled(disabled),
        new ButtonBuilder()
            .setCustomId(`rsvp_no_${rsvpId}`)
            .setLabel('\u274C Not Going')
            .setStyle(ButtonStyle.Danger)
            .setDisabled(disabled),
        new ButtonBuilder()
            .setCustomId(`rsvp_maybe_${rsvpId}`)
            .setLabel('\uD83E\uDD14 Maybe')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled),
        new ButtonBuilder()
            .setCustomId(`rsvp_close_${rsvpId}`)
            .setLabel('Close RSVP')
            .setStyle(ButtonStyle.Primary)
            .setDisabled(disabled),
    );
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rsvp')
        .setDescription('Create an RSVP event with yes/no/maybe buttons')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageEvents)
        .addStringOption(opt =>
            opt.setName('title').setDescription('Event title').setRequired(true)
        )
        .addStringOption(opt =>
            opt.setName('when').setDescription('When is the event? (e.g. Sunday 10am, June 25 at 7pm)').setRequired(false)
        )
        .addStringOption(opt =>
            opt.setName('description').setDescription('Event description').setRequired(false)
        )
        .addStringOption(opt =>
            opt.setName('location').setDescription('Where is the event?').setRequired(false)
        )
        .addStringOption(opt =>
            opt.setName('duration').setDescription('How long until RSVP closes? (e.g. 2d, 12h, 30m)').setRequired(false)
        )
        .addChannelOption(opt =>
            opt.setName('channel').setDescription('Channel to post RSVP in (defaults to current)').setRequired(false)
        )
        .addRoleOption(opt =>
            opt.setName('ping').setDescription('Role to ping with this RSVP').setRequired(false)
        ),

    async execute(interaction) {
        const title       = interaction.options.getString('title');
        const when        = interaction.options.getString('when');
        const description = interaction.options.getString('description');
        const location    = interaction.options.getString('location');
        const durationStr = interaction.options.getString('duration');
        const target      = interaction.options.getChannel('channel') ?? interaction.channel;
        const ping        = interaction.options.getRole('ping');
        const organizer   = interaction.user.id;

        const durationMs  = parseDuration(durationStr) ?? 24 * 3_600_000; // default 24h
        const rsvpId      = `${interaction.guild.id}_${Date.now()}`;

        const counts = { yes: 0, no: 0, maybe: 0 };
        const embed  = buildEmbed(interaction.guild, title, description, when, location, organizer, counts);
        const row    = buildButtons(rsvpId);
        const content = ping ? `<@&${ping.id}>` : undefined;

        let msg;
        try {
            msg = await target.send({ content, embeds: [embed], components: [row] });
        } catch (err) {
            console.error('[RSVP] Failed to post:', err.message);
            return interaction.reply({
                content: `\u274C Could not post to <#${target.id}>. Check my permissions.`,
                ephemeral: true,
            });
        }

        rsvps.set(rsvpId, {
            title, when, description, location, organizer,
            yes: new Set(), no: new Set(), maybe: new Set(),
            message: msg, guild: interaction.guild,
            reminderFired: false,
        });

        // Auto-close after duration
        setTimeout(async () => {
            const data = rsvps.get(rsvpId);
            if (!data) return;
            const finalCounts = { yes: data.yes.size, no: data.no.size, maybe: data.maybe.size };
            const closedEmbed = buildEmbed(data.guild, data.title, data.description, data.when, data.location, data.organizer, finalCounts, true);
            await data.message.edit({ embeds: [closedEmbed], components: [buildButtons(rsvpId, true)] }).catch(() => {});
            rsvps.delete(rsvpId);
        }, durationMs);

        // 24h reminder (only if duration > 25h)
        if (durationMs > 25 * 3_600_000) {
            setTimeout(async () => {
                const data = rsvps.get(rsvpId);
                if (!data || data.reminderFired) return;
                data.reminderFired = true;
                const reminderEmbed = new EmbedBuilder()
                    .setTitle(`\u23F0 RSVP Reminder: ${data.title}`)
                    .setDescription(`This RSVP closes in **24 hours**.\n\n\u2705 Going: **${data.yes.size}**  \u274C Not Going: **${data.no.size}**  \uD83E\uDD14 Maybe: **${data.maybe.size}**`)
                    .setColor('#FFA500')
                    .setFooter({ text: `Sigil \u2022 RSVP Reminder` })
                    .setTimestamp();
                await data.message.reply({ embeds: [reminderEmbed] }).catch(() => {});
            }, durationMs - 24 * 3_600_000);
        }

        await interaction.reply({
            content: `\u2705 RSVP posted to <#${target.id}>. Closes in **${durationStr ?? '24h'}**.`,
            ephemeral: true,
        });
    },

    // Interaction handler — call this from your interactionCreate event
    async handleButton(interaction) {
        const id = interaction.customId;
        if (!id.startsWith('rsvp_')) return false;

        const parts  = id.split('_');
        const action = parts[1]; // yes | no | maybe | close
        const rsvpId = parts.slice(2).join('_');
        const data   = rsvps.get(rsvpId);

        if (!data) {
            return interaction.reply({ content: 'This RSVP has already closed or expired.', ephemeral: true });
        }

        const userId = interaction.user.id;

        if (action === 'close') {
            if (userId !== data.organizer && !interaction.memberPermissions?.has('ManageEvents')) {
                return interaction.reply({ content: '\u274C Only the organizer or a mod can close this RSVP.', ephemeral: true });
            }
            const finalCounts = { yes: data.yes.size, no: data.no.size, maybe: data.maybe.size };
            const closedEmbed = buildEmbed(data.guild, data.title, data.description, data.when, data.location, data.organizer, finalCounts, true);
            await interaction.update({ embeds: [closedEmbed], components: [buildButtons(rsvpId, true)] });
            rsvps.delete(rsvpId);
            return true;
        }

        // Toggle response — remove from other sets first
        const sets = { yes: data.yes, no: data.no, maybe: data.maybe };
        for (const [key, set] of Object.entries(sets)) {
            if (key !== action) set.delete(userId);
        }

        const current = sets[action];
        if (current.has(userId)) {
            current.delete(userId); // un-RSVP
        } else {
            current.add(userId);
        }

        const counts = { yes: data.yes.size, no: data.no.size, maybe: data.maybe.size };
        const updated = buildEmbed(data.guild, data.title, data.description, data.when, data.location, data.organizer, counts);
        await interaction.update({ embeds: [updated], components: [buildButtons(rsvpId)] });
        return true;
    },
};
