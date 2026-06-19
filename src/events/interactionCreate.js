const { EmbedBuilder } = require('discord.js');
const { getPanel, getPanelButtons } = require('../utils/db.js');

// Slash command routing is handled in src/index.js.
// This file handles all button interactions.
module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        if (!interaction.isButton()) return;

        const { customId } = interaction;

        // Setup wizard buttons
        if (customId === 'setup_brand') {
            return interaction.reply({
                embeds: [new EmbedBuilder().setColor('#00FF00').setTitle('✓ Step 1 — Brand')
                    .setDescription('Run `/brand ai` or `/brand kit` to design your brand, then `/brand share` to open it in the Visual Builder.')],
                ephemeral: true,
            });
        }
        if (customId === 'setup_emoji') {
            return interaction.reply({
                embeds: [new EmbedBuilder().setColor('#00FF00').setTitle('✓ Step 2 — Emoji')
                    .setDescription('Upload custom emoji via Server Settings → Emoji.')],
                ephemeral: true,
            });
        }
        if (customId === 'setup_roles') {
            return interaction.reply({
                embeds: [new EmbedBuilder().setColor('#00FF00').setTitle('✓ Step 3 — Roles')
                    .setDescription('Create and assign roles via Server Settings → Roles.')],
                ephemeral: true,
            });
        }
        if (customId === 'setup_auto') {
            return interaction.reply({
                embeds: [new EmbedBuilder().setColor('#00FF00').setTitle('✓ Step 4 — Automation')
                    .setDescription('Automation settings enabled.')],
                ephemeral: true,
            });
        }

        // Reaction role panels — customId: rr_<panelId>_<roleId>
        if (customId.startsWith('rr_')) {
            const parts   = customId.split('_');
            if (parts.length < 3) return;
            const panelId = parseInt(parts[1], 10);
            const roleId  = parts.slice(2).join('_');

            const panel = getPanel(panelId);
            if (!panel) return interaction.reply({ content: 'This panel no longer exists.', ephemeral: true });

            const buttons = getPanelButtons(panelId);
            if (!buttons.find(b => b.role_id === roleId))
                return interaction.reply({ content: 'This role button is no longer configured.', ephemeral: true });

            const guild     = interaction.guild;
            const member    = interaction.member;
            const botMember = guild.members.me;
            const role      = guild.roles.cache.get(roleId);

            if (!role)
                return interaction.reply({ content: '❌ That role no longer exists.', ephemeral: true });
            if (role.position >= botMember.roles.highest.position)
                return interaction.reply({ content: "❌ I don't have permission to assign that role.", ephemeral: true });

            try {
                if (member.roles.cache.has(roleId)) {
                    await member.roles.remove(roleId, 'Reaction role panel');
                    return interaction.reply({
                        embeds: [new EmbedBuilder().setDescription(`➖ Removed <@&${roleId}>.`).setColor('#F04747')],
                        ephemeral: true,
                    });
                } else {
                    await member.roles.add(roleId, 'Reaction role panel');
                    return interaction.reply({
                        embeds: [new EmbedBuilder().setDescription(`➕ Gave you <@&${roleId}>.`).setColor('#43B581')],
                        ephemeral: true,
                    });
                }
            } catch (err) {
                console.error(`[RR] Failed to toggle role ${roleId}:`, err.message);
                return interaction.reply({ content: '❌ Failed to update your roles. Check my permissions.', ephemeral: true });
            }
        }
    },
};
