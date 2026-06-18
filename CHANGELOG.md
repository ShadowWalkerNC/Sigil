# Changelog

All notable changes to **Sigil** are documented here.

Format: [Semantic Versioning](https://semver.org/) — `[version] — YYYY-MM-DD`

---

## [1.9.0] — 2026-06-18

### Added
- **`/template`** slash command — load any of the 8 built-in brand templates directly from Discord and instantly receive a full rendered kit (icon + banner + palette)
  - `name` option: dropdown of all 8 templates with genre label (e.g. `Demonfall — Dark Fantasy`)
  - `icon_text` option: optional override for the icon initials (default: template default, max 4 chars)
  - `brand_name` option: optional override for the brand name shown in the embed title
  - Templates mirror the GUI exactly: same colors, background, border, font, glow, opacity, and shape per template
  - Result saved to per-user command history via `saveEntry`
  - Embed footer hints at `/gui open` for further customisation in the Visual Builder
- `src/commands/template.js` — new command file, auto-registered by `src/index.js` glob

---

## [1.8.0] — 2026-06-18

### Added
- **Shape-aware borders** — all border styles in `src/utils/borders.js` now receive the active `shape` and trace the correct silhouette path (circle, rounded, hexagon, diamond, square) instead of always drawing a rectangle
- **`neon` border style** — animated-look multi-layer neon glow that pulses outward along the shape edge
- **`rainbow` border style** — conic-gradient rainbow stroke traced along the shape path
- Total border styles: **8** (was 6)

### Changed
- `renderIcon` in `canvas.js` passes `shape` through to `getBorderById().draw()` for all border types
- GUI border chip list and `/help` updated to include `neon` and `rainbow`

---

## [1.7.0] — 2026-06-18

### Added
- **12 missing named background presets** in `src/utils/backgrounds.js` — these IDs were referenced by GUI templates and the Gemini AI prompt but had no `draw()` implementation (silently fell back to `solid-black`):
  - `midnight-gradient` — 3-stop deep-purple linear gradient
  - `deep-space` — dark base + deterministic star field + nebula radial glow
  - `inferno` — bottom-up fire gradient + heat shimmer radial
  - `ocean-depth` — deep-blue linear gradient + caustic light ray strokes
  - `twilight` — 4-stop dusk vertical (indigo → magenta → orange)
  - `aurora` — dark base + 3 overlapping radial aurora band glows
  - `storm` — grey radial vortex + faint lightning bolt stroke
  - `void` — pure black + subtle dark radial vignette + distant star pinpricks
  - `neon-city` — sky gradient + building silhouettes + 3 neon radial glows
  - `sunset-fade` — 5-stop sunset sky + sun disc radial highlight
  - `forest-night` — dark sky + moon glow radial + 10 deterministic tree silhouettes
  - `polar` — ice-blue sky gradient + aurora shimmer + snow ground ellipse
- Total background count: **32** (was 20)

### Fixed
- `bg-image-1` (Abstract Mesh) and `bg-image-2` (Neon Lines) previously used `Math.random()` for positions, producing different output on every render. Both now use **fixed coordinate arrays** for deterministic, consistent output.

---

## [1.6.1] — 2026-06-18

### Added
- **`/compare`** — `shape_a` and `shape_b` options (Circle / Rounded / Square / Hexagon / Diamond); each design renders with its own independent shape clip
- **`/avatar`** — `shape` option (defaults to `circle`); overlay image is now clipped to the **same shape** as the base icon using `applyShapeClip` — previously the overlay was always circle-cropped regardless of shape

### Changed
- `/compare` embed fields expanded from single-line to 3-line breakdown (text, shape, BG/border)
- `/compare` gap background darkened from `#000000` to `#111111`
- `/avatar` now imports `applyShapeClip` from `canvas.js` instead of inlining a hardcoded circle clip

---

## [1.6.0] — 2026-06-18

### Added
- **`shape` option** added to `/icon`, `/logo`, `/random` slash commands
  - Choices: Circle, Rounded, Square, Hexagon, Diamond
  - `/random` picks a shape automatically and displays it in the result embed
  - Shape label shown as embed field in `/icon` and `/logo` replies
  - Shape saved to per-user command history
- **`/help`** updated to document `shape` option on all relevant commands
- **`SHAPE_CHOICES`** constant shared across command files

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
- **Light/dark theme toggle**
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
