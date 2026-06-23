require('dotenv').config();
const { REST, Routes } = require('discord.js');
const { readdirSync } = require('fs');
const path = require('path');

const TOKEN     = process.env.DISCORD_TOKEN || process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

if (!TOKEN || !CLIENT_ID) {
    console.error('[FATAL] DISCORD_TOKEN (or TOKEN) and CLIENT_ID must be set.');
    process.exit(1);
}

const commands = [];
const cmdDir = path.join(__dirname, 'commands');

for (const file of readdirSync(cmdDir).filter(f => f.endsWith('.js'))) {
    // Skip private impl files — they are not command entry points
    if (file.startsWith('_')) continue;
    try {
        const cmd = require(path.join(cmdDir, file));
        if (cmd?.data?.toJSON) commands.push(cmd.data.toJSON());
    } catch (err) {
        console.warn(`[deploy] Skipping ${file}: ${err.message}`);
    }
}

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
    try {
        console.log(`Registering ${commands.length} commands...`);
        await rest.put(
            Routes.applicationCommands(CLIENT_ID),
            { body: commands }
        );
        console.log('\u2713 Slash commands registered globally.');
    } catch (err) {
        console.error(err);
    }
})();
