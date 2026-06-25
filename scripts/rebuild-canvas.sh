#!/usr/bin/env bash
set -e

echo "[canvas] Locating nix store paths..."

CAIRO_DIR=$(find /nix/store -maxdepth 2 -name 'cairo' -type d 2>/dev/null | head -1)
PIXMAN_DIR=$(find /nix/store -maxdepth 1 -name 'pixman*' -type d 2>/dev/null | head -1)
PANGO_DIR=$(find /nix/store -maxdepth 1 -name 'pango*' -type d 2>/dev/null | grep -v bin | head -1)
GLIB_DIR=$(find /nix/store -maxdepth 1 -name 'glib-2*' -type d 2>/dev/null | head -1)
FONT_DIR=$(find /nix/store -maxdepth 1 -name 'fontconfig*lib*' -o -name 'fontconfig-2*' -type d 2>/dev/null | head -1)
FREE_DIR=$(find /nix/store -maxdepth 1 -name 'freetype*' -type d 2>/dev/null | grep -v bin | head -1)
HARF_DIR=$(find /nix/store -maxdepth 1 -name 'harfbuzz*' -type d 2>/dev/null | grep -v bin | head -1)
JPEG_DIR=$(find /nix/store -maxdepth 1 -name 'libjpeg*' -type d 2>/dev/null | grep -v bin | head -1)
GIF_DIR=$(find /nix/store -maxdepth 1 -name 'giflib*' -type d 2>/dev/null | head -1)

# Collect all pkgconfig dirs
PKG_CONFIG_PATH=$(find /nix/store -maxdepth 5 -name 'pkgconfig' -type d 2>/dev/null | sort -u | paste -sd ':' -)
export PKG_CONFIG_PATH
echo "[canvas] PKG_CONFIG_PATH=$PKG_CONFIG_PATH"

# Try pkg-config first
if pkg-config --exists cairo 2>/dev/null; then
  echo "[canvas] pkg-config found cairo, rebuilding..."
  npm rebuild canvas --build-from-source
else
  echo "[canvas] pkg-config cannot find cairo, trying npm_config overrides..."
  # Find the actual cairo store path with include/cairo
  CAIRO_INC=$(find /nix/store -maxdepth 3 -name 'cairo.h' 2>/dev/null | head -1 | xargs dirname 2>/dev/null)
  CAIRO_LIB=$(find /nix/store -maxdepth 3 -name 'libcairo.so' -o -name 'libcairo.so.2' 2>/dev/null | head -1 | xargs dirname 2>/dev/null)
  echo "[canvas] CAIRO_INC=$CAIRO_INC  CAIRO_LIB=$CAIRO_LIB"

  if [ -z "$CAIRO_INC" ] || [ -z "$CAIRO_LIB" ]; then
    echo "[canvas] ERROR: Cannot locate cairo headers or lib in nix store"
    find /nix/store -maxdepth 3 -name 'cairo*' 2>/dev/null | head -20
    exit 1
  fi

  npm_config_cairo_includes="$CAIRO_INC" \
  npm_config_cairo_libraries="$CAIRO_LIB" \
  npm rebuild canvas --build-from-source
fi
