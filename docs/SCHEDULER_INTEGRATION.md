# 📅 Scheduler Integration Guide

This guide explains how to connect **any compatible scheduler** (including Sylvia Ross MC) to Sigil so staff can view their shifts directly in Discord.

---

## How It Works

```
Your Scheduler (Express server)
        ↕  REST API (bridge endpoints)
Sigil (Discord Bot)
        ↕  Discord slash commands
Your Staff (Discord users)
```

Sigil calls two endpoints on your scheduler:

| Endpoint | Method | Purpose |
|---|---|---|
| `/api/discord/schedules` | GET | Fetch all schedule entries |
| `/api/discord/callout` | POST | Submit a staff callout |

Both use a **shared secret key** (`x-bridge-key` header) — safe and simple.

---

## Step 1 — Add the Bridge Key to Your Scheduler

```env
DISCORD_BRIDGE_KEY=make-this-a-long-random-string
```

Generate a secure key:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Step 2 — Add Bridge Endpoints to `server.js`

Paste before your static file middleware:

```js
function requireBridgeKey(req, res, next) {
    const key = req.headers['x-bridge-key'];
    if (!key || key !== process.env.DISCORD_BRIDGE_KEY)
        return res.status(401).json({ error: 'Invalid bridge key.' });
    next();
}

app.get('/api/discord/schedules', requireBridgeKey, (req, res) => {
    res.json(readData('schedules.json', []));
});

app.post('/api/discord/callout', requireBridgeKey, (req, res) => {
    const callouts = readData('callouts.json', []);
    const c = req.body;
    if (!c || !c.date) return res.status(400).json({ error: 'Date required.' });
    if (!c.id) c.id = 'co_' + Date.now();
    callouts.unshift(c);
    writeData('callouts.json', callouts)
        ? res.json({ success: true, callout: c })
        : res.status(500).json({ error: 'Failed to write callout.' });
});
```

> **Note for Sylvia Ross MC:** Insert just before `// ─── STATIC FILES — must be AFTER all API routes`

---

## Step 3 — Make Your Scheduler Reachable

| Option | URL format | When to use |
|---|---|---|
| Same machine | `http://localhost:3000` | Local testing |
| LAN | `http://192.168.1.X:3000` | Care homes / restaurants |
| Tunnel | ngrok `https://xxxxx.ngrok.io` | Remote bot, local scheduler |
| Deployed | Railway / Render URL | Production |

---

## Step 4 — Connect in Discord

```
/myshift setup url:http://YOUR-SERVER-IP:3000 key:YOUR_BRIDGE_KEY
```

Optionally add a daily auto-post channel:
```
/myshift setup url:http://192.168.1.10:3000 key:abc123 channel:#schedule-board time:07:00 timezone:America/New_York
```

---

## Step 5 — Staff Link Their Names

```
/myshift link name:Nate
```

Name must match exactly how it appears in the schedule.

Then staff can run: `/myshift today` · `/myshift week` · `/myshift roster` · `/callout`

---

## Schedule Data Shape

```json
{
  "staffName": "Nate",
  "role": "Cook",
  "date": "2026-06-22",
  "shiftStart": "06:30",
  "shiftEnd": "14:00",
  "notes": ""
}
```

Extra fields are ignored. Matches Sylvia Ross MC `schedules.json` format exactly.

---

## Troubleshooting

| Error | Fix |
|---|---|
| `Could not reach the scheduler` | Confirm the server is running and URL/port is correct |
| `Invalid bridge key` | Confirm `.env` has `DISCORD_BRIDGE_KEY` and server was restarted |
| `No shifts found` | Staff name spelling must match exactly |
| Bot remote, scheduler on LAN | Use ngrok or deploy scheduler to Railway |

---

## Notes

- Bridge key is never shown in Discord after setup — stored encrypted in Sigil's database
- Callouts submitted via Discord appear immediately in the Sylvia Ross callouts list
- Daily auto-post fires within 1 minute of the configured time
- Multiple guilds can connect to different schedulers independently
