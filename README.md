# Discord Icon Gen

> **Forked from [NoVa-Gh0ul/Discord-Icon-Gen](https://github.com/NoVa-Gh0ul/Discord-Icon-Gen)**  
> Original author: [@NoVa-Gh0ul](https://github.com/NoVa-Gh0ul) — all credit for the original concept and implementation.

A Discord bot that generates fully customisable profile icons, server banners, avatar overlays, and transparent logos — all without leaving Discord.

---

## 🧙 Setup Wizard

> **Not technical? Start here.**  
> Open **[`setup.html`](setup.html)** in your browser — it walks you through every step (token, app ID, server ID, deploy mode) and downloads a ready-to-use `.env` file for you. No command line needed until the very end.

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
6. **Install the extra fonts** — see the [Font Installation](#-font-installation) section below (takes about 1 minute)
7. Run the bot:
   ```bash
   node src/index.js
   ```
8. In Discord, type `/help` to see all commands or `/preview` to browse backgrounds

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
- **8 border/frame styles** — None, Solid, Glow Ring, Gradient Ring, Double, Dashed, Corner Marks, Neon
- **Font & background registries** — add new fonts/backgrounds by dropping a file and adding one entry
- **`setup.html`** — browser-based setup wizard: token, app ID, server ID, deploy mode, font install guide, `.env` download
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
| `border` | — | Frame style — see border table below |
| `font` | — | Font style (default: Another Danger) |

#### Border Styles

| Value | Name | Description |
|---|---|---|
| `none` | None | No border (default) |
| `solid` | Solid | 6px solid rectangle in the primary colour |
| `glow` | Glow Ring | 4px ring with a wide blur halo matching the primary colour |
| `gradient` | Gradient Ring | 6px ring sweeping `color` → `color2` → `color` around all four edges |
| `double` | Double | Two concentric rings (outer 3px, inner 2px) with a 5px gap between them |
| `dashed` | Dashed | 5px dashed stroke with evenly divided gaps |
| `corner` | Corner Marks | L-shaped crop marks at each corner — minimal photo-frame look |
| `neon` | Neon | Three-pass layered glow (soft halo → mid → crisp core) for a neon tube effect |

> 💡 `gradient`, `double`, `dashed`, and `corner` all use `color` for their stroke. `gradient` and `neon` also make use of `color2` if provided.

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

### `/compare` — Side-by-side icon comparison

Renders two 400×400 icons next to each other so you can compare colours, backgrounds, or styles before committing to one. Each side (A and B) accepts its own `color`, `color2`, `glow`, `background`, `opacity`, and `border`. The `text`, `size`, and `font` are shared.

**Example:** `/compare text:Nova size:80 color_a:#FF4500 glow_a:High background_a:starfield color_b:#00FFFF glow_b:Medium background_b:midnight-gradient`

---

### `/random` — Randomised icon

Picks a background, font, colours, glow level, and border automatically. Pass an optional `seed` number to recreate the exact same result later.

**Example:** `/random text:Nova` or `/random text:Nova seed:42`

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

---

## 📦 Font Installation

The bot comes with one built-in font (Another Danger). The other 5 fonts are free and open-source but need to be downloaded separately because they are too large to store on GitHub. This only takes about a minute.

> 💡 **What is a terminal?** It's a text window where you type commands. Don't worry — you only need to copy and paste the lines below, then press Enter. You won't break anything.

---

### 🪟 Windows

1. Press **Windows key + R**, type `cmd`, press **Enter** — a black window opens. That's the terminal.
2. Copy and paste this entire block, then press **Enter**:

```cmd
cd %USERPROFILE%\Discord-Icon-Gen\src\fonts
curl -fsSL "https://github.com/google/fonts/raw/main/ofl/bebasneue/BebasNeue-Regular.ttf" -o BebasNeue-Regular.ttf
curl -fsSL "https://github.com/googlefonts/OswaldFont/raw/main/fonts/ttf/Oswald-Bold.ttf" -o Oswald-Bold.ttf
curl -fsSL "https://github.com/google/fonts/raw/main/ofl/playfairdisplay/PlayfairDisplay%%5Bwght%%5D.ttf" -o PlayfairDisplay-Bold.ttf
curl -fsSL "https://github.com/adobe-fonts/source-code-pro/raw/release/TTF/SourceCodePro-Bold.ttf" -o SourceCodePro-Bold.ttf
curl -fsSL "https://github.com/google/fonts/raw/main/ofl/dancingscript/DancingScript%%5Bwght%%5D.ttf" -o DancingScript-Bold.ttf
```

> ⚠️ If the first line gives an error saying the folder wasn't found, adjust the path to wherever you cloned the repo. For example if it's on your Desktop: `cd %USERPROFILE%\Desktop\Discord-Icon-Gen\src\fonts`

3. When it finishes (no red errors), close the terminal. You're done.

---

### 🍎 Mac

1. Open **Finder** → go to your `Discord-Icon-Gen` folder → right-click it → **New Terminal at Folder**  
   *(If you don't see that option: go to **System Settings → Privacy & Security → Developer Tools** and enable Terminal)*
2. Copy and paste this entire block into the terminal window, then press **Enter**:

```bash
cd src/fonts
curl -fsSL "https://github.com/google/fonts/raw/main/ofl/bebasneue/BebasNeue-Regular.ttf" -o BebasNeue-Regular.ttf
curl -fsSL "https://github.com/googlefonts/OswaldFont/raw/main/fonts/ttf/Oswald-Bold.ttf" -o Oswald-Bold.ttf
curl -fsSL "https://github.com/google/fonts/raw/main/ofl/playfairdisplay/PlayfairDisplay%5Bwght%5D.ttf" -o PlayfairDisplay-Bold.ttf
curl -fsSL "https://github.com/adobe-fonts/source-code-pro/raw/release/TTF/SourceCodePro-Bold.ttf" -o SourceCodePro-Bold.ttf
curl -fsSL "https://github.com/google/fonts/raw/main/ofl/dancingscript/DancingScript%5Bwght%5D.ttf" -o DancingScript-Bold.ttf
```

3. When it finishes (no red errors), close the terminal. You're done.

---

### 🐧 Linux

```bash
cd ~/Discord-Icon-Gen/src/fonts
curl -fsSL "https://github.com/google/fonts/raw/main/ofl/bebasneue/BebasNeue-Regular.ttf" -o BebasNeue-Regular.ttf
curl -fsSL "https://github.com/googlefonts/OswaldFont/raw/main/fonts/ttf/Oswald-Bold.ttf" -o Oswald-Bold.ttf
curl -fsSL "https://github.com/google/fonts/raw/main/ofl/playfairdisplay/PlayfairDisplay%5Bwght%5D.ttf" -o PlayfairDisplay-Bold.ttf
curl -fsSL "https://github.com/adobe-fonts/source-code-pro/raw/release/TTF/SourceCodePro-Bold.ttf" -o SourceCodePro-Bold.ttf
curl -fsSL "https://github.com/google/fonts/raw/main/ofl/dancingscript/DancingScript%5Bwght%5D.ttf" -o DancingScript-Bold.ttf
```

---

### ✅ How to check it worked

Open the `Discord-Icon-Gen/src/fonts/` folder on your computer. You should see these 5 files, each larger than 50 KB:

```
BebasNeue-Regular.ttf      (~60 KB)
Oswald-Bold.ttf            (~106 KB)
PlayfairDisplay-Bold.ttf   (~294 KB)
SourceCodePro-Bold.ttf     (~202 KB)
DancingScript-Bold.ttf     (~131 KB)
```

If any file is tiny (under 5 KB) the download didn't work — delete it and run just that one `curl` line again.

---

### ❓ Troubleshooting

| Problem | Fix |
|---|---|
| `curl: command not found` | On Windows: update to Windows 10 build 1803+ or [download curl](https://curl.se/windows/). On Mac: install Xcode Command Line Tools with `xcode-select --install` |
| `No such file or directory` | You're in the wrong folder. Run `cd` followed by the full path to `Discord-Icon-Gen/src/fonts` |
| Font file is 0 KB or tiny | Download failed. Check your internet connection and try just that one `curl` line again |
| Bot starts but font looks wrong | Restart the bot after downloading fonts — it only loads them at startup |
| Still using the wrong font | Type `/preview` in Discord — it shows which fonts loaded correctly |

All fonts are free and open-source under the [SIL Open Font License](https://scripts.sil.org/OFL) or Apache 2.0.

---

## ☁️ Deployment

Choose the option that fits your situation. All three work fine for a personal bot.

---

### Option 1 — Railway (Recommended, free tier available)

Railway is the easiest cloud option. It runs 24/7, restarts automatically if it crashes, and you never need to touch a server.

1. **Create a free account** at [railway.app](https://railway.app) and connect your GitHub account
2. Click **New Project → Deploy from GitHub repo** and select `Discord-Icon-Gen`
3. Railway will detect Node.js automatically. Before the first deploy, go to **Variables** and add:

   | Variable | Value |
   |---|---|
   | `TOKEN` | Your bot token |
   | `CLIENT_ID` | Your application client ID |
   | `DEPLOY_MODE` | `global` |

4. Under **Settings → Deploy**, set the **Start Command** to:
   ```
   node src/index.js
   ```
5. Click **Deploy**. Railway builds and starts the bot. Check the **Logs** tab — you should see `✅ Logged in as YourBot#1234` within a minute.
6. **Fonts on Railway** — Railway's filesystem resets on each deploy, so add the font `curl` commands as a build step. Create a file called `railway.toml` in the repo root:
   ```toml
   [build]
   builder = "NIXPACKS"
   buildCommand = "npm install && cd src/fonts && curl -fsSL https://github.com/google/fonts/raw/main/ofl/bebasneue/BebasNeue-Regular.ttf -o BebasNeue-Regular.ttf && curl -fsSL https://github.com/googlefonts/OswaldFont/raw/main/fonts/ttf/Oswald-Bold.ttf -o Oswald-Bold.ttf && curl -fsSL 'https://github.com/google/fonts/raw/main/ofl/playfairdisplay/PlayfairDisplay%5Bwght%5D.ttf' -o PlayfairDisplay-Bold.ttf && curl -fsSL https://github.com/adobe-fonts/source-code-pro/raw/release/TTF/SourceCodePro-Bold.ttf -o SourceCodePro-Bold.ttf && curl -fsSL 'https://github.com/google/fonts/raw/main/ofl/dancingscript/DancingScript%5Bwght%5D.ttf' -o DancingScript-Bold.ttf"

   [deploy]
   startCommand = "node src/index.js"
   restartPolicyType = "ON_FAILURE"
   restartPolicyMaxRetries = 5
   ```
   Commit this file and Railway will download the fonts automatically on every deploy.

> 💡 **Free tier note:** Railway's free tier gives you $5 of credit per month. A lightweight Discord bot uses roughly $0.50–$1.00/month, so it stays free for most users.

---

### Option 2 — Render (Free tier, sleeps after inactivity)

Render's free tier works but the process sleeps after 15 minutes of inactivity and takes ~30 seconds to wake up on the next command. Fine for testing, less ideal for 24/7 use.

1. Create a free account at [render.com](https://render.com)
2. Click **New → Background Worker** (not Web Service — the bot has no HTTP server)
3. Connect your GitHub repo and set:
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `node src/index.js`
4. Under **Environment**, add `TOKEN`, `CLIENT_ID`, and `DEPLOY_MODE=global`
5. Add a **Build Command** that also fetches the fonts (same curl block as the Railway `buildCommand` above)
6. Click **Create Background Worker** and watch the logs

---

### Option 3 — VPS / Home Server (Linux, runs 24/7)

Use this if you already have a Linux server (DigitalOcean, Linode, your own machine, a Raspberry Pi, etc.).

#### First-time setup

```bash
# Install Node.js v18+ via nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18

# Clone the repo
git clone https://github.com/ShadowWalkerNC/Discord-Icon-Gen.git
cd Discord-Icon-Gen
npm install
cp .env.example .env
nano .env   # fill in TOKEN, CLIENT_ID, DEPLOY_MODE=global

# Download fonts
cd src/fonts
curl -fsSL "https://github.com/google/fonts/raw/main/ofl/bebasneue/BebasNeue-Regular.ttf" -o BebasNeue-Regular.ttf
curl -fsSL "https://github.com/googlefonts/OswaldFont/raw/main/fonts/ttf/Oswald-Bold.ttf" -o Oswald-Bold.ttf
curl -fsSL "https://github.com/google/fonts/raw/main/ofl/playfairdisplay/PlayfairDisplay%5Bwght%5D.ttf" -o PlayfairDisplay-Bold.ttf
curl -fsSL "https://github.com/adobe-fonts/source-code-pro/raw/release/TTF/SourceCodePro-Bold.ttf" -o SourceCodePro-Bold.ttf
curl -fsSL "https://github.com/google/fonts/raw/main/ofl/dancingscript/DancingScript%5Bwght%5D.ttf" -o DancingScript-Bold.ttf
cd ../..
```

#### Keep the bot running with pm2

[pm2](https://pm2.keymetrics.io) keeps the bot alive after you close your SSH session and restarts it automatically if it crashes.

```bash
# Install pm2 globally
npm install -g pm2

# Start the bot
pm2 start src/index.js --name discord-icon-gen

# Make it survive a server reboot
pm2 save
pm2 startup   # run the command it prints out

# Useful pm2 commands
pm2 status                    # see if the bot is running
pm2 logs discord-icon-gen     # live log output
pm2 restart discord-icon-gen  # restart after a code change
pm2 stop discord-icon-gen     # stop the bot
```

#### Updating the bot

```bash
cd ~/Discord-Icon-Gen
git pull
npm install          # only needed if package.json changed
pm2 restart discord-icon-gen
```

---

### Option 4 — GitHub Codespaces (browser, no install needed)

Good for a quick test or if you want to try the bot without installing anything locally.

1. On the repo page, click **Code → Codespaces → Create codespace on main**
2. In the Codespace terminal:
   ```bash
   npm install
   cp .env.example .env
   # Edit .env with your values using the built-in editor
   ```
3. Download fonts using the Linux curl block from the [Font Installation](#-font-installation) section above
4. Run:
   ```bash
   node src/index.js
   ```

> ⚠️ Codespaces stop automatically after inactivity and are not suitable for permanent hosting. Use Railway or a VPS for 24/7 uptime.

---

### Slash Command Registration

Commands register automatically when the bot starts. The `DEPLOY_MODE` variable controls scope:

| `DEPLOY_MODE` | Scope | Speed | When to use |
|---|---|---|---|
| `guild` (default) | One server only (`GUILD_ID`) | Instant | Development and testing |
| `global` | Every server the bot is in | Up to 1 hour | Production |

> 💡 Always use `guild` mode while testing — it's instant and changes don't affect other servers. Switch to `global` only when you're ready to go live.

---

## 📄 License
MIT — see [LICENSE](LICENSE) for details.

---

*Maintained by [@ShadowWalkerNC](https://github.com/ShadowWalkerNC). Please visit the [original repository](https://github.com/NoVa-Gh0ul/Discord-Icon-Gen) to support the original author.*
