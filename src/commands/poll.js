const {
    SlashCommandBuilder, EmbedBuilder, ActionRowBuilder,
    ButtonBuilder, ButtonStyle,
} = require('discord.js');

// In-memory poll store: pollId -> { question, options: Map<label, Set<userId>>, message, host, guild, multi }
const polls = new Map();

const OPTION_EMOJIS = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];

function totalVotes(options) {
    return [...options.values()].reduce((sum, s) => sum + s.size, 0);
}

function buildEmbed(guild, data, ended = false) {
    const total = totalVotes(data.options);
    const embed = new EmbedBuilder()
        .setTitle(`📊 ${data.question}`)
        .setColor(ended ? '#555555' : '#5865F2')
        .setTimestamp();

    let desc = ended ? '*This poll has closed.*\n\n' : (data.multi ? '*You may vote for multiple options.*\n\n' : '*One vote per person.*\n\n');

    let i = 0;
    for (const [label, voters] of data.options.entries()) {
        const count = voters.size;
        const pct   = total > 0 ? Math.round((count / total) * 100) : 0;
        const bar   = buildBar(pct);
        desc += `${OPTION_EMOJIS[i]} **${label}**\n${bar} ${pct}% (${count} vote${count !== 1 ? 's' : ''})\n\n`;
        i++;
    }

    desc += `\u2014 **${total}** total vote${total !== 1 ? 's' : ''}`;
    embed.setDescription(desc);
    embed.setFooter({ text: `Sigil \u2022 Poll \u2022 ${guild.name}` });
    return embed;
}

function buildBar(pct) {
    const filled = Math.round(pct / 10);
    return '\u2588'.repeat(filled) + '\u2591'.repeat(10 - filled);
}

function buildButtons(pollId, labels, disabled = false) {
    const rows = [];
    for (let i = 0; i < labels.length; i += 5) {
        const row = new ActionRowBuilder();
        const chunk = labels.slice(i, i + 5);
        chunk.forEach((label, j) => {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`poll_vote_${pollId}_${i + j}`)
                    .setLabel(`${OPTION_EMOJIS[i + j]} ${label}`.slice(0, 80))
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(disabled)
            );
        });
        rows.push(row);
    }
    rows.push(new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`poll_close_${pollId}`)
            .setLabel('Close Poll')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(disabled)
    ));
    return rows;
}

function parseExpiry(str) {
    if (!str) return null;
    const s = str.toLowerCase();
    const match = s.match(/(\d+)\s*(d(?:ays?)?|h(?:ours?)?|m(?:in(?:utes?)?)?)/);
    if (!match) return null;
    const n = parseInt(match[1]);
    const unit = match[2][0];
    if (unit === 'd') return n * 86_400_000;
    if (unit === 'h') return n * 3_600_000;
    if (unit === 'm') return n * 60_000;
    return null;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('poll')
        .setDescription('Create a poll with up to 10 options and live vote counts')
        .addStringOption(opt =>
            opt.setName('question').setDescription('The poll question').setRequired(true)
        )
        .addStringOption(opt =>
            opt.setName('options').setDescription('Comma-separated options (e.g. Yes, No, Maybe). Defaults to Yes/No.').setRequired(false)
        )
        .addBooleanOption(opt =>
            opt.setName('multi').setDescription('Allow multiple votes per person? (default false)').setRequired(false)
        )
        .addStringOption(opt =>
            opt.setName('expiry').setDescription('Auto-close after (e.g. 1h, 2d, 30m — default 24h)').setRequired(false)
        )
        .addChannelOption(opt =>
            opt.setName('channel').setDescription('Channel to post in (defaults to current)').setRequired(false)
        )
        .addRoleOption(opt =>
            opt.setName('ping').setDescription('Role to ping').setRequired(false)
        ),

    async execute(interaction) {
        const question   = interaction.options.getString('question');
        const optionsRaw = interaction.options.getString('options');
        const multi      = interaction.options.getBoolean('multi') ?? false;
        const expiryStr  = interaction.options.getString('expiry');
        const target     = interaction.options.getChannel('channel') ?? interaction.channel;
        const ping       = interaction.options.getRole('ping');

        let labels = optionsRaw
            ? optionsRaw.split(',').map(s => s.trim()).filter(Boolean).slice(0, 10)
            : ['Yes', 'No'];

        if (labels.length < 2) {
            return interaction.reply({ content: '\u274C Please provide at least 2 options.', ephemeral: true });
        }

        const pollId   = `${interaction.guild.id}_${Date.now()}`;
        const expiryMs = parseExpiry(expiryStr) ?? 86_400_000;

        const optionsMap = new Map();
        for (const label of labels) optionsMap.set(label, new Set());

        const data = {
            question, multi,
            options: optionsMap,
            host: interaction.user.id,
            guild: interaction.guild,
            labels,
        };

        const embed   = buildEmbed(interaction.guild, data);
        const rows    = buildButtons(pollId, labels);
        const content = ping ? `<@&${ping.id}>` : undefined;

        let msg;
        try {
            msg = await target.send({ content, embeds: [embed], components: rows });
        } catch (err) {
            console.error('[Poll] Failed to post:', err.message);
            return interaction.reply({
                content: `\u274C Could not post to <#${target.id}>. Check my permissions.`,
                ephemeral: true,
            });
        }

        data.message = msg;
        polls.set(pollId, data);

        setTimeout(async () => {
            const d = polls.get(pollId);
            if (!d) return;
            const closedEmbed = buildEmbed(d.guild, d, true);
            const closedRows  = buildButtons(pollId, d.labels, true);
            await d.message.edit({ embeds: [closedEmbed], components: closedRows }).catch(() => {});
            const winner = [...d.options.entries()].sort((a, b) => b[1].size - a[1].size)[0];
            if (winner && winner[1].size > 0) {
                await d.message.reply({
                    embeds: [new EmbedBuilder()
                        .setTitle('\uD83C\uDFC6 Poll Closed')
                        .setDescription(`**${d.question}**\n\n\uD83E\uDD47 **"${winner[0]}"** won with **${winner[1].size}** vote${winner[1].size !== 1 ? 's' : ''} out of **${totalVotes(d.options)}** total.`)
                        .setColor('#FEE75C')
                        .setFooter({ text: 'Sigil \u2022 Poll Result' })
                        .setTimestamp()],
                }).catch(() => {});
            }
            polls.delete(pollId);
        }, expiryMs);

        await interaction.reply({
            content: `\u2705 Poll posted to <#${target.id}>. Closes in **${expiryStr ?? '24h'}**.`,
            ephemeral: true,
        });
    },

    async handleButton(interaction) {
        const id = interaction.customId;
        if (!id.startsWith('poll_')) return false;

        const parts  = id.split('_');
        const action = parts[1];

        if (action === 'close') {
            const pollId = parts.slice(2).join('_');
            const data   = polls.get(pollId);
            if (!data) return interaction.reply({ content: 'This poll has already closed.', ephemeral: true });
            if (interaction.user.id !== data.host && !interaction.memberPermissions?.has('ManageMessages')) {
                return interaction.reply({ content: '\u274C Only the poll creator or a mod can close this.', ephemeral: true });
            }
            const closedEmbed = buildEmbed(data.guild, data, true);
            const closedRows  = buildButtons(pollId, data.labels, true);
            await interaction.update({ embeds: [closedEmbed], components: closedRows });
            polls.delete(pollId);
            return true;
        }

        if (action === 'vote') {
            const optionIndex = parseInt(parts[parts.length - 1]);
            const pollId      = parts.slice(2, parts.length - 1).join('_');
            const data        = polls.get(pollId);
            if (!data) return interaction.reply({ content: 'This poll has already closed.', ephemeral: true });

            const userId    = interaction.user.id;
            const labels    = [...data.options.keys()];
            const label     = labels[optionIndex];
            if (!label) return interaction.reply({ content: 'Invalid option.', ephemeral: true });

            const targetSet = data.options.get(label);

            if (!data.multi) {
                for (const [, set] of data.options.entries()) set.delete(userId);
            }

            if (targetSet.has(userId)) {
                targetSet.delete(userId);
            } else {
                targetSet.add(userId);
            }

            const updated = buildEmbed(data.guild, data);
            await interaction.update({ embeds: [updated], components: buildButtons(pollId, data.labels) });
            return true;
        }

        return false;
    },
};
