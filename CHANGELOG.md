# Changelog

All notable changes to **Sigil** are documented here.

Format: [Semantic Versioning](https://semver.org/) — `[version] — YYYY-MM-DD`

---

## [1.3.0] — 2026-06-17

### Added
- **GUI Visual Builder** (`gui/`) — browser-based drag-and-drop brand kit designer
  - `gui/gui-server.js` — Express server with `/preview` and `/generate` endpoints
  - `gui/sigil-gui-builder.html` — full single-page GUI (color pickers, live preview, AI generate)
  - `/gui open` slash command to share the GUI link
  - `/gui status` slash command to check if GUI server is online
- **`railpack.json`** — Railpack build config for Railway deployments with canvas native deps
- **`railway.toml`** — Railway start command targeting `src/index.js`

### Changed
- `src/commands/gui.js` — now has `open` and `status` subcommands
- `src/index.js` — registers commands from `src/commands/` using fs glob

---

## [1.2.0] — 2026-06-16

### Added
- `/brand ai` subcommand — describe your server, AI returns full brand kit JSON + renders it
- `/brand kit` subcommand — manual brand kit builder (icon + banner + palette)
- `/mood` command — AI-generated color palette from a mood description
- `/compare` command — side-by-side icon comparison
- `/random` command — fully randomized icon generation
- `/preview` command — grid preview of all backgrounds
- `/saveme` command — save most recent design as a named kit
- `/history` command — view recent command history with copy-paste commands
- `/avatar` command — server avatar / profile icon with optional image overlay
- `src/utils/gemini.js` — Gemini API helpers (`geminiRequest`, `geminiImageRequest`, `extractJson`)
- `src/utils/history.js` — file-based per-user command history
- `src/utils/backgrounds.js` — 20 background presets
- `src/utils/borders.js` — 6 border styles
- `src/utils/canvas.js` — unified render utilities (`renderIcon`, `renderBanner`, `renderPalette`, `renderKit`)
- `src/utils/fonts.js` — font registration and listing
- `src/fonts/` — bundled font files

### Changed
- `/icon` — now uses unified canvas utilities
- `/banner` — now uses unified canvas utilities
- `/logo` — now uses unified canvas utilities
- `/help` — updated to document all new commands

---

## [1.1.0] — 2026-06-15

### Added
- `/banner` command with subtitle, alignment, and glow options
- `/logo` command with solid/transparent background support
- `src/utils/backgrounds.js` (initial: gradient presets)
- `src/utils/borders.js` (initial: solid, glow, gradient)

### Changed
- `/icon` — added font, glow, and opacity options

---

## [1.0.0] — 2026-06-14

### Added
- Initial release
- `/icon` command — generate a square server icon
- `/help` command
- Discord.js v14 slash command framework
- `src/events/ready.js` and `src/events/interactionCreate.js`
