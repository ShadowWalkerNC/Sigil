# Changelog

All notable changes to **Sigil** are documented here.

Format: [Semantic Versioning](https://semver.org/) — `[version] — YYYY-MM-DD`

---

## [1.11.1] — 2026-06-18

### Removed
- **`/minecraft`** command and `docs/MINECRAFT.md` — removed from bot; guide available separately if needed

---

## [1.11.0] — 2026-06-18

### Added
- **`/palette export`** slash command — CSS Variables, Tailwind Config, Hex List formats; auto-loads last kit from history if no colors provided

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
