# Sigil — Discord Bot + Visual Dashboard

> **Brand. Moderate. Automate. All from a graphical dashboard.**

Sigil is a full-featured, open-source Discord bot paired with a live web GUI. Configure everything — moderation rules, welcome messages, XP settings, brand kits, integrations — through a clean visual interface. Slash commands are always available but never required.

🌐 **Dashboard:** [sigil-production-f8d3.up.railway.app](https://sigil-production-f8d3.up.railway.app)
📖 **Demo Server:** [discord.gg/7c89HKrVe](https://discord.gg/7c89HKrVe)

---

## Feature Groups

### 🎨 Brand & Identity
Generate professional server icons, banners, and palette cards. Use AI (Gemini) to design a full brand kit from a sentence description, or build manually with live canvas preview.

`/brand kit` `/brand ai` `/brand share` `/icon` `/banner` `/announce` `/embed`

### 🛡️ Moderation
Full automod suite + manual actions + persistent case logging. Every threshold is configurable from the dashboard — no commands needed.

`/automod` `/ban` `/history` `/ticket` `/compare`

- Anti-spam, anti-links, anti-mentions, anti-caps, bad-words filter
- Per-rule thresholds, bypass role, allowed domains whitelist
- Mod-log channel, persistent case numbers, ticket threads

### 🎉 Community
Everything that makes members feel at home.

`/welcome` `/reactionroles` `/giveaway` `/poll` `/bumpreminder` `/autorole` `/starboard`

- Custom welcome embeds with DM support and live dashboard preview
- Reaction role panels with custom button labels and colors
- Timed giveaways, multi-option polls, starboard, bump reminders

### ⭐ XP & Levels
Full XP economy with rank cards, leaderboards, and level-based role rewards.

`/xprank` `/xpleaderboard` `/loyalty` `/levelroles`

- Configurable XP rate + cooldown per server
- Weekly XP tracking with Sunday reset
- Level-based auto-role assignment

### 📅 Scheduler & Staff
Shift management, devotionals, sermon posts, and scheduled content.

`/shift` `/myshift` `/callout` `/schedule` `/devotional` `/sermon`

- Staff shift board with daily automated roster
- Callout system integrated with Sylvia Ross scheduling
- API.Bible integration for daily devotional posts
- Scheduled post engine — queue any message to any channel

### 🔗 Integrations
YouTube upload alerts, Twitch live notifications, and custom server-specific slash commands.

`/youtube` `/twitch` `/customcmd` `/integrations`

- YouTube upload alerts — polls every 15 min via Data API v3
- Twitch live notifications
- Custom slash commands per server with text or embed responses

### 🍻 CulinaryOS Bridge *(in development)*

A dedicated Discord integration for **CulinaryOS** — a separate personal restaurant management platform currently in development. The bridge connects CulinaryOS data to Discord channels, enabling menu posts, recipe lookups, inventory views, and automated low-stock alerts.

`/menu` `/recipe` `/inventory` `/lowstock` `/culinaryos`

- Built as a first-party bridge, not a generic third-party integration
- Syncs menus, recipes, and inventory from CulinaryOS directly into Discord
- Automatic low-stock webhook alerts to a designated channel
- Designed to evolve alongside the CulinaryOS platform

> See [CULINARYOS_BRIDGE.md](CULINARYOS_BRIDGE.md) for full architecture and setup details.

---

## Quick Start

### Deploy to Railway (Recommended)

```bash
git clone https://github.com/ShadowWalkerNC/Sigil
cd Sigil
```

Set these environment variables in Railway:

| Variable | Required | Description |
|---|---|---|
| `DISCORD_TOKEN` | ✅ | Bot token from Discord Developer Portal |
| `CLIENT_ID` | ✅ | Bot application ID |
| `GUI_URL` | ✅ | Your Railway public URL (e.g. `https://yourapp.up.railway.app`) |
| `GEMINI_API_KEY` | Optional | Enables `/brand ai` and AI features |
| `YOUTUBE_API_KEY` | Optional | Enables YouTube upload poller |
| `TWITCH_CLIENT_ID` | Optional | Enables Twitch live alerts |
| `TWITCH_CLIENT_SECRET` | Optional | Enables Twitch live alerts |
| `BIBLE_API_KEY` | Optional | Enables API.Bible devotional verse fetch |
| `CULINARYOS_API_URL` | Optional | CulinaryOS backend URL for the bridge |

Push to GitHub → Railway auto-deploys via Nixpacks.

### Register Slash Commands

Run once after deploy (from Railway shell or locally):

```bash
node src/deploy-commands.js
```

### Self-Host with PM2

```bash
npm install
cp .env.example .env   # fill in your values
npm run deploy-commands
npx pm2 start ecosystem.config.js
```

---

## Project Structure

```
Sigil/
├── src/
│   ├── commands/        # 82+ slash command files
│   ├── events/          # Discord event handlers
│   ├── automation/      # Pollers: YouTube, Twitch, devotional, shifts
│   ├── utils/           # DB, canvas, Gemini, history helpers
│   └── index.js         # Bot entry point
├── gui/
│   ├── index.html               # Landing page
│   ├── sigil-gui-builder.html   # Brand builder GUI
│   ├── sigil-community.html     # Community tools GUI
│   ├── developers.html          # Developer docs
│   └── gui-server.js            # Express web server
├── data/               # SQLite database (auto-created)
├── .env.example        # All supported env vars documented
├── ecosystem.config.js # PM2 config for self-hosting
├── DEPLOY.md
├── CULINARYOS_BRIDGE.md
└── SCHEDULER_INTEGRATION.md
```

---

## Architecture

- **Bot:** Discord.js v14, SQLite via better-sqlite3
- **Web GUI:** Express static server serving plain HTML/CSS/JS
- **Canvas rendering:** node-canvas for icons, banners, rank cards
- **AI:** Google Gemini (text + image generation)
- **Hosting:** Railway (Nixpacks), PM2-compatible for self-hosting

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). PRs welcome for new commands, GUI panels, or integration connectors.

## License

MIT — see [LICENSE](LICENSE).
