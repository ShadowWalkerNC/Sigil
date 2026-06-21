# Changelog

All notable changes to **Sigil** are documented here.

Format: [Semantic Versioning](https://semver.org/) — `[version] — YYYY-MM-DD`

---

## [2.6.0] — 2026-06-21

### Added
- **`gui/setup.html`** — 5-step setup wizard (Credentials → Features → Channels → Deploy → Done). Discord-style sidebar layout with `--theme-*` CSS variables for full theme customisation. Served at `GET /setup`.
- **`POST /api/setup/validate-token`** — Validates a Discord bot token + client ID via Discord REST before the wizard advances.
- **`POST /api/setup/save-config`** — Persists package selection and channel/role IDs to `data/sigil-config.json`.
- **`POST /api/control/deploy-commands`** — Streams `deploy-commands.js` output as NDJSON. Requires `x-control-secret` header matching `CONTROL_SECRET` env var.
- **`src/services/postpilot.js`** — Post-Pilot REST API bridge. Methods: `health`, `generatePost`, `publishPost`, `generateAndPublish`, `getHistory`, `getSiteConfig`, `isConfigured`, `formatResults`, `parsePlatforms`.
- **`src/commands/post.js`** — `/post` slash command — AI social media post generation and publishing via Post-Pilot.
- **`src/commands/poststatus.js`** — `/poststatus` slash command — Post-Pilot connection health and recent post history.
- **`SHADOWREALM_NETWORK.md`** — ShadowRealm Network (SRN) app contract v1.0. Defines inter-app identity, `X-SRN-App` header protocol, and integration expectations for all SRN-connected services.
- **`.env.example`** — Added `POSTPILOT_URL`, `POSTPILOT_API_KEY`, `POSTPILOT_USER_ID`, `POSTPILOT_SRN_APP`, `POSTPILOT_TIMEOUT_MS` entries.

### Changed
- **`gui/gui-server.js`** bumped to **v2.6.0**. New routes: `/setup` (GET), `/api/setup/validate-token` (POST), `/api/setup/save-config` (POST), `/api/control/deploy-commands` (POST streaming). `requireControlSecret()` middleware added for protected control routes.
- **`CONTRIBUTING.md`** — Full rewrite for v2.6 architecture: project layout, setup wizard guide, GUI route authoring, PR checklist.
- **`gui/setup.html`** — Redesigned from generic dark theme to Discord server-settings layout. Full Discord color palette via CSS custom properties; all colors overridable without touching markup.

---

## [2.5.0] — 2026-06-20

### Added
- **`gui/developers.html`** — Developers page with API reference, navbar link on all GUI pages
- **`gui/sigil-community.html`** — Community Tools page (welcome cards, rank cards, server stats)
- **`gui/404.html`** — Branded 404 error page matching Sigil dark theme
- **`/setup` route** — `setup.html` now served at `/setup` instead of being orphaned in root
- **`express-rate-limit`** — 20 requests/minute per IP on all `/preview/*` canvas routes
- **`safeText()`** — Input sanitizer strips control characters from all user text fields
- **`docs/API.md`** — Full GUI server API reference

### Changed
- **AI Generate disabled** — `/generate` endpoint returns 503 Coming Soon; GUI button and textarea disabled with Coming Soon banner
- **Node engine** bumped from `>=18 <19` to `>=20 <23` (Node 18 is EOL)
- **`.gitignore`** — Added `.env.local`, `.env.*.local`, editor dirs (`.vscode/`, `.idea/`)
- **`package.json`** — Added `express-rate-limit` dep, `eslint` devDep, `lint` and `test` scripts
- **README** — Updated version, file tree, GUI feature list (AI status), Node prerequisite, badges
- **`docs/CONTEXT.md`** — Updated to v2.0.0 state

### Fixed
- **Brand Builder → Community** nav link corrected from `/` to `/brand`
- **404 catch-all** added to `gui-server.js` — unknown routes now return HTTP 404 with branded page instead of raw Express error
- **Color autocomplete — all commands** — replaced broken `colorAutocomplete(interaction)` call with correct `getColorAutocomplete(focused)` pattern across all 25 commands that use color options
- **`/mood`** — added `saveEntry()` call so AI-generated palettes are saved to history

### Removed
- **`src/utils/database.js`** — dead file; all active DB logic lives in `src/utils/db.js`

---

## [2.4.0] — 2026-06-20

### Added
- **`src/util/logBuffer.js`** — In-memory ring buffer (1 000 entries) for all `console` output. `patch()` intercepts `console.log/warn/error`, stamps entries with `{ ts, level, text }`, and notifies subscribers. Supports `tail(n, level?)` and pub/sub via `subscribe(fn)` / `unsubscribe(fn)`.
- **`GET /api/logs`** — Returns last N lines from the ring buffer. Query params: `tail` (1–500, default 50), `level` (`info` | `warn` | `error`). Rate-limited (60 req/min).
- **`WS /ws/logs`** — WebSocket stream of real-time log entries. Optional `?level=` filter. Used by `sigil logs --live`.
- **`GET /api/packages`** — Returns all package states for a guild. Requires `?guild_id=`.
- **`POST /api/packages`** — Enable or disable a named package for a guild.
- **`POST /api/media/enqueue`** — Proxies to ASCILINE `stream_server.py /api/enqueue`.
- **`POST /api/media/skip|stop|seek|volume|loop|mode|cols`** — Full ASCILINE playback control surface.
- **`GET /api/media/status`** — Proxies ASCILINE `/api/status`.
- **`GET /api/media/queue`** — Proxies ASCILINE `/api/queue`.
- **`GET /api/status/full`** — Aggregated health snapshot: `{ gui, bot, asciline, last_error }`.
- **`src/commands/status.js`** — `/status` Discord slash command with color-coded health embed.
- **`src/cli/status.js`** — `sigil status` CLI module with ANSI output and `--json` flag.
- **`src/cli/commands/status.js`** — CLI dispatcher adapter.

### Changed
- **`gui-server.js`** bumped to **v2.4.0**.
- **`src/cli/index.js`** — `status` added to the commands map.
- **`src/cli/lib/help.js`** — `sigil status` entry added.

---

## [1.11.1] — 2026-06-18

### Removed
- **`/minecraft`** command and `docs/MINECRAFT.md`

---

## [1.11.0] — 2026-06-18

### Added
- **`/palette export`** slash command — CSS Variables, Tailwind Config, Hex List formats

---

## [1.10.0] — 2026-06-18

### Added
- **`/brand share`** subcommand — shareable GUI link pre-loaded from last kit via base64 URL hash

---

## [1.9.0] — 2026-06-18

### Added
- **`/template`** slash command — 8 built-in brand templates, full kit render, history save

---

## [1.8.0] — 2026-06-18

### Added
- Shape-aware borders; `neon` and `rainbow` border styles; total: **8**

---

## [1.7.0] — 2026-06-18

### Added
- 12 missing named background presets; total: **32**

### Fixed
- `bg-image-1` / `bg-image-2` now deterministic (fixed coordinates)

---

## [1.6.1] — 2026-06-18

### Added
- `/compare` and `/avatar` shape options

---

## [1.6.0] — 2026-06-18

### Added
- `shape` option on `/icon`, `/logo`, `/random`

---

## [1.5.1] — 2026-06-18

### Added
- `applyShapeClip()` in `canvas.js`, `safeShape()` in `gui-server.js`

---

## [1.5.0] — 2026-06-18

### Added
- Icon Shape Selector in GUI, shape in URL hash and Config JSON, shape defaults on all 8 templates

---

## [1.4.0] — 2026-06-18

### Added
- 8 brand templates, 7 size presets, URL hash share, Randomize, theme toggle, health pill, Export dialog

---

## [1.3.0] — 2026-06-17

### Added
- GUI Visual Builder, `railpack.json`, `railway.toml`

---

## [1.2.0] — 2026-06-16

### Added
- `/brand ai`, `/brand kit`, `/mood`, `/compare`, `/random`, `/preview`, `/saveme`, `/history`, `/avatar`

---

## [1.1.0] — 2026-06-15

### Added
- `/banner`, `/logo`, font/glow/opacity on `/icon`

---

## [1.0.0] — 2026-06-14

### Added
- Initial release: `/icon`, `/help`, Discord.js v14 framework
