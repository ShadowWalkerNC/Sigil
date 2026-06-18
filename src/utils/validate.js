'use strict';

/**
 * validate.js — Image validation middleware
 * Checks buffer size, dimensions, and format before any Discord upload.
 */

const LIMITS = {
  icon:     { maxBytes: 10 * 1024 * 1024, minSize: 128, mustBeSquare: true },
  banner:   { maxBytes: 10 * 1024 * 1024, minSize: 0,   mustBeSquare: false },
  emoji:    { maxBytes: 256 * 1024,       minSize: 32,  mustBeSquare: true },
  sticker:  { maxBytes: 512 * 1024,       minSize: 320, mustBeSquare: false },
  roleIcon: { maxBytes: 256 * 1024,       minSize: 64,  mustBeSquare: true },
};

/**
 * Read PNG dimensions directly from the IHDR chunk.
 * Returns { width, height } or throws if not a valid PNG.
 */
function readPngDimensions(buffer) {
  const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  for (let i = 0; i < PNG_MAGIC.length; i++) {
    if (buffer[i] !== PNG_MAGIC[i]) throw new Error('File is not a valid PNG.');
  }
  const width  = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  return { width, height };
}

/**
 * Core validator — used by all asset-type helpers below.
 */
function validate(buffer, type) {
  if (!Buffer.isBuffer(buffer)) throw new Error('Expected a Buffer.');
  const limit = LIMITS[type];
  if (!limit) throw new Error(`Unknown asset type: ${type}`);

  if (buffer.length > limit.maxBytes) {
    const kb    = Math.round(buffer.length / 1024);
    const maxKb = Math.round(limit.maxBytes / 1024);
    throw new Error(`${type} is ${kb}KB — exceeds Discord limit of ${maxKb}KB.`);
  }

  const { width, height } = readPngDimensions(buffer);

  if (limit.minSize > 0 && (width < limit.minSize || height < limit.minSize)) {
    throw new Error(`${type} must be at least ${limit.minSize}×${limit.minSize}px (got ${width}×${height}).`);
  }

  if (limit.mustBeSquare && width !== height) {
    throw new Error(`${type} must be square (got ${width}×${height}).`);
  }

  return { valid: true, width, height };
}

function validateIcon(buffer)     { return validate(buffer, 'icon');     }
function validateBanner(buffer)   { return validate(buffer, 'banner');   }
function validateEmoji(buffer)    { return validate(buffer, 'emoji');    }
function validateSticker(buffer)  { return validate(buffer, 'sticker');  }
function validateRoleIcon(buffer) { return validate(buffer, 'roleIcon'); }

/**
 * Returns a friendly error string instead of throwing. Returns null on success.
 */
function safeValidate(buffer, type) {
  try {
    validate(buffer, type);
    return null;
  } catch (e) {
    return e.message;
  }
}

module.exports = { validateIcon, validateBanner, validateEmoji, validateSticker, validateRoleIcon, safeValidate };
