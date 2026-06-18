# Changelog

All notable changes to **Sigil** are documented here.

Format: [Semantic Versioning](https://semver.org/) — `[version] — YYYY-MM-DD`

---

## [1.5.1] — 2026-06-18

### Added
- **`applyShapeClip(ctx, W, H, shape)`** exported from `src/utils/canvas.js` — clips the canvas context to the selected shape before drawing, using native Canvas 2D paths:
  - `circle` — `ctx.arc()` centered fill
  - `rounded` — `ctx.roundRect()` with 12% corner radius
  - `hexagon` — 6-point flat-top polygon matching GUI CSS percentages
  - `diamond` — 4-point rotated-square polygon
  - `square` — full rect (no visible clip; keeps code path consistent)
- **`safeShape(s)`** validator in `gui/gui-server.js` — whitelist-only, falls back to `'square'`

### Changed
- `renderIcon` in `canvas.js` now accepts a `shape` option and applies the clip via `ctx.save()` / `ctx.restore()` so border drawing remains unclipped
- `/preview` endpoint now reads `b.shape` from request body and forwards it to `renderKit`
- `/generate` endpoint:
  - Adds `"shape"` field to the Gemini brand-design prompt so the AI picks an appropriate silhouette
  - Validates and passes `shape` to `renderKit`
  - Includes `shape` in the returned `brand` object so the GUI updates the selector
- Health endpoint version bumped to `1.5.1`

---

## [1.5.0] — 2026-06-18

### Added
- **Icon Shape Selector** in GUI Step 3 — 5 shapes with live canvas preview thumbnails:
  - Circle, Rounded, Square, Hexagon, Diamond
  - Each button shows a color-filled mini-shape preview before selection
  - Selecting a shape clips the live icon card in the Preview panel with a CSS transition
- **Shape persisted in URL hash** (`shape` key) — shared links restore the chosen shape
- **Shape included in exported Config JSON** under `visuals.shape`
- **Shape row in embed spec card** — shows human-readable label (e.g. `Circle`)
- All 8 **brand templates now declare a `shape`** default:
  - Demonfall → Circle, Cyber Nexus → Square, Arcane Order → Hexagon, Cozy Den → Rounded, Neon Drift → Diamond, Polar Ops → Square, Emerald Fang → Hexagon, Void Protocol → Circle
- **Randomize** now picks a random shape alongside colors/bg/font/border
- AI Generate can override shape if `b.shape` is returned in the Gemini brand payload

### Changed
- GUI Step 3 header re-ordered: Icon shape → Background → Border → Glow → Font → Overlay opacity → Output size
- `HASH_KEYS` array in GUI extended with `'shape'`

---

## [1.4.0] — 2026-06-18

### Added
- **8 brand templates** in GUI Step 1 — Demonfall (Dark Fantasy), Cyber Nexus (Cyberpunk), Arcane Order (Fantasy RPG), Cozy Den (Community), Neon Drift (Racing), Polar Ops (Tactical FPS), Emerald Fang (Survival RPG), Void Protocol (Sci-Fi)
  - Each template pre-loads brand name, tagline, description, icon text, colors, background, border, font, glow, opacity, gradient, and AI image prompt
  - Active template highlighted with white border; deselects on any manual change
- **7 output size presets** in GUI Step 3 — Discord Icon (512×512), Discord Banner (960×540), Twitch Panel (320×160), Twitch Banner (1200×480), YouTube Art (2560×1440), Reddit Banner (1920×384), Square (1024×1024)
- **URL hash share/restore** — full brand state (including active template and size preset) encoded in URL hash; Share button copies link to clipboard
- **Randomize button** — randomizes colors, background, border, and font; clears active template selection
- **Light/dark theme toggle** in navbar
- **Server health pill** in navbar — live online/offline indicator polling every 8 seconds
- **Export dialog** — exports full config JSON compatible with `/brand ai` and `gemini.js`
- **Copy JSON** button in Output & Palette tab

### Changed
- GUI wizard now shows **4 steps**: Identity (with templates), Colors, Style (with size presets), Generate
- Template active state tracked in URL hash (`activeTemplate` key)
- Randomize and manual color/border/background changes deselect active template
- `state.background` default changed from `midnight-gradient` to `inferno` to match Demonfall default template

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
