# Sigil — Discord Server Branding Bot

**Sigil** is an AI-powered Discord bot that generates custom server icons, banners, logos, and full brand kits — all from slash commands. It also includes a browser-based **Visual Brand Builder** GUI with live preview, 8 brand templates, shape selector, and optional AI generation.

> **Current version: v1.9.0**

---

## Features

| Command | Description |
|---|---|
| `/icon` | Generate a server icon with shape, background, border, colors, font, glow |
| `/banner` | Generate a wide server banner with subtitle and alignment |
| `/logo` | Generate a logo-style icon with optional transparent background |
| `/avatar` | Generate a server avatar with optional overlay image |
| `/brand kit` | Build a full brand kit (icon + banner + palette) manually |
| `/brand ai` | AI-designed brand kit from a plain-text description |
| `/mood` | AI color palette from a mood description |
| `/compare` | Side-by-side comparison of two icon designs |
| `/random` | Fully randomized icon (random shape, colors, background, font…) |
| `/template` | Load a built-in brand template and instantly render its full kit |
| `/preview` | Grid preview of all available backgrounds |
| `/saveme` | Save your most recent design as a named kit |
| `/history` | View recent command history with copy-paste commands |
| `/gui open` | Get the link to the visual GUI builder |
| `/gui status` | Check if the GUI server is online |
| `/status` | Bot uptime and version |
| `/help` | Full command reference |

---

## Built-in Brand Templates

Use `/template name:<template>` to instantly generate a full kit from any of the 8 built-in templates. Each template includes a pre-tuned color palette, background, border, font, glow, and icon shape.

| Template | Genre | Shape | Primary |
|---|---|---|---|
| Demonfall | Dark Fantasy | Circle | `#8B0000` |
| Cyber Nexus | Cyberpunk | Square | `#00FFFF` |
| Arcane Order | Fantasy RPG | Hexagon | `#9966CC` |
| Cozy Den | Community | Rounded | `#FF6B35` |
| Neon Drift | Racing / Sports | Diamond | `#FF4500` |
| Polar Ops | Tactical FPS | Square | `#7DF9FF` |
| Emerald Fang | Survival / RPG | Hexagon | `#39FF14` |
| Void Protocol | Sci-Fi | Circle | `#C0C0C0` |

```
/template name:Demonfall
/template name:Cyber Nexus icon_text:YO brand_name:YourServer
```

---

## Icon Shape Option

All icon-generating commands (`/icon`, `/logo`, `/avatar`, `/compare`, `/random`, `/template`) support a **`shape`** option:

| Shape | Effect |
|---|---|
| `circle` | Circular crop |
| `rounded` | Rounded rectangle (12% radius) |
| `square` | Full square (default) |
| `hexagon` | Flat-top hexagon |
| `diamond` | Rotated-square diamond |

```
/icon text:SW shape:Hexagon background:aurora primary_color:#00ffcc
/avatar text:NX shape:Circle overlay:https://example.com/logo.png
/compare text_a:SW shape_a:Hexagon text_b:NX shape_b:Diamond
```

---

## Backgrounds

Sigil includes **32 background presets** across five categories:

| Category | Presets |
|---|---|
| Gradients | Purple, Blue, Red, Green, Gold, Teal, Pink, Orange |
| Solids | Black, White, Dark |
| Patterns | Noise Dark, Dark Grid, Dark Dots, Radial Purple, Radial Blue, Diagonal Purple, Diagonal Blue, Abstract Mesh, Neon Lines |
| Named (templates) | Midnight, Deep Space, Inferno, Ocean Depth, Twilight, Aurora, Storm, Void, Neon City, Sunset Fade, Forest Night, Polar |

---

## GUI Visual Brand Builder

The GUI (`gui/sigil-gui-builder.html`) is a browser-based 4-step wizard for building brand kits visually, with no slash commands required. Served by `gui/gui-server.js`.

### GUI Steps
1. **Identity** — Brand name, tagline, icon text, description; choose from 8 templates
2. **Colors** — Primary/secondary color pickers with 28-swatch library; 5-color palette
3. **Style** — Icon shape, background, border, glow, font, opacity, output size preset
4. **Generate** — AI Generate (Gemini), manual Preview, download outputs

### GUI Features
- **8 built-in brand templates** — Demonfall, Cyber Nexus, Arcane Order, Cozy Den, Neon Drift, Polar Ops, Emerald Fang, Void Protocol
- **Icon Shape Selector** — Circle, Rounded, Square, Hexagon, Diamond with live preview thumbnails
- **Live preview** — icon, banner, and palette re-render in real time
- **32 background presets** available in the background picker
- **8 border styles** — None, Solid, Glow, Gradient, Double, Dashed, Neon, Rainbow
- **7 output size presets** — Discord Icon (512×512), Discord Banner (960×540), Twitch Panel, Twitch Banner, YouTube Art, Reddit Banner, Square
- **Shareable links** — full brand state (including shape) encoded in URL hash
- **Randomize** — randomizes shape, colors, background, border, and font
- **Light/dark theme toggle**
- **Export config JSON** — compatible with `/brand ai` and `gemini.js`
- **AI Generate** — requires your own Gemini API key; AI picks brand name, colors, background, shape, font + generates an icon image overlay

---

## Setup

### Prerequisites
- Node.js 18
- A Discord bot token — [Discord Developer Portal](https://discord.com/developers/applications)
- A Google Gemini API key — [Google AI Studio](https://aistudio.google.com/app/apikey) *(optional — only needed for AI commands and GUI AI Generate)*

### Installation

```bash
git clone https://github.com/ShadowWalkerNC/Sigil.git
cd Sigil
npm install
cp .env.example .env
# Fill in DISCORD_TOKEN, CLIENT_ID, and optionally GEMINI_API_KEY
node src/deploy-commands.js   # Register slash commands with Discord
node src/index.js              # Start the bot
```

### GUI Server (optional)

```bash
node gui/gui-server.js
# Open http://localhost:8080
```

Set `GUI_URL` in `.env` to your public URL if hosting remotely so `/gui open` links work correctly.

---

## Deployment (Railway)

1. Push to GitHub.
2. Create a new Railway project from your repo.
3. Add environment variables: `DISCORD_TOKEN`, `CLIENT_ID`, `GEMINI_API_KEY` (optional), `GUI_URL` (optional).
4. Railway auto-detects `railpack.json` and builds with the required native canvas dependencies.
5. Start command: `node src/index.js` (defined in `railway.toml`).

To also run the GUI server, create a second Railway service pointed at the same repo with start command `node gui/gui-server.js`.

---

## Project Structure

```
Sigil/
├── gui/
│   ├── gui-server.js          # Express server (/preview, /generate endpoints)
│   └── sigil-gui-builder.html # Single-page GUI builder
├── src/
│   ├── commands/              # All slash command handlers
│   ├── events/                # Discord.js event handlers
│   ├── fonts/                 # Bundled font files
│   ├── utils/
│   │   ├── backgrounds.js     # 32 background presets
│   │   ├── borders.js         # 8 border styles
│   │   ├── canvas.js          # renderIcon, renderBanner, renderKit, applyShapeClip
│   │   ├── fonts.js           # Font registration
│   │   ├── gemini.js          # Gemini API helpers
│   │   ├── history.js         # Per-user command history
│   │   └── colors.js          # Color autocomplete
│   ├── deploy-commands.js     # Register slash commands
│   └── index.js               # Bot entry point
├── docs/
│   ├── CONTEXT.md
│   ├── ROADMAP.md
│   └── FONTS.md
├── .env.example
├── railpack.json
├── railway.toml
└── package.json
```

---

## Credits

Sigil was inspired by and built upon the original concept from [**NoVa-Gh0ul/Discord-Icon-Gen**](https://github.com/NoVa-Gh0ul/Discord-Icon-Gen) — a simple Discord bot for generating customized icons. Sigil has since evolved into a full brand kit platform, but credit goes to NoVa-Gh0ul for the original idea.

---

## License

MIT
