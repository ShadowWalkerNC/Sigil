/**
 * src/utils/guiAuth.js
 * Bearer-token authentication middleware for the GUI server.
 *
 * Set GUI_AUTH_TOKEN in your environment to a long random string:
 *   openssl rand -hex 32
 *
 * Requests must include ONE of:
 *   Authorization: Bearer <token>   (used by POST / PUT / DELETE)
 *   ?token=<token> query param      (used by GET requests and WebSocket upgrades)
 *
 * If GUI_AUTH_TOKEN is not set the middleware BLOCKS all requests with 503
 * so the server is never accidentally left open.
 */

const crypto = require('crypto');

function guiAuthMiddleware(req, res, next) {
    const secret = process.env.GUI_AUTH_TOKEN || '';

    if (!secret) {
        return res.status(503).json({
            ok: false,
            error: 'GUI_AUTH_TOKEN is not configured. Set it in your environment to enable API access.',
        });
    }

    // Accept token from Authorization header (POST/PUT/DELETE) or ?token= (GET)
    const authHeader = String(req.headers['authorization'] || '').trim();
    const fromHeader = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    const fromQuery  = String(req.query?.token || '').trim();
    const provided   = fromHeader || fromQuery;

    if (!provided) {
        return res.status(401).json({ ok: false, error: 'Missing auth token.' });
    }

    // Constant-time comparison to prevent timing attacks (ASVS V2.7)
    let valid = false;
    try {
        const a = Buffer.from(provided);
        const b = Buffer.from(secret);
        if (a.length === b.length) {
            valid = crypto.timingSafeEqual(a, b);
        }
    } catch {
        valid = false;
    }

    if (!valid) {
        return res.status(401).json({ ok: false, error: 'Invalid token.' });
    }

    return next();
}

module.exports = { guiAuthMiddleware };
