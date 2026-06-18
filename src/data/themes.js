'use strict';

/**
 * themes.js — 12 gaming/anime brand presets for Sigil v4.0
 */

const THEMES = [
  {
    key:        'cyberpunk',
    name:       'Cyberpunk',
    primary:    '#00FF00',
    secondary:  '#000000',
    background: 'cyberpunk-grid',
    font:       'Oswald',
    border:     'neon',
    glow:       15,
    tags:       ['gaming', 'tech', 'neon'],
  },
  {
    key:        'anime-night',
    name:       'Anime Night',
    primary:    '#FF69B4',
    secondary:  '#000000',
    background: 'midnight-gradient',
    font:       'Dancing Script',
    border:     'none',
    glow:       10,
    tags:       ['anime', 'kawaii', 'night'],
  },
  {
    key:        'esports-red',
    name:       'Esports Red',
    primary:    '#FF0000',
    secondary:  '#000000',
    background: 'carbon-fiber',
    font:       'Bebas Neue',
    border:     'solid',
    glow:       15,
    tags:       ['esports', 'competitive', 'gaming'],
  },
  {
    key:        'ninja',
    name:       'Ninja',
    primary:    '#000000',
    secondary:  '#FF0000',
    background: 'void',
    font:       'Another Danger',
    border:     'dashed',
    glow:       25,
    tags:       ['stealth', 'dark', 'gaming'],
  },
  {
    key:        'galaxy',
    name:       'Galaxy',
    primary:    '#8B0000',
    secondary:  '#4B0082',
    background: 'deep-space',
    font:       'Playfair Display',
    border:     'none',
    glow:       10,
    tags:       ['space', 'dark', 'fantasy'],
  },
  {
    key:        'demon',
    name:       'Demon',
    primary:    '#FF0000',
    secondary:  '#8B0000',
    background: 'inferno',
    font:       'Oswald',
    border:     'glow',
    glow:       25,
    tags:       ['dark', 'fantasy', 'aggressive'],
  },
  {
    key:        'tech-blue',
    name:       'Tech Blue',
    primary:    '#00BFFF',
    secondary:  '#000000',
    background: 'polar',
    font:       'Source Code Pro',
    border:     'solid',
    glow:       15,
    tags:       ['tech', 'clean', 'gaming'],
  },
  {
    key:        'mecha',
    name:       'Mecha',
    primary:    '#C0C0C0',
    secondary:  '#FF0000',
    background: 'storm',
    font:       'Bebas Neue',
    border:     'double',
    glow:       10,
    tags:       ['mecha', 'anime', 'tech'],
  },
  {
    key:        'kawaii',
    name:       'Kawaii',
    primary:    '#FF69B4',
    secondary:  '#FFB6C1',
    background: 'aurora',
    font:       'Dancing Script',
    border:     'none',
    glow:       5,
    tags:       ['kawaii', 'anime', 'soft'],
  },
  {
    key:        'dark-gaming',
    name:       'Dark Gaming',
    primary:    '#1C1C1C',
    secondary:  '#FF0000',
    background: 'midnight-gradient',
    font:       'Oswald',
    border:     'solid',
    glow:       15,
    tags:       ['dark', 'gaming', 'minimal'],
  },
  {
    key:        'spirit',
    name:       'Spirit',
    primary:    '#8B0000',
    secondary:  '#FFFFFF',
    background: 'void',
    font:       'Another Danger',
    border:     'glow',
    glow:       20,
    tags:       ['spirit', 'dark', 'fantasy'],
  },
  {
    key:        'neon-city',
    name:       'Neon City',
    primary:    '#00FF00',
    secondary:  '#FF00FF',
    background: 'neon-city',
    font:       'Oswald',
    border:     'glow',
    glow:       25,
    tags:       ['neon', 'city', 'cyberpunk'],
  },
];

function getTheme(key) {
  return THEMES.find(t => t.key === key);
}

function getThemesByTag(...tags) {
  return THEMES.filter(t => tags.some(tag => t.tags.includes(tag)));
}

function listThemeKeys() {
  return THEMES.map(t => t.key);
}

module.exports = { THEMES, getTheme, getThemesByTag, listThemeKeys };
