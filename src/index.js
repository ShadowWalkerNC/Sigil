require('dotenv/config');
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { readdirSync, readFileSync } = require('fs');
const path = require('path');
const { initDatabase } = require('./utils/database.js');
const express = require('express');

// ── GUI Web Server ──────────────────────────────────────────────────
const app  = express();
const PORT = Number(process.env.PORT) || 3420;

app.use(express.json({ limit: '1mb' }));

app.get('/', (req, res) => {
    const htmlPath = path.join(__dirname, '..', 'gui', 'sigil-gui-builder.html');
    try {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(readFileSync(htmlPath));
    } catch {
        res.status(500).json({ error: 'GUI HTML not found.' });
    }
});

app.get('/health', (req, res) => {
    res.json({ ok: true, version: '2.0.0' });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`[GUI] Web server running on port ${PORT}`);
});

// ── Discord Bot ─────────────────────────────────────────────────────
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildEmojisAndStickers,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildScheduledEvents,
    ]
});

module.exports = { client };

client.commands = new Collection();

const cmdDir = path.join(__dirname, 'commands');
for (const file of readdirSync(cmdDir).filter(f => f.endsWith('.js'))) {
    const cmd = require(path.join(cmdDir, file));
    const mod = cmd.default || cmd;
    if (mod.data && mod.execute) client.commands.set(mod.data.name, mod);
}

const evtDir = path.join(__dirname, 'events');
for (const file of readdirSync(evtDir).filter(f => f.endsWith('.js'))) {
    const mod = require(path.join(evtDir, file));
    const evt = mod.default || mod;
    if (evt.name === 'interactionCreate') continue;
    client.on(evt.name, (...args) => evt.execute(client, ...args));
}

client.on('interactionCreate', async interaction => {
    if (interaction.isChatInputCommand()) {
        const cmd = client.commands.get(interaction.commandName);
        if (!cmd) return;
        try {
            await cmd.execute(client, interaction);
        } catch (err) {
            console.error(`Command error [${interaction.commandName}]:`, err);
            const msg = { content: '\u274C An error occurred.', ephemeral: true };
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(msg).catch(() => {});
            } else {
                await interaction.reply(msg).catch(() => {});
            }
        }
        return;
    }
    if (interaction.isButton()) {
        const handler = require(path.join(evtDir, 'interactionCreate.js'));
        await (handler.default || handler).execute(client, interaction);
    }
});

initDatabase();
client.login(process.env.TOKEN);
