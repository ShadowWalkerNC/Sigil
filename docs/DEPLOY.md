# 🚀 Sigil — Deployment Guide

Three deployment options: **Railway** (zero-config, recommended), **Docker**, or **bare-metal with PM2**.

---

## Option 1 — Railway (Recommended)

1. Go to [railway.app](https://railway.app) and click **New Project → Deploy from GitHub Repo**
2. Select `ShadowWalkerNC/Sigil`
3. Railway auto-detects `railway.toml` — no extra config needed
4. In **Variables**, add:

```
DISCORD_TOKEN=
CLIENT_ID=
GUI_AUTH_TOKEN=
BIBLE_API_KEY=
BIBLE_ID=de4e12af7f28f599-02
ANTHROPIC_API_KEY=
CULINARYOS_WEBHOOK_SECRET=
NODE_ENV=production
```

5. Click **Deploy**
6. Go to **Settings → Networking → Generate Domain** to expose the webhook endpoint

### Persistent Storage (SQLite)

- Add a Railway **Volume** mounted at `/app/data` to survive redeploys
- Or migrate to Railway's managed **PostgreSQL** (see Scale section in README)

---

## Option 2 — Docker

```bash
docker build -t sigil .
docker run -d \
  --name sigil \
  --restart unless-stopped \
  -p 8080:8080 \
  -v $(pwd)/data:/app/data \
  --env-file .env \
  sigil
```

### docker-compose

```yaml
version: '3.9'
services:
  sigil:
    build: .
    restart: unless-stopped
    ports:
      - "8080:8080"
    volumes:
      - ./data:/app/data
    env_file:
      - .env
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:8080/health', r => process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"]
      interval: 30s
      timeout: 10s
      retries: 3
```

---

## Option 3 — Bare Metal with PM2

```bash
git clone https://github.com/ShadowWalkerNC/Sigil.git
cd Sigil
npm install
cp .env.example .env
nano .env
mkdir -p data logs
npm run deploy-commands
pm2 start ecosystem.config.js --env production
pm2 save && pm2 startup
```

Useful PM2 commands: `pm2 status` · `pm2 logs sigil` · `pm2 restart sigil` · `pm2 stop sigil`

### Update

```bash
git pull && npm install && pm2 restart sigil
```

---

## Health Check

```
GET /health
```

Returns `200 OK` with `{ status: "ok", uptime: <seconds> }`. Used by Docker `HEALTHCHECK`, Railway, and uptime monitors.

---

## Environment Variables

See [`../.env.example`](../.env.example) for the full annotated list.

| Variable | Required | Description |
|---|---|---|
| `DISCORD_TOKEN` | ✅ | Bot token from Discord Developer Portal |
| `CLIENT_ID` | ✅ | Application / Client ID |
| `GUI_AUTH_TOKEN` | ✅ | Bearer token for all `/api/*` access |
| `PORT` | No | HTTP port (default: `8080`) |
| `BIBLE_API_KEY` | For `/devotional` | Key from [scripture.api.bible](https://scripture.api.bible) |
| `BIBLE_ID` | For `/devotional` | Bible translation ID (default: NIV) |
| `ANTHROPIC_API_KEY` | For AI features | Anthropic Claude API key |
| `CONTROL_SECRET` | For control endpoints | Enables restart + deploy-commands routes |
| `CULINARYOS_WEBHOOK_SECRET` | Recommended | Secures inbound CulinaryOS webhooks |
| `NODE_ENV` | No | Set to `production` in prod |

---

## First-Run Checklist

- [ ] Bot token and Client ID set in `.env`
- [ ] `GUI_AUTH_TOKEN` set to a long random secret
- [ ] Slash commands deployed: `npm run deploy-commands`
- [ ] Bot invited with `applications.commands` + `bot` scopes and required permissions
- [ ] `data/` directory exists and is writable (SQLite)
- [ ] Health check passing: `curl https://your-domain/health`
- [ ] (Optional) CulinaryOS webhook secret configured on both ends
- [ ] (Optional) Railway Volume mounted at `/app/data` for persistent SQLite

---

*Part of the [Sigil](https://github.com/ShadowWalkerNC/Sigil) ecosystem.*
