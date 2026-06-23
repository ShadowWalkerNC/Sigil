<div align="center">

# ✦ Sigil

**The all-in-one Discord bot platform — built to be forked, owned, and made yours.**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-sigil.up.railway.app-7c3aed?style=for-the-badge&logo=railway)](https://sigil.up.railway.app)
[![Discord](https://img.shields.io/badge/Demo%20Server-Join%20Us-5865F2?style=for-the-badge&logo=discord&logoColor=white)](https://discord.gg/7c89HKrVe)
[![License](https://img.shields.io/badge/License-MIT-22c55e?style=for-the-badge)](LICENSE)
[![Node](https://img.shields.io/badge/Node.js-20%2B-339933?style=for-the-badge&logo=nodedotjs)]()

</div>

---

## What is Sigil?

Sigil is a production-ready Discord bot platform that pairs a full-featured bot with a live web dashboard. It ships with 71+ slash commands, a visual brand builder, a setup wizard, and a developer-friendly CLI — all self-hosted, all open source.

The live URL is both a **marketing site** and a **working demo**. Anyone can browse the GUI, preview features, and use the brand builder live. When you fork the project, that same URL becomes yours — preconfigured, styled, and ready to deploy.

> **Who it's for:** Community managers, developers, content creators, faith communities, gaming servers, nonprofits, small teams, and any server that deserves more than a generic bot.

---

## Live Pages

| Page | URL | Purpose |
|---|---|---|
| **Home** | `/` | Feature overview and bot intro — your marketing landing page |
| **Brand Builder** | `/brand` | Live canvas GUI for icons, banners, palettes |
| **Community Tools** | `/community` | Welcome card previews, reaction roles, giveaway controls |
| **Status Dashboard** | `/status` | Real-time bot health, service heartbeats, live log tail |
| **Packages** | `/packages` | Toggle feature packages per guild from the browser |
| **Setup Wizard** | `/setup` | Step-by-step guided setup for new deployments |
| **Developer Docs** | `/developers` | API reference, webhook config, integration guide |
| **Health Check** | `/health` | JSON endpoint — uptime, version, service status |

---

## Feature Groups

### 🎨 Brand & Identity

Professional server icons, banners, palette cards, event graphics, and name cards — all rendered server-side with node-canvas and returned in seconds. Use the live GUI at `/brand` to preview before running a command.

`/brand` `/icon` `/banner` `/logo` `/palette` `/splash` `/sticker` `/namecard` `/profilecard` `/rolebadge` `/invitecard` `/rankcard` `/servercard` `/welcomecard` `/themepreview` `/texteffect` `/emote` `/resize` `/template` `/announcebanner` `/eventbanner` `/eventrecap`

### 🛡️ Moderation

A complete automod suite with configurable rules, persistent case logging, and mod-log channels. Every threshold is adjustable from the dashboard — no commands needed once it's set up.

`/automod` `/ban` `/kick` `/unban` `/timeout` `/warn` `/history` `/purge` `/slowmode` `/logging` `/modlog` `/ticket` `/compare`

- Anti-spam, anti-links, anti-mentions, anti-caps, bad-words filter
- Per-rule thresholds, bypass roles, allowed domain whitelist
- Persistent case numbers and ticket thread system

### 🎉 Community

The tools that make members feel welcome and keep them engaged.

`/welcome` `/reactionroles` `/giveaway` `/poll` `/bumpreminder` `/autorole` `/starboard` `/rsvp` `/volunteer` `/lfg` `/mood`

- Custom welcome embeds with DM support and live canvas preview
- Reaction role panels with custom button labels and colors
- Timed giveaways, multi-option polls with auto-close, RSVP events
- LFG (looking for group) board and volunteer signup system

### ⭐ XP & Levels

A full XP economy with rank cards, weekly leaderboards, and level-based role rewards.

`/xprank` `/xpleaderboard` `/weeklyleaderboard` `/loyalty` `/levelroles` `/xpadmin`

- Configurable XP rate and cooldown per server
- Weekly XP tracking with automatic Sunday reset
- Level-based auto-role assignment
- Loyalty card generator with member milestone tracking

### 📅 Scheduler & Staff

Shift management, devotionals, sermon posts, and a scheduled content engine.

`/shift` `/myshift` `/callout` `/schedule` `/devotional` `/sermon` `/remind` `/announce` `/embed`

- Staff shift board with automated daily roster posts
- Callout system integrated with Sylvia Ross scheduling API
- API.Bible integration for daily devotional posts
- Scheduled post engine — queue any message, embed, or banner to any channel

### 🔗 Integrations

YouTube upload alerts, Twitch live notifications, webhook triggers, and custom server-specific slash commands.

`/youtube` `/twitch` `/customcmd` `/integrations` `/nowplaying` `/play` `/queue`

- YouTube upload alerts via Data API v3 (polls every 60s)
- Twitch live alerts with rich embeds and viewer counts (polls every 15s)
- Custom slash commands per server — text or embed responses
- Webhook trigger endpoint for external automation (GitHub, Zapier, n8n)
- ASCILINE media queue integration for audio/video streaming

### ⛪ Faith & Devotional

Built-in tools for churches, ministries, and faith-based communities.

`/bible` `/devotional` `/sermon` `/prayer` `/certificate`

- Daily Bible verse posts via API.Bible (400+ translations)
- Morning devotional scheduler — posts automatically every day
- Sermon notes and event recaps with branded embeds
- Member certificate generator for milestones and awards

### 🍳 CulinaryOS Bridge *(in development)*

A first-party Discord integration for **CulinaryOS** — a restaurant management platform currently in development. The bridge connects live menu, recipe, and inventory data directly into your Discord server.

`/menu` `/recipe` `/inventory`

> See [CULINARYOS_BRIDGE.md](CULINARYOS_BRIDGE.md) for architecture details.

---

## Getting Started

### Option 1 — Setup Wizard (Recommended for most users)

Fork the repo, deploy to Railway, then open your live URL and go to `/setup`. The wizard walks you through:

1. Connecting your bot token and client ID
2. Selecting which feature packages to enable
3. Registering slash commands with one click
4. Configuring channels, roles, and API keys per feature

No terminal required for basic setup.

### Option 2 — CLI (Recommended for developers)

```bash
npx sigil setup
```

The interactive CLI detects your environment (Railway, PM2, local) and guides you through setup step by step.

```bash
# Available CLI commands
sigil setup          # Interactive setup wizard
sigil deploy         # Register/update slash commands
sigil status         # Check bot and service health
sigil logs           # Tail live bot logs
sigil restart        # Trigger a graceful restart (requires CONTROL_SECRET)
```

### Option 3 — Manual

```bash
git clone https://github.com/ShadowWalkerNC/Sigil
cd Sigil
npm install
cp .env.example .env    # fill in your values
npm run deploy-commands # register slash commands with Discord
npm start               # bot process
npm run gui             # web dashboard (separate process or combined via PM2)
```

---

## Environment Variables

All variables are documented in [`.env.example`](.env.example). Required ones are needed to start. Everything else unlocks an optional feature.

> ⚠️ **Never commit `.env`** — it is listed in `.gitignore`. Use `.env.example` as your template.

### Core (required)

| Variable | Description |
|---|---|
| `DISCORD_TOKEN` | Bot login token from Discord Developer Portal |
| `CLIENT_ID` | Your Discord application's client ID |
| `GUI_AUTH_TOKEN` | Shared secret for all GUI API access. Generate: `openssl rand -hex 32` |

### GUI Dashboard

| Variable | Description |
|---|---|
| `GUI_URL` | Your public dashboard URL (shown in Discord `/gui open`) |
| `CONTROL_SECRET` | Enables `/api/control/restart` and deploy-commands endpoints |
| `PORT` | HTTP port (default `8080`). Railway sets this automatically. |

### Discord OAuth login (recommended for production)

| Variable | Description |
|---|---|
| `DISCORD_CLIENT_ID` | Your Discord application's client ID (same as `CLIENT_ID`) |
| `DISCORD_CLIENT_SECRET` | OAuth2 secret — Discord Dev Portal → OAuth2 tab |
| `DISCORD_REDIRECT_URI` | Must match exactly: `https://YOUR-DOMAIN/auth/discord/callback` |
| `DISCORD_OAUTH_URL` | Full authorization URL — Discord Dev Portal → OAuth2 → URL Generator (scope: `identify`) |

Without these, `/login` token-entry page is used as a fallback.

### Optional features

| Variable | Unlocks |
|---|---|
| `GEMINI_API_KEY` | `/brand ai` — AI brand generation |
| `YOUTUBE_API_KEY` | YouTube upload alerts |
| `TWITCH_CLIENT_ID` + `TWITCH_CLIENT_SECRET` | Twitch live alerts |
| `BIBLE_API_KEY` | Daily devotionals via API.Bible |
| `STREAM_SERVER_URL` | ASCILINE media queue integration |
| `CULINARYOS_API_URL` + `CULINARYOS_API_KEY` | CulinaryOS bridge |

---

## Deployment

### Railway (one-click, recommended)

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app)

Push to GitHub and Railway auto-deploys via Nixpacks. Set your env vars in the Railway dashboard. No build step needed.

See [`gui/README.md`](gui/README.md) for the full Railway + Discord OAuth setup walkthrough.

### PM2 (self-hosted VPS)

```bash
npm install
npx pm2 start ecosystem.config.js
npx pm2 save
npx pm2 startup
```

The `ecosystem.config.js` starts both the bot process and the GUI server, keeps them alive, and restarts on crash.

### Docker (coming soon)

A `Dockerfile` and `docker-compose.yml` are planned for the next release. Watch the [releases page](https://github.com/ShadowWalkerNC/Sigil/releases) for updates.

---

## NPM Scripts

```bash
npm start              # Start the bot (src/index.js)
npm run dev            # Start the bot with --watch (live reload)
npm run gui            # Start the GUI server (gui/gui-server.js)
npm run gui:dev        # Start GUI with --watch
npm run lint           # ESLint across src/ and gui/
npm run deploy-commands  # Register/refresh slash commands with Discord API
```

---

## Architecture

```
Sigil/
├── src/
│   ├── index.js             # Bot entry — loads commands, events, IPC bridge
│   ├── db.js                # SQLite schema + migrations (runs at boot)
│   ├── commands/            # 71 slash command files
│   ├── events/              # Discord.js event handlers
│   ├── services/            # Background pollers and scheduled runners
│   │   ├── pollers.js       # Twitch (15s) + YouTube (60s) live pollers
│   │   ├── scheduler.js     # Scheduled posts, polls, giveaways, bump reminders
│   │   └── statsRunner.js   # Weekly stats poster (Mon 09:00 UTC)
│   ├── automation/          # Webhook handler (Twitch, YouTube, GitHub triggers)
│   └── util/
│       ├── serviceRegistry.js  # In-process service health tracker
│       └── logBuffer.js        # In-process log ring buffer
├── gui/
│   ├── gui-server.js        # Express server — API + WebSocket + static pages
│   ├── auth.js              # Client-side auth helper — token bootstrap, authFetch()
│   ├── login.html           # Token-entry fallback login page
│   ├── index.html           # Home / marketing landing page
│   ├── sigil-gui-builder.html  # Brand builder live canvas GUI
│   ├── sigil-community.html    # Community tools GUI
│   ├── status.html          # Real-time status dashboard
│   ├── packages.html        # Feature package toggle panel
│   ├── developers.html      # Developer API reference
│   ├── setup.html           # First-time setup wizard
│   └── 404.html
├── data/
│   └── sigil.db             # SQLite database (auto-created, WAL mode)
├── .env.example             # Template — copy to .env and fill in values
├── ecosystem.config.js      # PM2 process config
├── CHANGELOG.md
├── DEPLOY.md
├── CULINARYOS_BRIDGE.md
└── SCHEDULER_INTEGRATION.md
```

**Stack at a glance:**

| Layer | Technology |
|---|---|
| Bot runtime | Discord.js v14, Node.js 20+ |
| Database | SQLite via better-sqlite3 (WAL mode) |
| Web server | Express 4 + native WebSocket (ws) |
| Canvas rendering | node-canvas 2 |
| AI | Google Gemini (`@google/generative-ai`) |
| Hosting | Railway (Nixpacks) / PM2 |
| IPC | SQLite cross-process bridge (bot → GUI server) |

The bot and GUI server run as **separate processes**. They share one SQLite database file. The bot writes heartbeat, service registry, and log rows every 30–60 seconds. The GUI server reads them via a lightweight read-only connection — no in-memory globals, no sockets, no restarts required when either process recycles.

---

## Security

- All `/api/*` and `/preview/*` routes require a valid `GUI_AUTH_TOKEN` (Bearer header or `?token=` query param) enforced by `guiAuthMiddleware`
- `/api/setup/validate-token` and `/api/status/full` are intentionally exempt (pre-auth setup flow and public health reads)
- The `/api/control/bash` endpoint requires a separate `CONTROL_SECRET` header in addition to GUI auth
- Webhook HMAC verification on `/webhook/trigger` via `x-sigil-signature`
- SSRF guard on all user-supplied URLs via `src/utils/ssrfGuard.js`
- Rate limiting on every endpoint group (auth: 10/min, render: 20/min, control: 5/min)
- `.env` is git-ignored — **never commit real secrets**; use `.env.example` as the template

---

## Who Uses This

**Gaming communities** — XP systems, LFG boards, reaction roles, Twitch/YouTube alerts. Everything to keep an active community engaged.

**Faith-based servers** — Daily devotionals, Bible verses (400+ translations), sermon posts, prayer channels, volunteer signups, and member certificates.

**Content creators** — YouTube upload alerts, Twitch live notifications, branded announcement embeds, and scheduled posts.

**Small teams and organizations** — Staff shift boards, callout tracking, scheduled content, internal tooling via custom slash commands.

**Developers forking the project** — A production-quality Discord bot starter with a full GUI, CLI, setup wizard, SQLite IPC, service health monitoring, webhook API, and PM2 config. Skip the boilerplate and build what matters.

---

## Developer Guide

### Adding a Command

1. Create `src/commands/yourcommand.js` following the pattern in any existing file.
2. Export `{ data, execute }` where `data` is a `SlashCommandBuilder`.
3. Run `npm run deploy-commands` to register it with Discord.

### Adding a Background Service

1. Create your service file and call `registry.register('your-service', { interval, description })`.
2. Call `registry.heartbeat('your-service')` after each successful tick.
3. Call `registry.setError('your-service', err)` on failure.
4. Import and start it from `src/index.js` inside the `clientReady` handler.

The service will automatically appear on the `/status` dashboard and in the SQLite `service_registry` table within 60 seconds.

### REST & WebSocket API

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/api/status/full` | GET | None | Aggregated health — bot, GUI, services, last error |
| `/api/logs` | GET | ✅ | Merged bot + GUI log tail (`?tail=50&level=error`) |
| `/api/packages` | GET / POST | ✅ | Read or toggle feature packages per guild |
| `/api/media/*` | GET / POST | ✅ | ASCILINE media queue proxy |
| `/api/control/restart` | POST | ✅ + control secret | Graceful restart |
| `/api/control/bash` | POST | ✅ + control secret | Run shell command (Railway terminal) |
| `/webhook/trigger` | POST | HMAC | External event trigger (Twitch, YouTube, GitHub) |
| `/health` | GET | None | Simple uptime + version check |
| `/ws/logs` | WebSocket | token param | Live log stream (`?token=&level=error`) |

All endpoints are rate-limited. See [`gui/README.md`](gui/README.md) for the full API reference and rate limit table.

### Packages System

Features are grouped into packages that can be toggled per guild from the `/packages` page or via `POST /api/packages`. Disabling a package prevents its commands from executing without removing them from Discord's command list — no re-registration needed.

---

## Contributing

PRs are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on new commands, GUI panels, and integration connectors.

Key areas for contribution:
- Docker + docker-compose setup
- Additional webhook integrations (Patreon, Ko-fi, GitHub Actions)
- Dashboard theming and mobile responsiveness improvements
- Unit and integration tests

---

## License

MIT — see [LICENSE](LICENSE). Fork it, own it, ship it.

---

<div align="center">

🌐 [sigil.up.railway.app](https://sigil.up.railway.app) &nbsp;·&nbsp; 💬 [Discord](https://discord.gg/7c89HKrVe) &nbsp;·&nbsp; ⭐ Star the repo if it saves you time

</div>
