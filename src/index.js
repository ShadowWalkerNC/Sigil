const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { readdirSync } = require('fs');
const { join } = require('path');
require('dotenv').config();

const TOKEN     = process.env.DISCORD_TOKEN || process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

if (!TOKEN || !CLIENT_ID) {
    console.error('\x1b[31m\x1b[1m[FATAL] DISCORD_TOKEN (or TOKEN) and CLIENT_ID must be set. Exiting.\x1b[0m');
    process.exit(1);
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
    ],
});

client.commands = new Collection();
client.cooldowns = new Collection();

const commandFiles = readdirSync(join(__dirname, 'commands')).filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
    const command = require(join(__dirname, 'commands', file));
    if (command.data && command.execute) {
        client.commands.set(command.data.name, command);
    } else {
        console.warn(`[WARNING] Command file ${file} is missing 'data' or 'execute'. Skipping.`);
    }
}

const eventFiles = readdirSync(join(__dirname, 'events')).filter(file => file.endsWith('.js'));
for (const file of eventFiles) {
    const event = require(join(__dirname, 'events', file));
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
    } else {
        client.on(event.name, (...args) => event.execute(...args, client));
    }
}

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) {
        console.error(`[ERROR] No command found for: ${interaction.commandName}`);
        await interaction.reply({ content: 'Unknown command.', ephemeral: true });
        return;
    }

    const { cooldowns } = client;
    if (!cooldowns.has(command.data.name)) {
        cooldowns.set(command.data.name, new Collection());
    }

    const now = Date.now();
    const timestamps = cooldowns.get(command.data.name);
    const cooldownMs = (command.cooldown ?? 3) * 1000;

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
        console.error(`[ERROR] Failed to execute command '${interaction.commandName}':`, error);
        const reply = { content: 'Something went wrong while running that command.', ephemeral: true };
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(reply);
        } else {
            await interaction.reply(reply);
        }
    }
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isAutocomplete()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command?.autocomplete) return;

    try {
        await command.autocomplete(interaction);
    } catch (error) {
        console.error(`[ERROR] Autocomplete failed for '${interaction.commandName}':`, error);
        try { await interaction.respond([]); } catch (_) {}
    }
});

process.on('unhandledRejection', (error) => {
    console.error('[ERROR] Unhandled Rejection:', error);
});

client.login(TOKEN);
console.log('\x1b[32m\x1b[1m Sigil v2.0.0 starting...\x1b[0m');
