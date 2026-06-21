/**
 * auth.js — Sigil GUI client-side auth helper v2.7.0
 *
 * Provides:
 *   authFetch(url, options)  — drop-in fetch() replacement that injects the
 *                              Authorization header and surfaces 401 errors.
 *   checkSession()           — call once on page load to verify the session is
 *                              valid; shows a banner and optionally redirects.
 *
 * The GUI_AUTH_TOKEN is stored in sessionStorage after the first successful
 * validation so it isn't re-read from the URL on every request.  Pages that
 * need it should call checkSession() at the bottom of their <script> block.
 *
 * Token resolution order:
 *   1. sessionStorage key "sigil_gui_token"
 *   2. URL query param   ?token=<value>   (stored to sessionStorage, then
 *      the param is stripped from the address bar via history.replaceState)
 */

(function (global) {
  'use strict';

  // ── Token management ────────────────────────────────────────────────────────

  const STORAGE_KEY = 'sigil_gui_token';

  function resolveToken() {
    // 1. Already in sessionStorage?
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored && stored.trim()) return stored.trim();

    // 2. URL ?token= param (first visit / deep link)
    const params = new URLSearchParams(window.location.search);
    const fromUrl = (params.get('token') || '').trim();
    if (fromUrl) {
      sessionStorage.setItem(STORAGE_KEY, fromUrl);
      // Strip the token from the address bar so it isn't bookmarked or logged
      params.delete('token');
      const newSearch = params.toString();
      const newUrl = window.location.pathname + (newSearch ? '?' + newSearch : '') + window.location.hash;
      history.replaceState(null, '', newUrl);
      return fromUrl;
    }

    return null;
  }

  function clearToken() {
    sessionStorage.removeItem(STORAGE_KEY);
  }

  // ── Auth banner ─────────────────────────────────────────────────────────────

  function showAuthBanner(message, type /* 'error' | 'warn' | 'info' */) {
    // Remove any existing banner
    const existing = document.getElementById('sigil-auth-banner');
    if (existing) existing.remove();

    const banner = document.createElement('div');
    banner.id = 'sigil-auth-banner';

    const colors = {
      error: { bg: 'rgba(255,68,68,.12)',  border: 'rgba(255,68,68,.35)',  text: '#ff6b6b' },
      warn:  { bg: 'rgba(245,158,11,.12)', border: 'rgba(245,158,11,.35)', text: '#fbbf24' },
      info:  { bg: 'rgba(88,101,242,.12)', border: 'rgba(88,101,242,.35)', text: '#818cf8' },
    };
    const c = colors[type] || colors.info;

    Object.assign(banner.style, {
      position:     'fixed',
      top:          '58px',
      left:         '50%',
      transform:    'translateX(-50%)',
      zIndex:       '9999',
      padding:      '.55rem 1.2rem',
      borderRadius: '.55rem',
      border:       `1px solid ${c.border}`,
      background:   c.bg,
      color:        c.text,
      fontSize:     '.82rem',
      fontWeight:   '700',
      fontFamily:   'inherit',
      boxShadow:    '0 4px 24px rgba(0,0,0,.4)',
      maxWidth:     'calc(100vw - 2rem)',
      textAlign:    'center',
      pointerEvents:'none',
    });

    banner.textContent = message;
    document.body.appendChild(banner);

    // Auto-dismiss info/warn banners after 5 s; errors stay until page reload
    if (type !== 'error') {
      setTimeout(() => banner.remove(), 5000);
    }
  }

  // ── authFetch ────────────────────────────────────────────────────────────────

  /**
   * Drop-in replacement for fetch() that:
   *  - Injects the Authorization: Bearer <token> header
   *  - On 401: clears the token, shows a visible error banner, and rejects
   *  - On 429: shows a rate-limit warning banner
   *  - Passes all other responses through unchanged
   *
   * @param {string}       url
   * @param {RequestInit}  [options]
   * @returns {Promise<Response>}
   */
  async function authFetch(url, options) {
    const token = resolveToken();

    const headers = new Headers((options && options.headers) ? options.headers : {});
    if (token) {
      headers.set('Authorization', 'Bearer ' + token);
    }

    const mergedOptions = Object.assign({}, options, { headers });

    let response;
    try {
      response = await fetch(url, mergedOptions);
    } catch (networkErr) {
      showAuthBanner('⚠️ Network error — is Sigil running?', 'warn');
      throw networkErr;
    }

    if (response.status === 401) {
      clearToken();
      showAuthBanner(
        '🔒 Session expired or invalid token. Reload the page and provide a valid token.',
        'error'
      );
      const err = new Error('Unauthorized (401)');
      err.status = 401;
      throw err;
    }

    if (response.status === 429) {
      showAuthBanner('⏱ Too many requests — slow down and try again shortly.', 'warn');
    }

    return response;
  }

  // ── checkSession ─────────────────────────────────────────────────────────────

  /**
   * Lightweight session check — performs a HEAD request to /health (public)
   * then an authenticated GET to /api/status/full to confirm the token works.
   *
   * @param {Object}  [opts]
   * @param {boolean} [opts.redirect=false]  Redirect to /setup on auth failure
   * @param {boolean} [opts.silent=false]    Suppress success banner
   */
  async function checkSession({ redirect = false, silent = true } = {}) {
    const token = resolveToken();
    if (!token) {
      showAuthBanner(
        '🔒 No auth token found. Append ?token=<GUI_AUTH_TOKEN> to the URL.',
        'warn'
      );
      if (redirect) window.location.href = '/setup';
      return false;
    }

    try {
      // Use authFetch — it handles 401 internally
      const res = await authFetch('/api/status/full', { method: 'GET' });
      if (!res.ok && res.status !== 200) {
        if (!silent) showAuthBanner('⚠️ Could not verify session (' + res.status + ').', 'warn');
        return false;
      }
      if (!silent) showAuthBanner('✓ Session active.', 'info');
      return true;
    } catch (err) {
      if (err && err.status === 401) {
        if (redirect) setTimeout(() => { window.location.href = '/setup'; }, 2000);
      }
      return false;
    }
  }

  // ── Exports ───────────────────────────────────────────────────────────────────

  global.authFetch    = authFetch;
  global.checkSession = checkSession;

})(window);
