# ⚡ Sigil

> A powerful, self-hosted Discord bot built for **any community** — gaming clans, churches, restaurants, content creators, schools, and small businesses. Built on discord.js v14 with canvas graphics, AI branding, XP engagement, full moderation, real-time alerts, and smart automation.

---

## 🎯 Who Is Sigil For?

Sigil is designed so that **non-technical admins** can run a fully-featured server without touching config files. A pastor, restaurant manager, or gaming clan leader should be able to type one command and have it work beautifully.

| Community | How Sigil Helps |
|---|---|
| 🎮 **Gaming / Xbox / Console** | LFG posts, session scheduling, XP leaderboards, Twitch/YouTube live alerts, weekly top-player boards |
| ⛪ **Churches** | Service announcements, prayer requests, volunteer sign-ups, devotionals, event RSVPs, onboarding new visitors |
| 🍽️ **Restaurants / Hospitality** | Staff shift coordination, daily specials, customer announcements, ticket-based support, loyalty engagement via XP |
| 🎥 **Content Creators / Streamers** | Twitch/YouTube live & upload alerts, fan engagement XP, milestone rewards, subscriber role perks |
| 🎓 **Schools / Study Groups** | Assignment reminders, study session scheduling, resource sharing, leaderboards |
| 💼 **Small Businesses** | Customer support tickets, product drops, appointment reminders, branded announcements |

**The Discord advantage:** Slash commands, buttons, and embeds mean your community interacts through a polished interface — no app to download, no website to manage.

---

## ✅ Current Features

| Module | Description |
|---|---|
| 🎉 Welcome / Goodbye | Canvas-rendered branded cards on member join and leave |
| 🚀 Boost Alerts | Auto-post a thank-you embed when a member boosts the server |
| 🏆 Member Milestones | Auto-celebrate when the server hits member count milestones |
| 🔨 Moderation | Ban, kick, warn, timeout, unban, purge, slowmode, mod log, case history |
| ⭐ XP & Leveling | Per-message XP, level-up canvas cards, lifetime leaderboard, weekly XP tracking with Sunday reset, level auto-roles |
| 🎨 Branding & Graphics | Canvas-generated banners, logos, rank cards, profile cards, certificates, palettes, mood boards, stickers, and more — plus AI-powered brand kits via Gemini |
| 🟣 Twitch Alerts | Auto live alerts when tracked streamers go live, per-guild subscriptions |
| 📥 YouTube Alerts | Upload alerts via YouTube Data API v3 or RSS fallback |
| 🗓️ Scheduled Posts | Schedule text or rich embed messages to any channel at any future time |
| 📊 Weekly Stats | Auto Monday 09:00 UTC server health report with member, message, and channel stats |
| 📌 Event Banners | Teaser, live, and recap embeds auto-posted for Discord Scheduled Events |
| 📋 Polls | Timed polls with up to 10 options, live vote counts, and auto-close |
| 🎁 Giveaways | Button-entry giveaways with auto draw, reroll, and early-end |
| 🎛️ Reaction Roles | Button-based role panels — unlimited roles, post anywhere |
| 🎟️ Tickets | Private thread-based support tickets with support-role access, log channel, and close reason |
| 🤖 Automod | Anti-spam, anti-links, anti-caps, mention flood protection, bad word filter, bypass roles |
| ⭐ Starboard | Auto-pin highly-reacted messages to a dedicated starboard channel |
| 💤 Bump Reminders | Remind your server to bump on DISBOARD every 2 hours after the last bump |
| 🔧 Custom Commands | Create custom slash-triggered text or embed responses, with template variables and optional embed colors |
| 🎭 Auto Roles | Automatically assign roles when a member joins |
| 🏅 Level Roles | Automatically assign roles when a member reaches an XP level threshold |
| 📋 Server Logging | Log message edits, deletions, member joins/leaves, and more to a dedicated log channel |
| 🌐 Webhook Automation | Inbound webhook handler for external service integrations |
| 🎨 GUI Brand Builder | Visual web interface for designing server brand kits — accessible via `/gui open` |
| 🤖 AI (Gemini) | AI-powered brand kits, server name suggestions, descriptions, and graphic generation |

---

## 🚧 Roadmap

Building smart — focused on what real communities actually use.

### Tier 1 — Next Up
| Feature | Serves | Status |
|---|---|---|
| `/weeklyleaderboard` | All | DB + weekly reset cron live — command pending |
| `/announce` | All | Formatted embed with role ping targeting |
| `/rsvp` | Churches, restaurants, gaming | Button-based yes/no/maybe with headcount + 24h reminder |

### Tier 2 — Planned
| Feature | Serves | Notes |
|---|---|---|
| `/lfg` | Gaming (Xbox, PC, console) | Looking For Group post with game, mode, platform, player count; auto-expires |
| `/prayerrequest` | Churches | Posts to `#prayer-wall`; optional DM to pastor/prayer team; 🙏 reaction counter |
| `/volunteer` | Churches, restaurants | Sign-up slots, open slot list, coordinator summary, DM confirmation |
| `/shift` | Restaurants, church staff | Staff clock-in/out tracking with log channel |
| `/devotional` | Churches | Daily verse via Bible API, auto-scheduled morning post to `#devotional` |
| `/xpadmin set` | All | Admin XP override tool |
| `/warnings` | All | Quick mod case summary per user |

### Tier 3 — Future
| Feature | Serves | Notes |
|---|---|---|
| Ticket transcripts | All | Save thread content to log channel on ticket close |
| `/remindme` | All | Personal DM reminder |
| Voice XP | Gaming, all | XP for time spent in voice channels (`voiceStateUpdate` already wired) |
| Onboarding flow | All | DM new members welcome + rules summary automatically |

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

# Gemini AI (optional — enables AI brand kit, name suggestions, graphics)
GEMINI_API_KEY=your_gemini_api_key

# GUI brand builder (optional — defaults to http://localhost:3420)
GUI_URL=http://localhost:3420
PORT=3420
```

---

## 📜 Command Reference

### ⚙️ Configuration (`/sigilconfig`)
| Command | Description |
|---|---|
| `/sigilconfig welcome` | Configure welcome cards (channel, color, background, font) |
| `/sigilconfig goodbye` | Configure goodbye cards |
| `/sigilconfig boost` | Configure boost alert channel |
| `/sigilconfig milestone` | Configure member milestone alert channel |
| `/sigilconfig stats` | Set weekly stats report channel |
| `/sigilconfig event_banner` | Enable/disable auto event banner posting |
| `/sigilconfig xp` | Configure XP system (enable/disable, channel, rate, cooldown) |
| `/sigilconfig ticket` | Configure ticket category, support role, and log channel |
| `/sigilconfig starboard` | Configure starboard channel, threshold, and emoji |
| `/sigilconfig bump` | Configure DISBOARD bump reminder channel and custom message |
| `/sigilconfig status` | View all current settings for this server |

### 🔨 Moderation
| Command | Description |
|---|---|
| `/ban` | Ban a member with reason |
| `/kick` | Kick a member with reason |
| `/warn` | Warn a member (logged to case history) |
| `/timeout` | Timeout (mute) a member for a set duration |
| `/unban` | Unban a previously banned user |
| `/purge` | Bulk-delete messages from a channel |
| `/slowmode` | Set or clear slowmode on a channel |
| `/history` | View a member's full mod case history |
| `/modlog` | Configure the mod log channel |
| `/userinfo` | View detailed info about a member |

### 🤖 Automod
| Command | Description |
|---|---|
| `/automod` | Configure anti-spam, anti-links, anti-caps, mention flood, bad word filter, and bypass roles |

### ⭐ XP & Leveling
| Command | Description |
|---|---|
| `/xprank [user]` | View canvas XP rank card for yourself or another user |
| `/xpleaderboard` | View top 10 lifetime XP leaderboard canvas card |
| `/weeklyleaderboard` | View top XP earners this week *(coming soon)* |
| `/xpadmin give/set/setlevel/reset` | Admin XP management tools |
| `/levelroles add/remove/list` | Assign roles to be auto-given at XP level thresholds |

### 🎭 Roles
| Command | Description |
|---|---|
| `/autorole add/remove/list` | Auto-assign roles to new members on join |
| `/reactionroles create/add/remove/post/delete` | Button-based self-assign role panels |

### 🎨 Branding & Graphics
| Command | Description |
|---|---|
| `/announcebanner` | Generate a canvas announcement banner |
| `/avatar` | View and download a user's avatar in full resolution |
| `/banner` | Generate a custom canvas server banner |
| `/brand` | Full brand kit generator (logo, colors, fonts, AI-powered) |
| `/certificate` | Generate a canvas achievement or award certificate |
| `/compare` | Compare two users' avatars or profiles side by side |
| `/emote` | Create or resize custom emote images |
| `/eventbanner` | Generate a canvas event banner image |
| `/icon` | Generate a server or user icon graphic |
| `/invitecard` | Generate a custom canvas invite card |
| `/logo` | Generate a server logo graphic |
| `/mood` | Generate a mood board or color palette card |
| `/namecard` | Generate a canvas name or business card |
| `/palette` | Extract and display a color palette from an image |
| `/profilecard` | Generate a canvas profile card |
| `/rankcard` | Generate a custom canvas rank card |
| `/reactionpack` | Generate a set of reaction images |
| `/resize` | Resize an image to custom dimensions |
| `/rolebadge` | Generate a canvas role badge graphic |
| `/servercard` | Generate a canvas server info card |
| `/splash` | Generate a server splash or welcome screen graphic |
| `/sticker` | Create a custom sticker image |
| `/template` | Apply a canvas template to an image |
| `/texteffect` | Apply text effects: glow, shadow, gradient, outline |
| `/themepreview` | Preview a color theme across multiple card styles |
| `/welcomecard` | Preview or generate a welcome card manually |

### 🟣 Twitch
| Command | Description |
|---|---|
| `/twitch add` | Subscribe to a Twitch streamer's live alerts |
| `/twitch remove` | Remove a Twitch alert subscription |
| `/twitch list` | List all tracked Twitch streamers for this server |

### 📥 YouTube
| Command | Description |
|---|---|
| `/youtube add` | Subscribe to a YouTube channel's upload alerts |
| `/youtube remove` | Remove a YouTube alert subscription |
| `/youtube list` | List all tracked YouTube channels for this server |

### 🗓️ Scheduled Posts
| Command | Description |
|---|---|
| `/schedule post` | Schedule a plain text or rich embed message for any future time |
| `/schedule list` | View all pending scheduled posts (paginated) |
| `/schedule cancel` | Cancel a pending scheduled post by ID |

### 📋 Polls
| Command | Description |
|---|---|
| `/poll create` | Create a timed poll with up to 10 options |
| `/poll end` | Manually close a poll early and display results |

### 🎁 Giveaways
| Command | Description |
|---|---|
| `/giveaway start` | Start a button-entry giveaway with auto draw at end time |
| `/giveaway end` | Manually end a giveaway early and draw winners |
| `/giveaway reroll` | Reroll winners for a completed giveaway |

### 🎟️ Tickets
| Command | Description |
|---|---|
| `/ticket open` | Open a private support ticket thread |
| `/ticket close` | Close a ticket with optional reason |
| `/ticket list` | List all open tickets for this server |

### ⭐ Starboard
| Command | Description |
|---|---|
| `/starboard` | Configure the starboard — channel, threshold, and emoji |

### 💤 Bump Reminders
| Command | Description |
|---|---|
| `/bumpreminder` | Configure or test the DISBOARD bump reminder system |

### 🔧 Custom Commands
| Command | Description |
|---|---|
| `/customcmd create` | Create a custom command with text or embed response |
| `/customcmd edit` | Edit an existing custom command |
| `/customcmd delete` | Delete a custom command |
| `/customcmd list` | List all custom commands for this server |

### 📋 Logging
| Command | Description |
|---|---|
| `/logging set` | Set the server log channel for message edits, deletes, joins, and more |
| `/logging disable` | Disable server logging |

### 📊 Stats & Events
| Command | Description |
|---|---|
| `/stats` | Post the weekly server stats report on demand |
| `/serverinfo` | View detailed information about this server |
| `/serverstats` | View live server statistics embed |
| `/eventrecap` | Manually post a teaser, live banner, or recap for a Discord event |

### 🎨 GUI Brand Builder
| Command | Description |
|---|---|
| `/gui open` | Get the direct link to the Sigil Visual Brand Builder web interface |
| `/gui status` | Check if the GUI server is currently online |

### 🔗 Utilities & Integrations
| Command | Description |
|---|---|
| `/ping` | Check bot latency and Discord API response time |
| `/status` | View bot uptime, version, and service status |
| `/integrations status` | View active Twitch and YouTube subscriptions for this server |
| `/saveme` | DM yourself a full copy of this server's Sigil config |
| `/help` | Interactive help menu — browse all commands by category |

---

## 🔄 Automation Layer

Sigil uses a dedicated `src/automation/` layer for event-driven background tasks — separate from scheduled services:

| Handler | Trigger | Purpose |
|---|---|---|
| `welcomeHandler` | Member join | Renders and posts canvas welcome card |
| `goodbyeHandler` | Member leave | Renders and posts canvas goodbye card |
| `boostHandler` | Server boost | Posts boost thank-you embed |
| `milestoneHandler` | Member count | Posts milestone celebration embed |
| `eventBannerHandler` | Event scheduled/started | Posts teaser or live banner |
| `eventRecapHandler` | Event ended | Posts recap embed |
| `webhookHandler` | Inbound HTTP webhook | Routes external payloads to configured channels |
| `twitchPoller` | 15s interval | Checks tracked streamers for live status |
| `youtubePoller` | 60s interval | Checks tracked channels for new uploads |
| `scheduledPostRunner` | 60s interval | Flushes due scheduled posts |
| `weeklyReportHandler` | Monday 09:00 UTC | Posts weekly server health report |

---

## ⏱️ Background Services

| Service | Interval | Purpose |
|---|---|---|
| Twitch Poller | 15 seconds | Check tracked streamers for live status |
| YouTube Poller | 60 seconds | Check tracked channels for new uploads |
| Scheduler | 60 seconds | Send due scheduled posts; close expired polls and giveaways; fire bump reminders |
| Stats Runner | 5 minutes | Check if it's Monday 09:00 UTC and post weekly report |
| Weekly XP Reset | Sunday 00:00 UTC | Reset `weekly_xp` for all guilds; self-schedules recursively |

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
│   ├── automation/        # Event-driven background handlers
│   │   ├── boostHandler.js
│   │   ├── eventBannerHandler.js
│   │   ├── eventRecapHandler.js
│   │   ├── goodbyeHandler.js
│   │   ├── milestoneHandler.js
│   │   ├── scheduledPostRunner.js
│   │   ├── twitchPoller.js
│   │   ├── webhookHandler.js
│   │   ├── weeklyReportHandler.js
│   │   ├── welcomeHandler.js
│   │   └── youtubePoller.js
│   ├── commands/          # All slash command handlers (60+ commands)
│   ├── events/            # Discord gateway event handlers
│   ├── services/          # Timed background runners
│   │   ├── pollers.js     # Twitch (15s) + YouTube (60s) polling
│   │   ├── scheduler.js   # Scheduled posts (60s) + weekly XP reset (Sunday 00:00 UTC)
│   │   └── statsRunner.js # Weekly stats runner (5min check)
│   ├── utils/
│   │   ├── db.js          # SQLite wrapper (better-sqlite3)
│   │   ├── xp.js          # XP formula helpers
│   │   ├── canvas.js      # Shared canvas render utilities
│   │   ├── gemini.js      # Gemini AI helpers (retry, JSON extraction)
│   │   ├── backgrounds.js # Canvas background registry
│   │   ├── borders.js     # Canvas border registry
│   │   └── fonts.js       # Font registration + family list
│   ├── fonts/             # Custom font files for canvas rendering
│   ├── images/            # Static image assets for canvas cards
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

## 📄 License

MIT — see [LICENSE](LICENSE)
