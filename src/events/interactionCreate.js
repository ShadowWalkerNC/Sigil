const { Events } = require('discord.js');
const giveaway = require('../commands/giveaway.js');
const embed    = require('../commands/embed.js');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction, client) {

        // ── Slash commands ─────────────────────────────────────────────────────
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (!command) return;

            const { cooldowns } = client;
            if (!cooldowns.has(command.data.name)) cooldowns.set(command.data.name, new Map());
            const timestamps = cooldowns.get(command.data.name);
            const cooldownMs = (command.cooldown ?? 3) * 1000;
            const now        = Date.now();

            if (timestamps.has(interaction.user.id)) {
                const expiresAt = timestamps.get(interaction.user.id) + cooldownMs;
                if (now < expiresAt) {
                    const remaining = ((expiresAt - now) / 1000).toFixed(1);
                    return interaction.reply({
                        content: `Please wait **${remaining}s** before using \`/${command.data.name}\` again.`,
                        ephemeral: true,
                    });
                }
            }

            timestamps.set(interaction.user.id, now);
            setTimeout(() => timestamps.delete(interaction.user.id), cooldownMs);

            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(`[ERROR] /${interaction.commandName}:`, error);
                const reply = { content: 'Something went wrong.', ephemeral: true };
                if (interaction.replied || interaction.deferred) await interaction.followUp(reply);
                else await interaction.reply(reply);
            }
            return;
        }

        // ── Autocomplete ──────────────────────────────────────────────────
        if (interaction.isAutocomplete()) {
            const command = client.commands.get(interaction.commandName);
            if (!command?.autocomplete) return;
            try { await command.autocomplete(interaction); }
            catch (e) { try { await interaction.respond([]); } catch (_) {} }
            return;
        }

        // ── Button interactions ─────────────────────────────────────────────
        if (interaction.isButton()) {
            const id = interaction.customId;

            // Giveaway buttons
            if (id.startsWith('gw_')) {
                await giveaway.handleButton(interaction).catch(e =>
                    console.error('[Giveaway] Button error:', e.message)
                );
                return;
            }

            // Embed builder buttons
            if (id.startsWith('emb_')) {
                await embed.handleButton(interaction).catch(e =>
                    console.error('[Embed] Button error:', e.message)
                );
                return;
            }

            // Route to command's own handleButton if defined
            const command = [...client.commands.values()].find(c => c.handleButton);
            // Fallback: try all commands that export handleButton
            for (const cmd of client.commands.values()) {
                if (cmd.handleButton) {
                    try {
                        const handled = await cmd.handleButton(interaction);
                        if (handled) return;
                    } catch (e) {
                        console.error(`[Button] Error in ${cmd.data?.name}:`, e.message);
                    }
                }
            }
            return;
        }

        // ── Modal submissions ──────────────────────────────────────────────
        if (interaction.isModalSubmit()) {
            const id = interaction.customId;

            // Embed builder modals
            if (id.startsWith('embm_')) {
                await embed.handleModal(interaction).catch(e =>
                    console.error('[Embed] Modal error:', e.message)
                );
                return;
            }

            // Route to command's own handleModal if defined
            for (const cmd of client.commands.values()) {
                if (cmd.handleModal) {
                    try {
                        const handled = await cmd.handleModal(interaction);
                        if (handled) return;
                    } catch (e) {
                        console.error(`[Modal] Error in ${cmd.data?.name}:`, e.message);
                    }
                }
            }
            return;
        }

        // ── Select menus ──────────────────────────────────────────────────
        if (interaction.isAnySelectMenu()) {
            for (const cmd of client.commands.values()) {
                if (cmd.handleSelect) {
                    try {
                        const handled = await cmd.handleSelect(interaction);
                        if (handled) return;
                    } catch (e) {
                        console.error(`[Select] Error in ${cmd.data?.name}:`, e.message);
                    }
                }
            }
        }
    },
};
