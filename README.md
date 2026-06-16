# Discord Icon Gen

> **Forked from [NoVa-Gh0ul/Discord-Icon-Gen](https://github.com/NoVa-Gh0ul/Discord-Icon-Gen)**  
> Original author: [@NoVa-Gh0ul](https://github.com/NoVa-Gh0ul) — all credit for the original concept and implementation.

A Discord bot that generates fully customisable profile icons, server banners, avatar overlays, and transparent logos — all without leaving Discord.

---

## 🚀 Quick Start (Non-Technical Users)

1. **[Download Node.js](https://nodejs.org)** — pick the "LTS" version and install it like any normal program
2. **[Download Git](https://git-scm.com/downloads)** — install for your operating system
3. Open a terminal in the folder where you want the bot to live and run:
   ```bash
   git clone https://github.com/ShadowWalkerNC/Discord-Icon-Gen.git
   cd Discord-Icon-Gen
   npm install
   ```
4. **Open `setup.html`** in your browser — it walks you through creating your `.env` file step by step with no jargon
5. Move the downloaded `.env` file into the `Discord-Icon-Gen` folder
6. Run the bot:
   ```bash
   node src/index.js
   ```
7. In Discord, type `/help` to see all commands or `/preview` to browse backgrounds

---

## ✨ What's New in This Fork

- **`/preview`** — visual mosaic of every available background
- **`/banner`** — 1024×320 server banner with optional subtitle and text alignment
- **`/avatar`** — overlays text and glow on your Discord avatar
- **`/logo`** — 512×512 transparent PNG with optional circle ring or underline shape
- **Gradient text** — pass `color2` to any command for a smooth left→right colour blend
- **Background opacity** — `opacity` param (10–100) dims the background before drawing text
- **10 backgrounds** — 6 procedural (Midnight Gradient, Sunset, Forest, Cyberpunk Grid, Starfield, Carbon Fiber) + 2 plain + 2 custom images
- **6 fonts** — Another Danger, Bebas Neue, Oswald Bold, Playfair Display, Source Code Pro, Dancing Script
- **Font & background registries** — add new fonts/backgrounds by dropping a file and adding one entry
- **`setup.html`** — browser-based setup wizard for non-technical users
- **Improved `/help`** — dynamically lists all fonts and backgrounds, explains every parameter
- **Input validation** — hex colour checking, text length caps, font size bounds
- **Global command deployment** — `DEPLOY_MODE=guild` for dev, `DEPLOY_MODE=global` for production

---

## 🛠 Setup (Technical)

### Prerequisites
- [Node.js](https://nodejs.org/) v18 or higher
- A Discord bot token from the [Discord Developer Portal](https://discord.com/developers/applications)

### Installation

```bash
git clone https://github.com/ShadowWalkerNC/Discord-Icon-Gen.git
cd Discord-Icon-Gen
npm install
cp .env.example .env   # then fill in your values
npm start
```

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `TOKEN` | ✅ | Your Discord bot token |
| `CLIENT_ID` | ✅ | Your Discord application client ID |
| `GUILD_ID` | Guild mode | Server ID for guild-scoped registration |
| `DEPLOY_MODE` | No | `guild` (instant, default) or `global` (up to 1hr) |

---

## 📋 Commands

### `/icon` — 400×400 profile icon

| Option | Required | Description |
|---|---|---|
| `text` | ✅ | Text to display (max 20 chars) |
| `size` | ✅ | Font size in pixels (10–150) |
| `color` | ✅ | Hex colour e.g. `#FF0000` |
| `glow` | ✅ | `Low` / `Medium` / `High` |
| `background` | ✅ | See backgrounds table below |
| `color2` | — | Second colour for a gradient e.g. `#0000FF` |
| `opacity` | — | Background brightness 10–100 (default: 100) |
| `font` | — | Font style (default: Another Danger) |

**Example:** `/icon text:Nova size:80 color:#FF4500 glow:High background:starfield color2:#FFAA00 opacity:70`

---

### `/banner` — 1024×320 server banner

| Option | Required | Description |
|---|---|---|
| `text` | ✅ | Primary text (max 30 chars) |
| `size` | ✅ | Font size in pixels (10–150) |
| `color` | ✅ | Hex colour e.g. `#00FFFF` |
| `glow` | ✅ | `Low` / `Medium` / `High` |
| `background` | ✅ | See backgrounds table below |
| `subtitle` | — | Smaller text beneath main heading (max 50 chars) |
| `align` | — | `Left` / `Center` / `Right` (default: Center) |
| `color2` | — | Gradient second colour |
| `opacity` | — | Background brightness 10–100 (default: 100) |
| `font` | — | Font style |

**Example:** `/banner text:MyServer size:90 color:#00FFFF glow:Medium background:midnight-gradient subtitle:Est. 2024 align:Left`

---

### `/avatar` — Text overlay on your Discord avatar

| Option | Required | Description |
|---|---|---|
| `text` | ✅ | Text to overlay (max 20 chars) |
| `size` | ✅ | Font size in pixels (10–150) |
| `color` | ✅ | Hex colour e.g. `#FFFFFF` |
| `glow` | ✅ | `Low` / `Medium` / `High` |
| `position` | ✅ | `Top` / `Center` / `Bottom` |
| `color2` | — | Gradient second colour |
| `circular` | — | Crop avatar to a circle (default: false) |
| `font` | — | Font style |

**Example:** `/avatar text:Nova size:60 color:#FFFFFF glow:High position:Bottom circular:True`

---

### `/logo` — 512×512 transparent PNG logo

| Option | Required | Description |
|---|---|---|
| `text` | ✅ | Logo text (max 20 chars) |
| `size` | ✅ | Font size in pixels (10–200) |
| `color` | ✅ | Hex colour e.g. `#FF4500` |
| `glow` | ✅ | `Low` / `Medium` / `High` |
| `color2` | — | Gradient second colour |
| `shape` | — | `None` / `Circle Ring` / `Underline` |
| `font` | — | Font style |

**Example:** `/logo text:Nova size:120 color:#FF4500 glow:High shape:Circle Ring`

---

### `/preview` — Background mosaic sheet
Generates a single image showing every background with its name. Use this to choose a background before running `/icon` or `/banner`.

### `/help` — Full command reference
Shows all commands, parameters, available fonts, and backgrounds. Only visible to you.

---

## 🖼 Backgrounds

| Key (use in commands) | Name | Type |
|---|---|---|
| `plain-black` | Plain (Black) | Solid colour |
| `plain-white` | Plain (White) | Solid colour |
| `midnight-gradient` | Midnight Gradient | Navy → purple diagonal |
| `sunset` | Sunset | Orange → magenta → purple |
| `forest` | Forest | Dark green radial |
| `cyberpunk-grid` | Cyberpunk Grid | Neon cyan perspective grid |
| `starfield` | Starfield | Seeded stars on black |
| `carbon-fiber` | Carbon Fiber | Dark diamond weave |
| `bg-image-1` | Custom Background 1 | Bundled JPG |
| `bg-image-2` | Custom Background 2 | Bundled JPG |

### Adding New Backgrounds

Open `src/utils/backgrounds.js` and add an entry:
```js
'my-bg': {
    label: 'My Background',
    type: 'procedural',
    draw(ctx, w, h) {
        // draw anything you want onto ctx
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, w, h);
    },
},
```
It appears automatically in `/icon`, `/banner`, and `/preview`.

---

## 🔤 Fonts

| Key | Name | Style |
|---|---|---|
| `another-danger` | Another Danger | Grunge display |
| `bebas-neue` | Bebas Neue | Tall condensed sans |
| `oswald-bold` | Oswald Bold | Bold condensed sans |
| `playfair-display` | Playfair Display | Editorial serif |
| `source-code-pro` | Source Code Pro | Monospace |
| `dancing-script` | Dancing Script | Handwritten script |

### Adding New Fonts

1. Drop your `.otf` or `.ttf` file into `src/fonts/`
2. Add an entry to `src/utils/fonts.js`:
```js
'my-font': {
    label: 'My Font',
    file: path.resolve(__dirname, '..', 'fonts', 'my-font.otf'),
    family: 'My Font',
}
```
3. It appears automatically in all commands.

> ⚠️ **Note:** The 5 bundled fonts (Bebas Neue, Oswald Bold, Playfair Display, Source Code Pro, Dancing Script) need to be downloaded separately due to file size constraints. Run the curl commands in the [font installation note](#font-installation) below.

---

## 📦 Font Installation

After cloning, download the 5 bundled fonts by running these commands from the repo root:

```bash
cd src/fonts
curl -fsSL "https://github.com/google/fonts/raw/main/ofl/bebasneue/BebasNeue-Regular.ttf" -o BebasNeue-Regular.ttf
curl -fsSL "https://github.com/googlefonts/OswaldFont/raw/main/fonts/ttf/Oswald-Bold.ttf" -o Oswald-Bold.ttf
curl -fsSL "https://github.com/google/fonts/raw/main/ofl/playfairdisplay/PlayfairDisplay%5Bwght%5D.ttf" -o PlayfairDisplay-Bold.ttf
curl -fsSL "https://github.com/adobe-fonts/source-code-pro/raw/release/TTF/SourceCodePro-Bold.ttf" -o SourceCodePro-Bold.ttf
curl -fsSL "https://github.com/google/fonts/raw/main/ofl/dancingscript/DancingScript%5Bwght%5D.ttf" -o DancingScript-Bold.ttf
cd ../..
```

All fonts are open-source (OFL / Apache 2.0).

---

## ☁️ Deployment

[Railway](https://railway.app) and [Render](https://render.com) both have free tiers. Set your env vars in the platform dashboard and use `DEPLOY_MODE=global`.

For GitHub Codespaces (run in browser, no install):
```bash
npm install
cp .env.example .env
# Fill in your values, then:
npm start
```

---

## 📄 License
MIT — see [LICENSE](LICENSE) for details.

---

*Maintained by [@ShadowWalkerNC](https://github.com/ShadowWalkerNC). Please visit the [original repository](https://github.com/NoVa-Gh0ul/Discord-Icon-Gen) to support the original author.*
