'use strict';

const { isIP } = require('node:net');
const TERMS_VERSION = '2026-10-25';
const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function createSecurityPolicy(env = process.env) {
  const production = env.NODE_ENV === 'production' || env.RENDER === 'true';
  const proxyHops = Math.min(10, Math.max(0, Number.parseInt(env.SECURITY_TRUST_PROXY_HOPS, 10) || 0));
  let configuredOrigin = '';
  if (env.SITE_ORIGIN) {
    const parsed = new URL(env.SITE_ORIGIN);
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.pathname !== '/' || parsed.search || parsed.hash) throw new Error('SITE_ORIGIN must contain only the public http(s) origin.');
    configuredOrigin = parsed.origin;
  }
  const buckets = new Map();
  let lastPrune = 0;

  function originFor(req) {
    if (configuredOrigin) return configuredOrigin;
    const protocol = req.socket.encrypted || production ? 'https:' : 'http:';
    return new URL(`${protocol}//${req.headers.host || 'localhost'}`).origin;
  }

  function clientAddress(req) {
    // Forwarded headers are untrusted unless the operator specifies the proxy chain.
    if (proxyHops) {
      const forwarded = String(req.headers['x-forwarded-for'] || '').split(',').map(value => value.trim());
      const chain = [...forwarded, req.socket.remoteAddress || ''];
      const candidate = chain[chain.length - 1 - proxyHops];
      if (isIP(candidate || '')) return candidate;
    }
    return req.socket.remoteAddress || 'unknown';
  }

  function allowAttempt(req, identity = '') {
    const now = Date.now(), windowMs = 15 * 60 * 1000;
    if (now - lastPrune > 60000 || buckets.size >= 20000) {
      for (const [key, entry] of buckets) if (entry.until <= now) buckets.delete(key);
      lastPrune = now;
    }
    const route = (req.url || '').split('?')[0];
    const key = `${clientAddress(req)}:${route}:${identity.toLowerCase().slice(0, 254)}`;
    let entry = buckets.get(key);
    if (!entry || entry.until <= now) {
      // Fail closed when full rather than evicting active limits under an attack.
      if (!entry && buckets.size >= 20000) return false;
      entry = { count: 0, until: now + windowMs };
      buckets.set(key, entry);
    }
    entry.count++;
    return entry.count <= (identity ? 10 : route === '/api/owner/claim' ? 10 : 60);
  }

  function checkOrigin(req) {
    const writing = WRITE_METHODS.has(req.method);
    if (writing && ['cross-site', 'same-site'].includes(req.headers['sec-fetch-site'])) return false;
    const supplied = req.headers.origin || (writing ? req.headers.referer : '');
    if (supplied) {
      try {
        const parsed = new URL(supplied);
        if (!['http:', 'https:'].includes(parsed.protocol) || parsed.origin !== originFor(req)) return false;
      } catch { return false; }
    }
    // Cross-origin forms cannot supply this header; cross-origin fetch must preflight.
    // The server intentionally grants no CORS permission for account mutations.
    return !writing || req.headers['x-helunemi-request'] === 'same-origin';
  }

  function applyHeaders(req, res) {
    const authDomain = String(env.FIREBASE_AUTH_DOMAIN || '');
    const authFrame = /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/i.test(authDomain) ? ` https://${authDomain}` : '';
    const csp = [
      "default-src 'self'",
      "script-src 'self' https://www.gstatic.com",
      "script-src-attr 'none'",
      // Inline styles are required by the card editor and per-chat appearance.
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data: blob: https://fonts.gstatic.com https://firebasestorage.googleapis.com",
      // HTTPS asset imports and Firebase APIs are existing supported features.
      "connect-src 'self' data: blob: https:",
      "media-src 'self' data: blob: https:",
      "frame-src https://*.firebaseapp.com https://accounts.google.com" + authFrame,
      "worker-src 'self' blob:",
      "object-src 'none'", "base-uri 'none'", "form-action 'self'", "frame-ancestors 'none'"
    ];
    if (production) csp.push('upgrade-insecure-requests');
    res.setHeader('Content-Security-Policy', csp.join('; '));
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    res.setHeader('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=(), payment=(), usb=()');
    if (production || req.socket.encrypted) res.setHeader('Strict-Transport-Security', 'max-age=15552000');
    if (['/account.html', '/chat.html', '/create-post.html', '/shop-product.html', '/publish.html'].includes((req.url || '').split('?')[0])) {
      res.setHeader('Cache-Control', 'no-store');
      res.setHeader('X-Robots-Tag', 'noindex, nofollow');
    }
  }

  return { applyHeaders, checkOrigin, allowAttempt, secureCookies: production };
}

module.exports = { createSecurityPolicy, TERMS_VERSION };
