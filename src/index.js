const { Client, GatewayIntentBits, Partials, Collection } = require('discord.js');
const { readdirSync } = require('fs');
const { join } = require('path');
require('dotenv').config();

// ── DB MUST be required first ─────────────────────────────────────────────────
const db = require('./db');

const TOKEN     = process.env.DISCORD_TOKEN || process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

if (!TOKEN || !CLIENT_ID) {
    console.error('\x1b[31m\x1b[1m[FATAL] DISCORD_TOKEN (or TOKEN) and CLIENT_ID must be set. Exiting.\x1b[0m');
    process.exit(1);
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildScheduledEvents,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildInvites,
        GatewayIntentBits.GuildMessageReactions,
    ],
    partials: [
        Partials.Message,
        Partials.Channel,
        Partials.Reaction,
    ],
});

client.commands  = new Collection();
client.cooldowns = new Collection();

// Load commands
const commandFiles = readdirSync(join(__dirname, 'commands')).filter(f => f.endsWith('.js'));
for (const file of commandFiles) {
    const command = require(join(__dirname, 'commands', file));
    if (command.data && command.execute) {
        client.commands.set(command.data.name, command);
    } else {
        console.warn(`[WARNING] Command file ${file} is missing 'data' or 'execute'. Skipping.`);
    }
}

// Load events
const eventFiles = readdirSync(join(__dirname, 'events')).filter(f => f.endsWith('.js'));
for (const file of eventFiles) {
    const loaded = require(join(__dirname, 'events', file));
    const events = Array.isArray(loaded) ? loaded : [loaded];
    for (const event of events) {
        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args, client));
        } else {
            client.on(event.name, (...args) => event.execute(...args, client));
        }
    }
}

// ── IPC: prepared statements for bot -> SQLite -> gui-server bridge ──────────
const _upsertHeartbeat = db.prepare(`
    INSERT INTO bot_heartbeat (id, ts, guilds, latency, tag)
    VALUES (1, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
        ts      = excluded.ts,
        guilds  = excluded.guilds,
        latency = excluded.latency,
        tag     = excluded.tag
`);

const _upsertService = db.prepare(`
    INSERT INTO service_registry (name, status, last_heartbeat, last_error, error_count, meta, options)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(name) DO UPDATE SET
        status         = excluded.status,
        last_heartbeat = excluded.last_heartbeat,
        last_error     = excluded.last_error,
        error_count    = excluded.error_count,
        meta           = excluded.meta,
        options        = excluded.options
`);

const _insertLog = db.prepare(
    'INSERT INTO log_buffer (ts, level, text) VALUES (?, ?, ?)'
);

// Trim is batched — only runs every 50 writes to avoid a DELETE on every log line
let _logWriteCount = 0;
const _trimLog = db.prepare(
    'DELETE FROM log_buffer WHERE id NOT IN (SELECT id FROM log_buffer ORDER BY id DESC LIMIT 500)'
);

// Flush serviceRegistry snapshot to SQLite.
function flushServiceRegistry() {
    try {
        const registry = require('./util/serviceRegistry.js');
        const snapshot = registry.getSnapshot();
        for (const svc of snapshot) {
            _upsertService.run(
                svc.name,
                svc.status,
                svc.lastHeartbeat ?? null,
                svc.lastError     ?? null,
                svc.errorCount,
                JSON.stringify(svc.meta    ?? {}),
                JSON.stringify(svc.options ?? {}),
            );
        }
    } catch (err) {
        console.warn('[IPC] flushServiceRegistry error:', err.message);
    }
}

// Patch console so bot logs are written to the shared log_buffer table.
(function patchConsole() {
    const _log   = console.log.bind(console);
    const _warn  = console.warn.bind(console);
    const _error = console.error.bind(console);

    function writeLog(level, args) {
        try {
            const text = args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
            _insertLog.run(Date.now(), level, text.slice(0, 2000));
            // Batch trim: only run every 50 writes
            _logWriteCount++;
            if (_logWriteCount >= 50) {
                _trimLog.run();
                _logWriteCount = 0;
            }
        } catch { /* never crash bot over a log write */ }
    }

    console.log   = (...a) => { _log(...a);   writeLog('info',  a); };
    console.warn  = (...a) => { _warn(...a);  writeLog('warn',  a); };
    console.error = (...a) => { _error(...a); writeLog('error', a); };
}());

// ── Apply setup_wizard config saved by the GUI setup page ────────────────────
function applySetupWizardConfig() {
    try {
        const Database = require('better-sqlite3');
        const path     = require('path');
        const { enablePackage } = require('./utils/packages.js');

        const dbPath  = path.join(__dirname, '..', 'data', 'sigil.db');
        const setupDb = new Database(dbPath, { readonly: true, fileMustExist: true });

        const hasTable = setupDb
            .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='setup_wizard'")
            .get();
        if (!hasTable) { setupDb.close(); return; }

        const rows = setupDb.prepare('SELECT key, value FROM setup_wizard').all();
        setupDb.close();

        const data = Object.fromEntries(rows.map(r => [r.key, JSON.parse(r.value)]));

        // Apply enabled packages for every guild currently in cache
        // (also stores them so future guilds pick them up via packages.js)
        if (Array.isArray(data.packages) && data.packages.length > 0) {
            const guildIds = [...client.guilds.cache.keys()];
            for (const guildId of guildIds) {
                for (const pkg of data.packages) {
                    try { enablePackage(guildId, pkg); } catch { /* ignore unknown pkg */ }
                }
            }
            console.log(`[setup] Applied packages [${data.packages.join(', ')}] to ${guildIds.length} guild(s).`);
        }

        // Store channel config in process.env so services can read it without DB access
        if (data.channels && typeof data.channels === 'object') {
            for (const [key, channelId] of Object.entries(data.channels)) {
                const envKey = `SETUP_CHANNEL_${key.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;
                process.env[envKey] = channelId;
            }
            console.log(`[setup] Loaded ${Object.keys(data.channels).length} channel config(s) from setup_wizard.`);
        }
    } catch (err) {
        // Non-fatal — if setup_wizard hasn't been used the table may not exist
        if (!err.message?.includes('no such table') && !err.message?.includes('ENOENT')) {
            console.warn('[setup] applySetupWizardConfig error:', err.message);
        }
    }
}

client.once('clientReady', () => {
    global.sigilClient = client;

    // Apply any config saved via the GUI setup wizard
    applySetupWizardConfig();

    const { handleTwitchLive, handleYouTubeUpload, handleGitHubPush } = require('./automation/webhookHandler.js');
    const { processWebhookQueue } = require('./utils/webhookQueue.js');

    // Webhook dispatch handlers keyed by event type
    const webhookHandlers = {
        'twitch.live':    handleTwitchLive,
        'youtube.upload': handleYouTubeUpload,
        'github.push':    handleGitHubPush,
    };

    // Poll webhook_queue every 5 s and dispatch events using the live client
    setInterval(() => processWebhookQueue(client, webhookHandlers), 5_000);

    const { startPollers }                        = require('./services/pollers.js');
    const { startScheduler }                      = require('./services/scheduler.js');
    const { startStatsRunner }                    = require('./services/statsRunner.js');
    const { startScheduler: startDevotional }     = require('./commands/devotional.js');
    const { startShiftScheduler }                 = require('./commands/shift.js');
    const { startMyShiftScheduler }               = require('./commands/myshift.js');

    for (const [name, fn] of [
        ['pollers',     () => startPollers(client)],
        ['scheduler',   () => startScheduler(client)],
        ['statsRunner', () => startStatsRunner(client)],
        ['devotional',  () => startDevotional(client)],
        ['shift',       () => startShiftScheduler(client)],
        ['myshift',     () => startMyShiftScheduler(client)],
    ]) {
        try { fn(); }
        catch (err) { console.error(`[startup] Failed to start service "${name}":`, err.message); }
    }

    function writeHeartbeat() {
        try {
            _upsertHeartbeat.run(
                Date.now(),
                client.guilds.cache.size,
                client.ws.ping,
                client.user.tag,
            );
        } catch (err) {
            console.warn('[IPC] heartbeat write error:', err.message);
        }
    }
    writeHeartbeat();
    setInterval(writeHeartbeat, 30_000);
    setInterval(flushServiceRegistry, 60_000);

    console.log(`\x1b[32m\x1b[1m[Sigil] Ready! Logged in as ${client.user.tag}\x1b[0m`);
});

// Slash command handler
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) {
        console.error(`[ERROR] No command found for: ${interaction.commandName}`);
        try { await interaction.reply({ content: 'Unknown command.', flags: 64 }); } catch (_) {}
        return;
    }

    const { cooldowns } = client;
    if (!cooldowns.has(command.data.name)) cooldowns.set(command.data.name, new Collection());

    const now        = Date.now();
    const timestamps = cooldowns.get(command.data.name);
    const cooldownMs = (command.cooldown ?? 3) * 1000;

    if (timestamps.has(interaction.user.id)) {
        const expiresAt = timestamps.get(interaction.user.id) + cooldownMs;
        if (now < expiresAt) {
            const remaining = ((expiresAt - now) / 1000).toFixed(1);
            try {
                await interaction.reply({
                    content: `Please wait **${remaining}s** before using \`/${command.data.name}\` again.`,
                    flags: 64,
                });
            } catch (cdErr) {
                if (cdErr?.code !== 10062) console.warn('[cooldown] reply failed:', cdErr?.message);
            }
            return;
        }
    }

    timestamps.set(interaction.user.id, now);
    setTimeout(() => timestamps.delete(interaction.user.id), cooldownMs);

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(`[ERROR] Failed to execute '${interaction.commandName}':`, error);
        const reply = { content: 'Something went wrong while running that command.', flags: 64 };
        try {
            if (interaction.replied || interaction.deferred) await interaction.followUp(reply);
            else await interaction.reply(reply);
        } catch (_) {}
    }
});

// Autocomplete handler
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isAutocomplete()) return;
    const command = client.commands.get(interaction.commandName);
    if (!command?.autocomplete) return;
    try { await command.autocomplete(interaction); }
    catch (error) {
        console.error(`[ERROR] Autocomplete failed for '${interaction.commandName}':`, error);
        try { await interaction.respond([]); } catch (_) {}
    }
});

process.on('unhandledRejection', (error) => {
    console.error('[ERROR] Unhandled Rejection:', error);
});

client.login(TOKEN);
console.log('\x1b[32m\x1b[1m[Sigil] Starting...\x1b[0m');
