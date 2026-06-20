# Contributing to Sigil

Thanks for your interest in contributing! This guide covers everything you need to get a local dev environment running, understand the codebase, and open a quality pull request.

---

## Table of Contents
1. [Local Setup](#local-setup)
2. [Project Structure](#project-structure)
3. [Package System](#package-system)
4. [Adding a Slash Command](#adding-a-slash-command)
5. [GUI & API Routes](#gui--api-routes)
6. [Setup Wizard](#setup-wizard)
7. [Style Guide](#style-guide)
8. [Pull Request Checklist](#pull-request-checklist)

---

## Local Setup

```bash
# 1. Clone and install dependencies
git clone https://github.com/ShadowWalkerNC/Sigil.git
cd Sigil
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env — at minimum set DISCORD_TOKEN, CLIENT_ID, GUI_URL, CONTROL_SECRET

# 3. Register slash commands with Discord
node src/deploy-commands.js

# 4. Start the bot + GUI server together
node start.js

# — OR start them separately —
node src/index.js          # bot only
node gui/gui-server.js     # GUI only (default port 8080)
```

The setup wizard is also available at `http://localhost:8080/setup` once the GUI server is running.

---

## Project Structure

```
Sigil/
├── src/
│   ├── commands/          # Slash command handlers (one file per command)
│   ├── events/            # Discord.js event listeners
│   ├── automation/        # Pollers, webhook handlers, scheduled tasks
│   ├── utils/             # Shared helpers (db, canvas, hmac, packages, …)
│   ├── util/              # Low-level utilities (logBuffer, …)
│   ├── deploy-commands.js # Registers slash commands via Discord REST
│   └── index.js           # Bot entry point
├── gui/
│   ├── gui-server.js      # Express + WebSocket bridge server
│   ├── index.html         # Dashboard home
│   ├── setup.html         # Setup wizard
│   ├── status.html        # Bot status page
│   └── …                  # Other GUI pages
├── data/                  # SQLite database (gitignored)
├── tools/                 # Dev/admin CLI scripts
├── examples/              # Example configs and webhook payloads
├── .env.example           # Template — copy to .env
├── start.js               # Unified launcher (bot + GUI)
└── package.json
```

---

## Package System

Sigil’s features are split into 8 toggleable packages. Each guild can enable or disable any package independently via `/sigilconfig packages` or the GUI Packages page.

| Key | Features |
|---|---|
| `brand` | Server icon/banner builder, welcome cards, rank cards |
| `moderation` | Warnings, mutes, bans, audit log |
| `community` | Polls, giveaways, reaction roles, announcements |
| `xp` | XP tracking, leaderboard, level-up messages |
| `scheduler` | Scheduled messages and recurring announcements |
| `integrations` | Twitch/YouTube/GitHub webhook alerts |
| `faith` | Daily devotionals, Bible verse lookup, sermon notes |
| `culinaryos` | Menu, recipe, and inventory bridge to CulinaryOS |

Package state is persisted per-guild in SQLite via `src/utils/packages.js`.

---

## Adding a Slash Command

1. **Create the command file** at `src/commands/<package>/<commandName>.js`

   ```js
   const { SlashCommandBuilder } = require('discord.js');

   module.exports = {
       data: new SlashCommandBuilder()
           .setName('example')
           .setDescription('Does something cool.'),

       package: 'community', // must match a valid package key

       async execute(interaction) {
           await interaction.reply('Hello!');
       },
   };
   ```

2. **Register with Discord** — run `node src/deploy-commands.js` (or use the setup wizard Step 4).

3. **Test** — the command should appear in Discord within a few seconds.

> Commands gated behind a package are automatically skipped if that package is disabled for the guild.

---

## GUI & API Routes

All GUI API endpoints live in `gui/gui-server.js`. Follow these conventions:

- **Always apply a rate limiter** — use `apiLimiter`, `mediaLimiter`, `controlLimiter`, or `setupLimiter` as appropriate.
- **Validate all input** before touching the database or spawning child processes.
- **Return `{ ok: true, … }` on success** and `{ ok: false, error: '...' }` on failure with the appropriate HTTP status code.
- **Log errors** with `console.error('[ROUTE]', err)` so they appear in `/api/logs`.
- **Control endpoints** (`/api/control/*`) must call `requireControlSecret()` first.

### Key endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/status/full` | Combined bot + GUI + ASCILINE health |
| `GET` | `/api/logs` | Last N log lines (merged bot + GUI) |
| `WS` | `/ws/logs` | Real-time log stream |
| `GET/POST` | `/api/packages` | Read/write per-guild package state |
| `POST` | `/api/setup/validate-token` | Validate Discord bot token live |
| `POST` | `/api/setup/save-config` | Persist wizard package + channel selections |
| `POST` | `/api/control/restart` | Graceful process restart |
| `POST` | `/api/control/deploy-commands` | Stream slash command registration output |
| `POST` | `/webhook/trigger` | Inbound automation webhooks (HMAC-verified) |

---

## Setup Wizard

The wizard at `/setup` walks new users through 4 steps:

1. **Credentials** — Discord token + Client ID (validated live via `/api/setup/validate-token`)
2. **Packages** — enable the feature sets you want
3. **Channels & Roles** — map packages to Discord channels/roles (saved via `/api/setup/save-config`)
4. **Deploy Commands** — register slash commands via `/api/control/deploy-commands` with live streaming output

The wizard writes selections to the `setup_wizard` table in SQLite. The bot reads this table on first boot to pre-populate per-guild config.

---

## Style Guide

- **Indentation:** 4 spaces, no tabs.
- **Quotes:** single quotes for strings; template literals for interpolation.
- **Async:** prefer `async`/`await` over `.then()` chains.
- **Database:** use `better-sqlite3` synchronous calls — never mix async DB calls.
- **Error handling:** always wrap route handlers in `try/catch` and return `{ ok: false, error }` rather than letting exceptions bubble.
- **Secrets:** never log token values, never commit `.env`.
- **Comments:** use `// ── Section Name ─────` dividers for major blocks in long files.

---

## Pull Request Checklist

Before opening a PR, confirm:

- [ ] `npm run lint` passes (or there are no new lint errors)
- [ ] `.env` is **not** committed; secrets are in `.env.example` as placeholders
- [ ] Any new slash command has been added to `deploy-commands.js`
- [ ] New API routes have a rate limiter applied
- [ ] New routes return `{ ok, error }` shaped responses
- [ ] `CHANGELOG.md` has an entry under `[Unreleased]`
- [ ] PR description explains *what* changed and *why*

Thank you for contributing to Sigil! 🔮
