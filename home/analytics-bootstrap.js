/* YHLA analytics preferences without visible controls. Runs before any analytics beacon. */
(function () {
  'use strict';
  if (window.YHLAAnalytics) return;
  var API = 'https://yhla-analytics.yhl-sync.workers.dev';
  var TOKEN = '89894b1a3f054c01b57106249f69807c';
  var PREFIX = 'yhla.analytics.';
  var EXCLUDE = PREFIX + 'excluded.v1';
  var CONSENT = PREFIX + 'consent.v1';
  var VISITOR = PREFIX + 'visitor.v1';
  var SESSION = PREFIX + 'session.v1';
  var FORGET = PREFIX + 'pending-forget.v1';
  var COOKIE = 'yhla_analytics_excluded';
  var DAYS90 = 90 * 24 * 60 * 60 * 1000;
  var MIN30 = 30 * 60 * 1000;
  var production = /^(www\.)?yhlarchitects\.com$/.test(location.hostname);
  var blockedSignal = navigator.globalPrivacyControl === true ||
    /^(1|yes)$/i.test(navigator.doNotTrack || window.doNotTrack || navigator.msDoNotTrack || '');
  var localOK = available('localStorage');
  var sessionOK = available('sessionStorage');
  var sent = false;
  var cfStarted = false;
  var excluded;
  var forgetting = [];

  function available(name) {
    try {
      var store = window[name], probe = PREFIX + 'storage-test';
      store.setItem(probe, '1'); store.removeItem(probe); return true;
    } catch (_) { return false; }
  }
  function read(key, session) {
    try { return JSON.parse(window[session ? 'sessionStorage' : 'localStorage'].getItem(key)); }
    catch (_) { return null; }
  }
  function write(key, value, session) {
    try {
      var store = window[session ? 'sessionStorage' : 'localStorage'];
      if (value === null) store.removeItem(key); else store.setItem(key, JSON.stringify(value));
      return true;
    } catch (_) { return false; }
  }
  function cookieValue() {
    var found = document.cookie.split(';').map(function (part) { return part.trim(); })
      .find(function (part) { return part.indexOf(COOKIE + '=') === 0; });
    return found ? found.slice(COOKIE.length + 1) : null;
  }
  function setExclusion(value) {
    write(EXCLUDE, value);
    // This preference cookie also covers the www hostname; it contains no visitor ID.
    document.cookie = COOKIE + '=' + (value ? '1' : '0') +
      '; Max-Age=31536000; Path=/; Secure; SameSite=Lax' +
      (production ? '; Domain=yhlarchitects.com' : '');
    excluded = value;
  }
  function isExcluded() {
    var value = cookieValue();
    // An explicit shared preference also overrides an old preference on the other hostname.
    if (value === '0' || value === '1') {
      var result = value === '1';
      if (read(EXCLUDE) !== result) write(EXCLUDE, result);
      return result;
    }
    return read(EXCLUDE) === true;
  }
  function uuid(value) {
    return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }
  function post(route, payload) {
    if (!production || typeof fetch !== 'function') return;
    try {
      return fetch(API + route, {method: 'POST', mode: 'cors', credentials: 'omit',
        headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload), keepalive: true})
        .catch(function () {});
    } catch (_) { return; }
  }
  function eraseVisitor() {
    var old = read(VISITOR);
    if (old && uuid(old.id)) {
      var pending = read(FORGET);
      pending = Array.isArray(pending) ? pending.filter(uuid) : [];
      if (pending.indexOf(old.id) < 0) pending.push(old.id);
      write(FORGET, pending);
      flushForget(pending);
    }
    write(VISITOR, null); write(SESSION, null, true);
  }
  function flushForget(values) {
    var pending = values || read(FORGET);
    if (!Array.isArray(pending)) return;
    pending.filter(uuid).forEach(function (id) {
      if (forgetting.indexOf(id) >= 0) return;
      forgetting.push(id);
      var request = post('/forget', {visitorId: id});
      if (!request) { forgetting.splice(forgetting.indexOf(id), 1); return; }
      request.then(function (response) {
        forgetting.splice(forgetting.indexOf(id), 1);
        if (!response || !response.ok) return;
        var remaining = read(FORGET);
        if (Array.isArray(remaining)) write(FORGET, remaining.filter(function (value) { return value !== id; }));
      });
    });
  }
  function preference() {
    var value = read(CONSENT), now = Date.now();
    if (!value || !/^(allow|decline)$/.test(value.choice) || !Number.isFinite(value.expiresAt) || value.expiresAt <= now) {
      if (value) { eraseVisitor(); write(CONSENT, null); }
      return null;
    }
    return value;
  }
  function newUUID() {
    if (!window.crypto || typeof crypto.randomUUID !== 'function') return null;
    return crypto.randomUUID();
  }
  function acquisition() {
    try {
      var host = new URL(document.referrer).hostname.toLowerCase();
      return /^(www\.)?yhlarchitects\.com$/.test(host) ? '' : host;
    } catch (_) { return ''; }
  }
  function currentSession() {
    var now = Date.now(), value = read(SESSION, true);
    if (!value || !uuid(value.id) || !Number.isFinite(value.lastSeen) ||
        now - value.lastSeen >= MIN30 || value.lastSeen > now || typeof value.referrer !== 'string') {
      value = {id: newUUID(), lastSeen: now, referrer: acquisition()};
      if (!value.id) return null;
    }
    value.lastSeen = now;
    return write(SESSION, value, true) ? value : null;
  }
  function collect() {
    if (sent || excluded || isExcluded() || blockedSignal || !localOK || !sessionOK || !production) return;
    var consent = preference();
    if (!consent || consent.choice !== 'allow') return;
    var now = Date.now(), visitor = read(VISITOR);
    if (!visitor || !uuid(visitor.id) || !Number.isFinite(visitor.expiresAt) || visitor.expiresAt <= now) {
      eraseVisitor();
      visitor = {id: newUUID(), expiresAt: Math.min(now + DAYS90, consent.expiresAt)};
      if (!visitor.id || !write(VISITOR, visitor)) return;
    }
    var session = currentSession(), eventId = newUUID();
    if (!session || !eventId) return;
    sent = true;
    post('/collect', {version: 1, eventId: eventId, visitorId: visitor.id,
      sessionId: session.id, path: location.pathname, referrer: session.referrer});
  }
  function startCloudflare() {
    if (!production || excluded || blockedSignal || cfStarted || isExcluded()) return;
    cfStarted = true;
    var script = document.createElement('script');
    script.async = true; script.src = 'https://static.cloudflareinsights.com/beacon.min.js';
    script.setAttribute('data-cf-beacon', JSON.stringify({token: TOKEN}));
    script.setAttribute('data-yhla-cloudflare', '');
    (document.head || document.documentElement).appendChild(script);
  }
  function cleanParameter(url) {
    url.searchParams.delete('analytics');
    try { history.replaceState(history.state, '', url.pathname + url.search + url.hash); } catch (_) {}
  }
  // Process the owner opt-out before creating a Cloudflare script or a visitor ID.
  excluded = isExcluded();
  var url = new URL(location.href), command = url.searchParams.get('analytics');
  if (command === 'off') {
    setExclusion(true); eraseVisitor(); write(CONSENT, null); cleanParameter(url);
  } else if (command === 'on') {
    setExclusion(false); eraseVisitor(); write(CONSENT, null); cleanParameter(url);
  }
  if (blockedSignal) eraseVisitor();
  flushForget();

  // Retain the existing API for callers without creating settings UI.
  window.YHLAAnalytics = {version: 1, openSettings: function () {}};
  function refreshExclusion() {
    var current = isExcluded();
    if (current && !excluded) {
      excluded = true; eraseVisitor(); write(CONSENT, null);
      if (cfStarted) { location.reload(); return; }
    }
    excluded = current; preference();
  }
  window.addEventListener('focus', refreshExclusion);
  window.addEventListener('pageshow', refreshExclusion);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') { refreshExclusion(); flushForget(); }
  });
  window.addEventListener('storage', function (event) {
    if (event.key === EXCLUDE) {
      excluded = isExcluded();
      if (excluded) {
        eraseVisitor(); write(CONSENT, null);
        if (cfStarted) { location.reload(); return; }
      }
      preference();
    } else if (event.key === CONSENT) {
      var pref = preference();
      if (!pref || pref.choice !== 'allow') eraseVisitor(); else collect();
      preference();
    }
  });
  // Count one page load, even if the bootstrap was accidentally inserted twice.
  // Expired consent still deletes its old counting ID without opening a prompt.
  preference(); startCloudflare(); collect();
  // Renew session activity only when the page is active, without sending extra events.
  var lastActivity = 0;
  function activity() {
    var now = Date.now();
    if (now - lastActivity < 15000 || excluded || blockedSignal || !sessionOK) return;
    var pref = preference();
    if (pref && pref.choice === 'allow') { currentSession(); lastActivity = now; }
  }
  ['pointerdown', 'keydown', 'scroll'].forEach(function (name) { window.addEventListener(name, activity, {passive: true}); });
}());
