# Discord Icon Gen

> **Forked from [NoVa-Gh0ul/Discord-Icon-Gen](https://github.com/NoVa-Gh0ul/Discord-Icon-Gen)**
> Original author: [@NoVa-Gh0ul](https://github.com/NoVa-Gh0ul) — all credit for the original concept and implementation.

A Discord bot that generates fully customizable profile icons on demand. Drop it into your server, run `/icon`, and get a styled image in seconds.

---

## What's New in This Fork

- **Font registry** — centralized font management in `src/utils/fonts.js`; adding new fonts requires one file drop and one line of code
- **`/help` command** — full command reference available directly inside Discord via `/help`
- **Global command deployment** — supports both guild (dev) and global (production) command registration via `DEPLOY_MODE`
- **Input validation** — hex color format checking, text length cap, font size bounds
- **Command caching** — commands loaded at startup, not re-required on every interaction
- **Scoped intents** — only requests what is actually needed
- **Improved error handling** — structured logs and user-facing error messages
- **Cleaner project structure** — `.gitignore`, `.env.example`, fixed dependencies

---

## Features

- Generate a 400×400 icon with custom text, color, glow, and background
- Font system designed for easy expansion
- `/help` command for in-Discord reference
- Guild mode for fast development, global mode for production

---

## Setup

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- A Discord bot token from the [Discord Developer Portal](https://discord.com/developers/applications)

### Installation

```bash
git clone https://github.com/ShadowWalkerNC/Discord-Icon-Gen.git
cd Discord-Icon-Gen
npm install
cp .env.example .env
# Fill in your TOKEN, CLIENT_ID, GUILD_ID, and DEPLOY_MODE
```

### Running

```bash
npm start
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `TOKEN` | Yes | Your Discord bot token |
| `CLIENT_ID` | Yes | Your Discord application client ID |
| `GUILD_ID` | Guild mode only | Server ID for guild-scoped command registration |
| `DEPLOY_MODE` | No (default: `guild`) | `guild` for dev, `global` for production |

> **Tip:** Use `DEPLOY_MODE=guild` while developing — instant registration. Switch to `DEPLOY_MODE=global` when going public. Global can take up to 1 hour to propagate.

---

## Commands

### `/icon`
Generates a custom 400×400 profile icon.

| Option | Required | Description |
|---|---|---|
| `text` | Yes | Text to display (max 20 characters) |
| `size` | Yes | Font size in pixels (10–200) |
| `color` | Yes | Text color in hex format (e.g. `#FF0000`) |
| `glow` | Yes | Glow intensity: `Low`, `Medium`, `High` |
| `background` | Yes | `Plain (Black)`, `Custom Background 1`, `Custom Background 2` |
| `font` | No | Font style. Default: `Another Danger` |

**Example:** `/icon text:Nova size:80 color:#FF4500 glow:High background:Plain (Black)`

### `/help`
Displays this command reference inside Discord. Only visible to you.

**Example:** `/help`

---

## Adding New Fonts

1. Drop your `.otf` or `.ttf` font file into `src/fonts/`
2. Add an entry to `src/utils/fonts.js`:
   ```js
   'my-font': {
       label: 'My Font',
       file: path.resolve(__dirname, '..', 'fonts', 'my-font.otf'),
       family: 'My Font',
   }
   ```
3. It will automatically appear as a choice in `/icon`

---

## Deployment

For production hosting, [Railway](https://railway.app) or [Fly.io](https://fly.io) work well. Set your environment variables in the platform dashboard and set `DEPLOY_MODE=global`.

---

## License

MIT — see [LICENSE](LICENSE) for details.

---

*Maintained by [@ShadowWalkerNC](https://github.com/ShadowWalkerNC). Please visit the [original repository](https://github.com/NoVa-Gh0ul/Discord-Icon-Gen) to support the original author.*
