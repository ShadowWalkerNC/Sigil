# Sigil — Discord Server Branding Bot

**Sigil** is an AI-powered Discord bot that generates custom server icons, banners, logos, and full brand kits — all from slash commands.

---

## Features

| Command | Description |
|---|---|
| `/icon` | Generate a server icon |
| `/banner` | Generate a wide server banner |
| `/logo` | Generate a logo-style icon |
| `/avatar` | Generate a server avatar with optional overlay |
| `/brand kit` | Build a full brand kit (icon + banner + palette) |
| `/brand ai` | AI-designed brand kit from a description |
| `/mood` | AI color palette from a mood description |
| `/compare` | Side-by-side icon comparison |
| `/random` | Fully random icon generation |
| `/preview` | Grid preview of all backgrounds |
| `/saveme` | Save your most recent design |
| `/history` | View recent command history |
| `/gui open` | Get the link to the visual GUI builder |
| `/gui status` | Check if the GUI server is online |
| `/help` | Full command reference |

---

## Setup

### Prerequisites
- Node.js 18+
- A Discord bot token ([Discord Developer Portal](https://discord.com/developers/applications))
- A Google Gemini API key ([Google AI Studio](https://aistudio.google.com/app/apikey))

### Installation

```bash
git clone https://github.com/ShadowWalkerNC/Sigil.git
cd Sigil
npm install
cp .env.example .env
# Fill in .env with your tokens
node src/deploy-commands.js   # Register slash commands
node src/index.js              # Start the bot
```

### GUI Server (optional)

The GUI provides a browser-based visual brand builder.

```bash
node gui/gui-server.js
# Open http://localhost:3420
```

Set `GUI_URL` in `.env` to your public URL if hosting remotely.

---

## Deployment (Railway)

1. Push to GitHub.
2. Create a new Railway project from your repo.
3. Add environment variables (`DISCORD_TOKEN`, `CLIENT_ID`, `GEMINI_API_KEY`).
4. Railway will auto-detect `railpack.json` and build with canvas native deps.
5. Start command: `node src/index.js`

---

## License

MIT
