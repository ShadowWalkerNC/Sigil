# ⚡ Sigil

> A powerful, self-hosted Discord bot for **any community** — gaming, churches, restaurants, creators, schools, and more. Built on discord.js v14 with canvas graphics, AI branding, XP engagement, moderation, and real-time alerts.

---

## 🎯 Who Is Sigil For?

Sigil is designed to work out of the box for **non-technical communities** and power users alike. Whether you’re running a gaming clan, a church congregation, a restaurant staff server, or a content creator’s fanbase — Sigil handles the repetitive admin work so you can focus on your community.

| Community | How Sigil Helps |
|---|---|
| 🎮 **Gaming / Xbox** | LFG posts, session scheduling, XP leaderboards, Twitch/YouTube alerts |
| ⛪ **Churches** | Service announcements, prayer requests, volunteer sign-ups, devotionals, event RSVPs |
| 🍽️ **Restaurants / Hospitality** | Staff shift coordination, daily specials, customer announcements, ticket-based support |
| 🎥 **Content Creators** | Live alerts, upload notifications, fan engagement XP, subscriber role rewards |
| 🏫 **Schools / Study Groups** | Assignment reminders, study session scheduling, leaderboards, resource sharing |
| 💼 **Small Businesses** | Customer support tickets, product drops, appointment reminders, announcements |

---

## ✅ Current Features

| Module | Description |
|---|---|
| 🎉 Welcome / Goodbye | Canvas-rendered cards on member join/leave |
| 🔨 Moderation | Ban, kick, warn, mute, mod log, case history |
| ⭐ XP & Leveling | Per-message XP, level-up cards, lifetime leaderboard, weekly XP tracking |
| 🎨 Branding & Graphics | Canvas-generated banners, logos, profile cards, rank cards, palettes, AI brand kits |
| 🟣 Twitch Alerts | Auto live alerts when tracked streamers go live |
| 📥 YouTube Alerts | Upload alerts via RSS or YouTube Data API v3 |
| 🗓️ Scheduled Posts | Schedule text or embed messages for any future time |
| 📊 Weekly Stats | Auto Monday 09:00 UTC server health report |
| 📌 Event Banners | Teaser, live, and recap embeds for Discord Scheduled Events |
| 🎫 Polls & Giveaways | Timed polls with live vote tracking; button-based giveaways with auto draw |
| 🎫 Reaction Roles | Button-based role panels with unlimited roles per panel |
| 🎫 Tickets | Private thread-based support tickets with log channel and close reason |
| 🤖 Automod | Anti-spam, anti-links, anti-caps, mention flood, bad word filter, bypass roles |
| ⭐ Starboard | Auto-pin highly-reacted messages to a dedicated channel |
| 💤 Bump Reminders | Auto-remind your server to bump on DISBOARD every 2 hours |
| 🔗 Integrations | Twitch + YouTube status dashboard, webhook support |
| 🎨 GUI Brand Builder | Visual web interface for designing server brand kits |
| 🤖 AI (Gemini) | AI-powered brand kits, name suggestions, descriptions, and graphics |

---

## 🚧 Roadmap

Features planned in priority order, designed for all community types:

### Tier 1 — In Progress
| Feature | Serves | Notes |
|---|---|---|
| `/weeklyleaderboard` | All | DB + reset cron already live; command pending |
| `/announce` | All | Formatted embed with role ping, one command |
| `/rsvp` | Churches, restaurants, gaming | Button-based yes/no/maybe with headcount + reminder |

### Tier 2 — Planned
| Feature | Serves | Notes |
|---|---|---|
| `/lfg` | Gaming | Looking For Group post, auto-expires, platform tags |
| `/prayerrequest` | Churches | Posts to prayer wall, optional DM to pastor/prayer team |
| `/volunteer` | Churches, restaurants | Sign-up slots, coordinator summary, DM confirmation |
| `/shift` | Restaurants, church staff | Clock in/out tracking with log channel |
| `/devotional` | Churches | Daily verse via Bible API, auto-scheduled morning post |
| `/xp set` | All | Admin override for XP (mod tool) |
| `/warnings` | All | Quick mod case summary per user |

### Tier 3 — Future
| Feature | Serves | Notes |
|---|---|---|
| Ticket transcripts | All | Save thread to log channel on close |
| `/remindme` | All | Personal DM reminder |
| Inbound webhook handler | Creators, businesses | Read `webhook_channel` + `webhook_secret` (columns exist) |
| Voice XP | Gaming, all | XP for time in voice (`voiceStateUpdate` already loaded) |

---

## 🛠️ Requirements

- **Node.js** v18 or higher
- **npm** packages: `discord.js`, `better-sqlite3`, `@napi-rs/canvas`, `dotenv`
- A Discord bot application with the following **Privileged Intents** enabled in the [Developer Portal](https://discord.com/developers/applications):
  - `SERVER MEMBERS INTENT`
  - `MESSAGE CONTENT INTENT`
  - `PRESENCE INTENT`

---

## 🚀 Installation

```bash
# 1. Clone the repo
git clone https://github.com/ShadowWalkerNC/Sigil.git
cd Sigil

# 2. Install dependencies
npm install

# 3. Copy and fill in environment variables
cp .env.example .env

# 4. Deploy slash commands to Discord
node src/deploy-commands.js

# 5. Start the bot
node src/index.js
```

---

## 🔐 .env Reference

```env
# Required
DISCORD_TOKEN=your_bot_token
CLIENT_ID=your_application_client_id
GUILD_ID=your_server_id

# Twitch live alerts (required for /twitch commands)
TWITCH_CLIENT_ID=your_twitch_client_id
TWITCH_CLIENT_SECRET=your_twitch_client_secret

# YouTube upload alerts (optional — RSS fallback works without it)
YOUTUBE_API_KEY=your_youtube_api_key

# Gemini AI (optional — enables AI brand kit, name suggestions, etc.)
GEMINI_API_KEY=your_gemini_api_key

# GUI brand builder (optional — defaults to localhost:3420)
GUI_URL=http://localhost:3420
```

---

## 📜 Command Reference

### ⚙️ Configuration
| Command | Description |
|---|---|
| `/sigilconfig welcome` | Configure welcome cards (channel, color, background, font) |
| `/sigilconfig goodbye` | Configure goodbye cards |
| `/sigilconfig boost` | Configure boost alert channel |
| `/sigilconfig milestone` | Configure member milestone alert channel |
| `/sigilconfig stats` | Set weekly stats report channel |
| `/sigilconfig event_banner` | Enable/disable event banner channel |
| `/sigilconfig xp` | Configure XP system (enable, channel, rate, cooldown) |
| `/sigilconfig status` | View all current settings for this server |

### 🔨 Moderation
| Command | Description |
|---|---|
| `/ban` | Ban a member with reason |
| `/kick` | Kick a member with reason |
| `/warn` | Warn a member (logged to case history) |
| `/mute` | Timeout a member for a duration |
| `/history` | View a member’s full mod case history |
| `/modlog` | Configure the mod log channel |

### ⭐ XP & Leveling
| Command | Description |
|---|---|
| `/xprank [user]` | View canvas XP rank card for yourself or another user |
| `/xpleaderboard` | View top 10 lifetime XP leaderboard |
| `/weeklyleaderboard` | View top XP earners this week *(coming soon)* |
| `/xpadmin give/set/setlevel/reset` | Admin XP management tools |

### 🎨 Branding & Graphics
| Command | Description |
|---|---|
| `/announcebanner` | Generate a canvas announcement banner |
| `/avatar` | View and download a user’s avatar in multiple formats |
| `/banner` | Generate a custom canvas server banner |
| `/brand` | Full brand kit generator (logo, colors, fonts, AI-powered) |
| `/certificate` | Generate a canvas achievement/award certificate |
| `/compare` | Compare two users’ avatars or profiles side by side |
| `/emote` | Create or resize custom emote images |
| `/eventbanner` | Generate a canvas event banner image |
| `/icon` | Generate a server or user icon graphic |
| `/invitecard` | Generate a custom canvas invite card |
| `/logo` | Generate a server logo graphic |
| `/mood` | Generate a mood board or color palette card |
| `/namecard` | Generate a canvas name/business card |
| `/palette` | Extract and display a color palette from an image |
| `/profilecard` | Generate a canvas profile card |
| `/rankcard` | Generate a custom canvas rank card |
| `/reactionpack` | Generate a set of reaction images |
| `/resize` | Resize an image to custom dimensions |
| `/rolebadge` | Generate a canvas role badge graphic |
| `/servercard` | Generate a canvas server info card |
| `/splash` | Generate a server splash/welcome screen graphic |
| `/sticker` | Create a custom sticker image |
| `/template` | Apply a canvas template to an image |
| `/texteffect` | Apply text effects (glow, shadow, gradient, etc.) |
| `/themepreview` | Preview a color theme across multiple card styles |
| `/welcomecard` | Preview or generate a welcome card manually |

### 🟣 Twitch
| Command | Description |
|---|---|
| `/twitch add` | Subscribe to a Twitch streamer’s live alerts |
| `/twitch remove` | Remove a Twitch alert subscription |
| `/twitch list` | List all tracked Twitch streamers |

### 📥 YouTube
| Command | Description |
|---|---|
| `/youtube add` | Subscribe to a YouTube channel’s upload alerts |
| `/youtube remove` | Remove a YouTube alert subscription |
| `/youtube list` | List all tracked YouTube channels |

### 🗓️ Scheduled Posts
| Command | Description |
|---|---|
| `/schedule post` | Schedule a plain text or embed message |
| `/schedule list` | View all pending scheduled posts (paginated) |
| `/schedule cancel` | Cancel a pending scheduled post by ID |

### 🎫 Polls & Giveaways
| Command | Description |
|---|---|
| `/poll create` | Create a timed poll with up to 10 options |
| `/poll end` | Manually close a poll and show results |
| `/giveaway start` | Start a button-entry giveaway with auto draw |
| `/giveaway end` | Manually end a giveaway early |
| `/giveaway reroll` | Reroll winners for a completed giveaway |

### 🎫 Reaction Roles
| Command | Description |
|---|---|
| `/reactionrole create` | Create a new role panel with buttons |
| `/reactionrole add` | Add a role button to an existing panel |
| `/reactionrole remove` | Remove a role button from a panel |
| `/reactionrole post` | Post a panel to a channel |
| `/reactionrole delete` | Delete a panel entirely |

### 🎫 Tickets
| Command | Description |
|---|---|
| `/ticket open` | Open a support ticket (private thread) |
| `/ticket close` | Close a ticket with reason |
| `/ticket list` | List open tickets for this server |
| `/sigilconfig ticket` | Configure ticket category, support role, and log channel |

### 🤖 Automod
| Command | Description |
|---|---|
| `/automod` | Configure anti-spam, anti-links, anti-caps, mention flood, bad words |

### ⭐ Starboard
| Command | Description |
|---|---|
| `/sigilconfig starboard` | Configure starboard channel, threshold, and emoji |

### 💤 Bump Reminders
| Command | Description |
|---|---|
| `/sigilconfig bump` | Configure DISBOARD bump reminder channel and message |

### 📊 Stats & Events
| Command | Description |
|---|---|
| `/stats` | Post the weekly server stats report on demand |
| `/eventrecap` | Manually post a teaser, live banner, or recap for an event |
| `/serverstats` | View live server statistics |

### 🔗 Utilities & Integrations
| Command | Description |
|---|---|
| `/ping` | Check bot latency and API response time |
| `/status` | View bot status and uptime |
| `/gui open` | Get the link to the visual brand builder GUI |
| `/gui status` | Check if the GUI server is online |
| `/integrations status` | View active Twitch and YouTube subscriptions |
| `/saveme` | DM yourself a copy of your server’s config |
| `/help` | Full interactive help menu |

---

## 🕒 Scheduling Time Formats

`/schedule post` accepts natural time strings for the `when` parameter:

| Format | Example |
|---|---|
| Relative | `in 2 hours`, `in 30 minutes`, `in 1 day` |
| Named | `tomorrow 9am`, `tomorrow 14:30` |
| Time today | `3pm`, `15:00` |
| ISO-style | `2026-06-20 15:00` |

---

## ⭐ XP Formula

Level `n` requires `5n² + 50n + 100` XP to reach.

| Level | XP Required |
|---|---|
| 1 | 155 |
| 5 | 475 |
| 10 | 1,100 |
| 20 | 3,100 |

Default rate: ~15 XP/message with slight variance, 60s cooldown per user.  
`weekly_xp` resets every Sunday at 00:00 UTC automatically.

---

## 🏗️ Architecture

```
Sigil/
├── src/
│   ├── commands/          # All slash command handlers (50+ commands)
│   ├── events/            # Discord gateway event handlers
│   ├── services/          # Background runners
│   │   ├── pollers.js     # Twitch (15s) + YouTube (60s) polling
│   │   ├── scheduler.js   # Scheduled posts (60s) + weekly XP reset (Sunday 00:00 UTC)
│   │   ├── statsRunner.js # Weekly stats runner (5min check)
│   │   ├── twitch.js      # Twitch API helpers
│   │   └── youtube.js     # YouTube API + RSS helpers
│   ├── utils/
│   │   ├── db.js          # SQLite wrapper (better-sqlite3)
│   │   ├── xp.js          # XP formula helpers
│   │   ├── canvas.js      # Shared canvas render utilities
│   │   ├── gemini.js      # Gemini AI helpers (503 retry, JSON extraction)
│   │   ├── backgrounds.js # Canvas background registry
│   │   ├── borders.js     # Canvas border registry
│   │   └── fonts.js       # Font registration + family list
│   ├── fonts/             # Custom fonts for canvas rendering
│   ├── images/            # Static assets for canvas cards
│   ├── deploy-commands.js # Slash command registration script
│   └── index.js           # Bot entry point
├── data/
│   └── sigil.db           # SQLite database (auto-created on first run)
├── .env                   # Environment variables (never commit this)
├── .env.example           # Environment variable template
├── LICENSE
└── package.json
```

---

## ⏱️ Background Services

| Service | Interval | Purpose |
|---|---|---|
| Twitch Poller | 15 seconds | Check tracked streamers for live status |
| YouTube Poller | 60 seconds | Check tracked channels for new uploads |
| Scheduler | 60 seconds | Flush and send due scheduled posts; close expired polls and giveaways; bump reminders |
| Stats Runner | 5 minutes | Check if it’s Monday 09:00 UTC and post weekly report |
| Weekly XP Reset | Sunday 00:00 UTC | Reset `weekly_xp` for all guilds; self-schedules recursively |

---

## 📄 License

MIT — see [LICENSE](LICENSE)
