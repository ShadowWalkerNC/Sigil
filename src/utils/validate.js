'use strict';

/**
 * validate.js — Image validation middleware
 * Checks buffer size, dimensions, and format before any Discord upload.
 */

const LIMITS = {
  icon:    { maxBytes: 10 * 1024 * 1024, minSize: 128, mustBeSquare: true },
  banner:  { maxBytes: 10 * 1024 * 1024, minSize: 0,   mustBeSquare: false },
  emoji:   { maxBytes: 256 * 1024,       minSize: 32,  mustBeSquare: true },
  sticker: { maxBytes: 512 * 1024,       minSize: 320, mustBeSquare: false },
  roleIcon:{ maxBytes: 256 * 1024,       minSize: 64,  mustBeSquare: true },
};

/**
 * Read PNG dimensions directly from the IHDR chunk.
 * Returns { width, height } or throws if not a valid PNG.
 */
function readPngDimensions(buffer) {
  // PNG magic bytes: 89 50 4E 47 0D 0A 1A 0A
  const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (let i = 0; i < PNG_MAGIC.length; i++) {
    if (buffer[i] !== PNG_MAGIC[i]) throw new Error('File is not a valid PNG.');
  }
  // IHDR starts at byte 16, width at 16, height at 20 (4 bytes each, big-endian)
  const width  = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  return { width, height };
}

/**
 * Core validator — used by all asset-type helpers below.
 * @param {Buffer} buffer
 * @param {'icon'|'banner'|'emoji'|'sticker'|'roleIcon'} type
 * @returns {{ valid: true, width: number, height: number }}
 * @throws {Error} with a human-readable message on failure
 */
function validate(buffer, type) {
  if (!Buffer.isBuffer(buffer)) throw new Error('Expected a Buffer.');
  const limit = LIMITS[type];
  if (!limit) throw new Error(`Unknown asset type: ${type}`);

  // Size check
  if (buffer.length > limit.maxBytes) {
    const kb = Math.round(buffer.length / 1024);
    const maxKb = Math.round(limit.maxBytes / 1024);
    throw new Error(`${type} is ${kb}KB — exceeds Discord limit of ${maxKb}KB.`);
  }

  // Format + dimension check
  const { width, height } = readPngDimensions(buffer);

  if (limit.minSize > 0 && (width < limit.minSize || height < limit.minSize)) {
    throw new Error(`${type} must be at least ${limit.minSize}×${limit.minSize}px (got ${width}×${height}).`);
  }

  if (limit.mustBeSquare && width !== height) {
    throw new Error(`${type} must be square (got ${width}×${height}).`);
  }

  return { valid: true, width, height };
}

// ── Public helpers ────────────────────────────────────────────────────────────

export function validateIcon(buffer)     { return validate(buffer, 'icon');     }
export function validateBanner(buffer)   { return validate(buffer, 'banner');   }
export function validateEmoji(buffer)    { return validate(buffer, 'emoji');    }
export function validateSticker(buffer)  { return validate(buffer, 'sticker'); }
export function validateRoleIcon(buffer) { return validate(buffer, 'roleIcon'); }

/**
 * Convenience: validate and return a friendly embed-ready error string
 * instead of throwing. Returns null on success.
 * @param {Buffer} buffer
 * @param {'icon'|'banner'|'emoji'|'sticker'|'roleIcon'} type
 * @returns {string|null}
 */
export function safeValidate(buffer, type) {
  try {
    validate(buffer, type);
    return null;
  } catch (e) {
    return e.message;
  }
}
