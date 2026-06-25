#!/usr/bin/env bash
set -e

# Collect all pkgconfig dirs from the Nix store
PKG_CONFIG_PATH=$(find /nix/store -maxdepth 5 -name '*.pc' 2>/dev/null \
  | xargs -I{} dirname {} \
  | sort -u \
  | paste -sd ':' -)

export PKG_CONFIG_PATH
echo "[canvas] PKG_CONFIG_PATH=$PKG_CONFIG_PATH"

npm rebuild canvas --build-from-source
