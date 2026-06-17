# Sigil

> **Your server's mark. Crafted by AI.**

Sigil is a Discord bot for AI-powered server branding — generate icons, banners, badges, profile cards, brand kits, and more. Built on top of [Discord-Icon-Gen](https://github.com/NoVa-Gh0ul/Discord-Icon-Gen) by NoVa-Gh0ul, evolved into a full server customization platform.

![Version](https://img.shields.io/badge/version-2.0.0-blue) ![License](https://img.shields.io/badge/license-MIT-green) ![Node](https://img.shields.io/badge/node-18.x-brightgreen)

---

## Features

- 🎨 **Icon & Banner generation** — text, colors, fonts, glow, borders
- 🖼️ **Brand kit** — icon + banner + badge + palette in one command
- 🤖 **AI-powered design** — describe your server, get a full brand kit (Genkit + Claude)
- 🏅 **Badges & Cards** — role badges, profile cards, rank cards, welcome images
- 🎭 **Mood-based themes** — one word in, full color palette out
- 📦 **Brand export** — ZIP of all your server's assets

---

## Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/ShadowWalkerNC/Discord-Icon-Gen.git
cd Discord-Icon-Gen
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
TOKEN=your_bot_token
CLIENT_ID=your_application_id
GUILD_ID=your_server_id
DEPLOY_MODE=guild
```

### 3. Run

```bash
npm start
```

---

## Deploy to Railway

1. Push to GitHub
2. New Project → Deploy from GitHub repo
3. Add environment variables in the Variables tab
4. Railway auto-deploys on every push to `main`

---

## Commands

### 🖼️ Assets

| Command | Description |
|---|---|
| `/icon` | 400×400 profile icon with text, background, border |
| `/banner` | 1024×320 server banner |
| `/avatar` | Text overlay on your profile picture |
| `/logo` | 512×512 transparent PNG logo |
| `/compare` | Two icons side-by-side |
| `/random` | Fully randomised icon |
| `/preview` | All available backgrounds |

### `/icon` Options

| Option | Required | Description |
|---|---|---|
| `text` | ✅ | Text to render (1–6 chars recommended) |
| `size` | ✅ | Font size (20–200) |
| `color` | ✅ | Primary hex color e.g. `#FF4500` |
| `background` | ✅ | Background style (see list below) |
| `color2` | ❌ | Secondary color for gradient text |
| `glow` | ❌ | Glow intensity: None / Low / Medium / High / Ultra |
| `font` | ❌ | Font choice |
| `opacity` | ❌ | Text opacity (0.1–1.0) |
| `border` | ❌ | Border style (see list below) |

### Border Styles

| Value | Display Name | Description |
|---|---|---|
| `none` | None | No border |
| `solid` | Solid | Plain solid ring in `color` |
| `glow-ring` | Glow Ring | Soft glowing halo in `color` |
| `gradient-ring` | Gradient Ring | Gradient arc from `color` → `color2` |
| `neon` | Neon | Bright neon tube outline |
| `double` | Double Ring | Two concentric rings |
| `dashed` | Dashed | Dashed/dotted ring |
| `shadow-ring` | Shadow Ring | Deep shadow border for depth |
| `pulse` | Pulse Ring | Multi-layer pulse glow |

> `color2` is used by **Gradient Ring** and **Neon** styles.

---

## Roadmap

### ✅ v1.x (Complete)
- Icon, banner, avatar, logo, compare, random, preview commands
- 8 border styles, multiple backgrounds, glow effects

### 🔨 v2.x (In Progress)
- Brand kit generator (`/brand kit`)
- AI background generation (Genkit + Gemini Imagen)
- Claude-powered design critique and mood theming
- Badge, card, poster, sticker commands
- Profile rank cards and welcome images
- Brand save/apply/export per server
- Tier system for SaaS readiness

---

## Credits

- Original project: [NoVa-Gh0ul/Discord-Icon-Gen](https://github.com/NoVa-Gh0ul/Discord-Icon-Gen)
- Maintainer: [ShadowWalkerNC](https://github.com/ShadowWalkerNC)

---

## License

MIT
