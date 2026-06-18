'use strict';

/**
 * guild-info.js — Boost tier detection, emoji/resource limits, permission checks.
 * All functions are read-only — no writes to Discord API.
 */

// ── Boost tier tables ─────────────────────────────────────────────────────────

const EMOJI_SLOTS = { 0: 50, 1: 100, 2: 150, 3: 250 };
const STICKER_SLOTS = { 0: 5, 1: 15, 2: 30, 3: 60 };

/**
 * @param {import('discord.js').Guild} guild
 * @returns {0|1|2|3}
 */
export function getBoostTier(guild) {
  return guild.premiumTier ?? 0;
}

/**
 * Maximum emoji slots available at the guild's current boost tier.
 * @param {import('discord.js').Guild} guild
 * @returns {number}
 */
export function getMaxEmojiSlots(guild) {
  return EMOJI_SLOTS[getBoostTier(guild)] ?? 50;
}

/**
 * Maximum sticker slots available at the guild's current boost tier.
 * @param {import('discord.js').Guild} guild
 * @returns {number}
 */
export function getMaxStickerSlots(guild) {
  return STICKER_SLOTS[getBoostTier(guild)] ?? 5;
}

/**
 * How many emoji slots are still available (existing emojis subtracted).
 * @param {import('discord.js').Guild} guild
 * @returns {number}
 */
export function getAvailableEmojiSlots(guild) {
  return Math.max(0, getMaxEmojiSlots(guild) - guild.emojis.cache.size);
}

/**
 * How many sticker slots are still available.
 * @param {import('discord.js').Guild} guild
 * @returns {number}
 */
export function getAvailableStickerSlots(guild) {
  return Math.max(0, getMaxStickerSlots(guild) - guild.stickers.cache.size);
}

/**
 * Whether the guild's boost tier allows role icons (requires tier 2+).
 * @param {import('discord.js').Guild} guild
 * @returns {boolean}
 */
export function canUseRoleIcons(guild) {
  return getBoostTier(guild) >= 2;
}

/**
 * Whether the guild's boost tier allows a server banner (requires tier 1+).
 * @param {import('discord.js').Guild} guild
 * @returns {boolean}
 */
export function canUseBanner(guild) {
  return getBoostTier(guild) >= 1;
}

// ── Permission checks ─────────────────────────────────────────────────────────

/**
 * Check if the bot has a specific permission in the guild.
 * @param {import('discord.js').Guild} guild
 * @param {import('discord.js').PermissionResolvable} permission
 * @returns {boolean}
 */
export function botHasPermission(guild, permission) {
  return guild.members.me?.permissions.has(permission) ?? false;
}

/**
 * Run a full preflight check and return a result array.
 * Use this before any command that creates or modifies server resources.
 *
 * @param {import('discord.js').Guild} guild
 * @param {string[]} permissions — discord.js permission flag names to check
 * @returns {{ name: string, pass: boolean, note?: string }[]}
 */
export function preflightCheck(guild, permissions = []) {
  const results = [];

  // Permission checks
  for (const perm of permissions) {
    results.push({
      name: perm,
      pass: botHasPermission(guild, perm),
    });
  }

  // Resource limit checks (always included)
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

/**
 * Returns true only if every item in a preflightCheck result passed.
 * @param {{ pass: boolean }[]} results
 * @returns {boolean}
 */
export function allPassed(results) {
  return results.every(r => r.pass);
}

/**
 * Format a preflight result array into a human-readable string
 * suitable for a Discord embed field.
 * @param {{ name: string, pass: boolean, note?: string }[]} results
 * @returns {string}
 */
export function formatPreflight(results) {
  return results
    .map(r => `${r.pass ? '✅' : '❌'} **${r.name}**${r.note ? ` — ${r.note}` : ''}`)
    .join('\n');
}
