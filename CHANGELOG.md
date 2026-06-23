# Changelog

All notable changes to Sigil are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)

---

## [2.8.0] — 2026-06-22

### Security
- Removed committed `.env` file from repository — secrets were present in git history; rotate any credentials that were stored there
- Added `.env` warning note to README environment variables section
- Confirmed `.env` is correctly listed in `.gitignore`
- Removed stale root-level `setup.html` duplicate (canonical copy lives at `gui/setup.html`)

### Fixed
- `guiAuthMiddleware` now correctly exempts `/api/setup/validate-token` from auth so the setup wizard can verify a bot token before a `GUI_AUTH_TOKEN` is configured
- Fixed `verify-btn` ID collision in `gui/setup.html` — each platform verify button now has a unique ID
- Auth-gated verify endpoints (`/api/setup/verify/*`) now receive the `Authorization` header correctly from the setup wizard frontend

### Changed
- README: added Security section documenting all auth layers, rate limits, and SSRF guard
- README: updated API reference table to include auth requirements per endpoint
- README: clarified `.env.example` workflow with explicit warning against committing `.env`
- CHANGELOG: retroactively organized prior releases

---

## [2.7.0] — 2026-06-20

### Added
- Full GUI authentication system (`guiAuthMiddleware`) — all `/api/*` and `/preview/*` routes require `GUI_AUTH_TOKEN`
- Discord OAuth2 login flow (`/auth/discord` → `/auth/discord/callback`) as primary auth method
- Token-entry fallback login page (`/login`) with `auth.js` client-side helper
- `authFetch()` helper — automatically injects auth header and redirects to `/login` on 401
- WebSocket log stream auth via `?token=` query param
- SSRF guard (`src/utils/ssrfGuard.js`) on all user-supplied URLs
- Webhook queue (`src/utils/webhookQueue.js`) — debounced, ordered dispatch for Twitch/YouTube/GitHub events
- `GUI_AUTH_TOKEN` and `CONTROL_SECRET` documented in `.env.example`

### Changed
- `/api/status/full` moved above `guiAuthMiddleware` — public read-only health endpoint, no token required
- Rate limiter split: separate limiters for auth, render, webhook, API, media, control, bash, setup routes
- Setup wizard verify endpoints moved under `/api/setup/verify/*` namespace

---

## [2.6.0] — 2026-06-15

### Added
- Setup wizard (`/setup`) — step-by-step guided onboarding for new deployments
- Platform connection verification endpoints: OpenAI, YouTube, Twitch, Spotify, ElevenLabs, MongoDB, Redis, GitHub
- `POST /api/setup/save-config` — persists wizard selections (packages, channels, platforms) to SQLite
- `POST /api/setup/validate-token` — live Discord bot token validation before wizard completes
- Packages toggle page (`/packages`) — enable/disable feature bundles per guild from the browser
- `src/utils/packages.js` — package enable/disable/state helpers

### Changed
- GUI server bumped to v2.6 (`VERSION = '2.6.0'`)

---

## [2.5.0] — 2026-06-10

### Added
- ASCILINE media queue integration — `/api/media/*` proxy endpoints (enqueue, skip, stop, seek, volume, loop, mode, cols, status, queue)
- `assertSafeUrl` SSRF guard on `/api/media/enqueue`
- Bash terminal endpoint `POST /api/control/bash` — auth-gated, rate-limited, 15s timeout, 512KB buffer
- `CONTROL_SECRET` header requirement on control endpoints
- `GET /api/control/deploy-commands` — streaming NDJSON deploy log

### Changed
- Media endpoints on separate `mediaLimiter` (30/min)
- Control endpoints on `controlLimiter` (5/min)

---

## [2.4.0] — 2026-06-05

### Added
- Status dashboard (`/status`) — real-time bot health, service heartbeats, live log tail via WebSocket
- `GET /api/status/full` — aggregated health response (bot, GUI, ASCILINE, services, last error)
- SQLite IPC bridge — bot writes `bot_heartbeat` and `service_registry` rows; GUI server reads via read-only connection
- `serviceRegistry.js` — in-process service health tracker with status, error count, last heartbeat
- `logBuffer.js` — in-process log ring buffer with subscribe/unsubscribe for WebSocket streaming
- WebSocket log endpoint `ws://host/ws/logs` — live log push with level filter

---

## [2.3.0] — 2026-05-28

### Added
- Developer docs page (`/developers`) — API reference, webhook config, integration guide
- Community tools GUI (`/community`) — welcome card previews, reaction roles, giveaway controls
- Brand builder live canvas GUI (`/brand`) — icon, banner, palette preview with real-time render
- Preview endpoints: `POST /preview`, `POST /preview/welcome`, `POST /preview/rankcard`, `POST /preview/serverstats`
- `renderKit()` in `src/utils/canvas.js` — unified canvas render pipeline
- Background registry (`src/utils/backgrounds.js`) — named gradient/pattern presets

---

## [2.2.0] — 2026-05-20

### Added
- Webhook trigger endpoint `POST /webhook/trigger` — external event dispatch (Twitch, YouTube, GitHub)
- HMAC verification (`src/utils/hmac.js`) on webhook payloads via `x-sigil-signature`
- `handleTwitchLive`, `handleYouTubeUpload`, `handleGitHubPush` in `src/automation/webhookHandler.js`

---

## [2.1.0] — 2026-05-12

### Added
- XP & Levels system — `/xprank`, `/xpleaderboard`, `/weeklyleaderboard`, `/loyalty`, `/levelroles`, `/xpadmin`
- Weekly XP reset job (auto Sunday)
- Level-based auto-role assignment
- Loyalty card canvas generator

---

## [2.0.0] — 2026-05-01

### Added
- GUI server (`gui/gui-server.js`) — Express HTTP + WebSocket bridge, replaces inline bot HTTP server
- Express rate limiting via `express-rate-limit`
- Static page serving: `/`, `/brand`, `/community`, `/developers`, `/packages`, `/status`, `/setup`, `/login`
- `GET /health` — unauthenticated JSON health check
- PM2 `ecosystem.config.js` — runs bot + GUI as separate processes
- Railway `nixpacks.toml` + `railway.toml` deployment config
- `.env.example` with all variable definitions

### Changed
- Bot and GUI now run as **separate Node processes** sharing one SQLite file
- Port default changed from 3420 → 8080 to match Railway conventions

---

## [1.x] — Pre-GUI (legacy)

### Included at 1.0
- 71 slash commands across Brand, Moderation, Community, XP, Scheduler, Integrations, Faith, CulinaryOS
- SQLite schema (`src/db.js`) with `migrate()` helper for safe ALTER TABLE re-runs
- Discord.js v14 slash command handler + event system
- Twitch live alerts (15s poll) + YouTube upload alerts (60s poll)
- CulinaryOS bridge — `/menu`, `/recipe`, `/inventory` + inbound webhook handler
- API.Bible integration for `/devotional` (400+ translations)
- Scheduled content engine — queue any message/embed/banner to any channel
- Staff shift board with automated daily roster posts
