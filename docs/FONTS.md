# Fonts

Sigil ships font **registry entries** for six typefaces, but several of the
corresponding font files are placeholder stubs in the repository (to avoid
redistributing third-party assets under incompatible licences).

Replace each stub with the real file downloaded from the source below, then
restart the bot. The file must keep the **exact filename** shown.

| Key | Label | Filename | Download |
|---|---|---|---|
| `another-danger` | Another Danger | `font.otf` | [DaFont — Another Danger](https://www.dafont.com/another-danger.font) |
| `bebas-neue` | Bebas Neue | `BebasNeue-Regular.ttf` | [Google Fonts](https://fonts.google.com/specimen/Bebas+Neue) |
| `oswald` | Oswald | `Oswald-Bold.ttf` | [Google Fonts](https://fonts.google.com/specimen/Oswald) |
| `playfair` | Playfair Display | `PlayfairDisplay-Bold.ttf` | [Google Fonts](https://fonts.google.com/specimen/Playfair+Display) |
| `dancing-script` | Dancing Script | `DancingScript-Bold.ttf` | [Google Fonts](https://fonts.google.com/specimen/Dancing+Script) |
| `source-code-pro` | Source Code Pro | `SourceCodePro-Bold.ttf` | [Google Fonts](https://fonts.google.com/specimen/Source+Code+Pro) |

All Google Fonts are free under the [SIL Open Font Licence](https://scripts.sil.org/OFL).

## Quick install (curl)

Run this from the repo root to replace all stubs at once:

```bash
cd src/fonts

curl -L "https://fonts.gstatic.com/s/bebasneue/v14/JTUSjIg69CK48gW7PXooxW5rygbi49c.woff2" -o BebasNeue-Regular.ttf
curl -L "https://fonts.gstatic.com/s/oswald/v53/TK3_WkUHHAIjg75cFRf3bXL8LICs169vgUFoZAaRliE.ttf" -o Oswald-Bold.ttf
curl -L "https://fonts.gstatic.com/s/playfairdisplay/v37/nuFvD-vYSZviVYUb_rj3ij__anPXJzDwcbmjWBN2PKdFvXDXbtM.ttf" -o PlayfairDisplay-Bold.ttf
curl -L "https://fonts.gstatic.com/s/dancingscript/v25/If2cXTr6YS-zF4S-kcSWSVi_sxjsohD9F50Ruu7BMSo3Sup6hNX6plRP.ttf" -o DancingScript-Bold.ttf
curl -L "https://fonts.gstatic.com/s/sourcecodepro/v23/HI_diYsKILxRpg3hIP6sJ7fM7PqlPevWnsUnxlC9.ttf" -o SourceCodePro-Bold.ttf
```

After running, restart the bot — all six font choices will be live in every
command and in the GUI font picker.

> **How stub detection works:** `fonts.js` checks each font file's size at
> startup. Any file under 1 KB is treated as a stub and silently falls back to
> `another-danger`. No crash, no restart needed during development.
