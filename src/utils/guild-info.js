'use strict';

/**
 * guild-info.js — Boost tier detection, emoji/resource limits, permission checks.
 * All functions are read-only — no writes to Discord API.
 */

const EMOJI_SLOTS    = { 0: 50,  1: 100, 2: 150, 3: 250 };
const STICKER_SLOTS  = { 0: 5,   1: 15,  2: 30,  3: 60  };

function getBoostTier(guild) {
  return guild.premiumTier ?? 0;
}

function getMaxEmojiSlots(guild) {
  return EMOJI_SLOTS[getBoostTier(guild)] ?? 50;
}

function getMaxStickerSlots(guild) {
  return STICKER_SLOTS[getBoostTier(guild)] ?? 5;
}

function getAvailableEmojiSlots(guild) {
  return Math.max(0, getMaxEmojiSlots(guild) - guild.emojis.cache.size);
}

function getAvailableStickerSlots(guild) {
  return Math.max(0, getMaxStickerSlots(guild) - guild.stickers.cache.size);
}

function canUseRoleIcons(guild) {
  return getBoostTier(guild) >= 2;
}

function canUseBanner(guild) {
  return getBoostTier(guild) >= 1;
}

function botHasPermission(guild, permission) {
  return guild.members.me?.permissions.has(permission) ?? false;
}

/**
 * Run a full preflight check before any command that creates/modifies server resources.
 * @param {Guild} guild
 * @param {string[]} permissions — discord.js permission flag names
 * @returns {{ name: string, pass: boolean, note?: string }[]}
 */
function preflightCheck(guild, permissions = []) {
  const results = [];

  for (const perm of permissions) {
    results.push({ name: perm, pass: botHasPermission(guild, perm) });
  }

  results.push({
    name: 'Channel limit',
    pass: guild.channels.cache.size < 480,
    note: `${guild.channels.cache.size}/500 channels used`,
  });

  results.push({
    name: 'Role limit',
    pass: guild.roles.cache.size < 240,
    note: `${guild.roles.cache.size}/250 roles used`,
  });

  return results;
}

function allPassed(results) {
  return results.every(r => r.pass);
}

function formatPreflight(results) {
  return results
    .map(r => `${r.pass ? '✅' : '❌'} **${r.name}**${r.note ? ` — ${r.note}` : ''}`)
    .join('\n');
}

module.exports = {
  getBoostTier,
  getMaxEmojiSlots,
  getMaxStickerSlots,
  getAvailableEmojiSlots,
  getAvailableStickerSlots,
  canUseRoleIcons,
  canUseBanner,
  botHasPermission,
  preflightCheck,
  allPassed,
  formatPreflight,
};
