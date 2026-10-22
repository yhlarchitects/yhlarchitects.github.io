/* YHLA analytics preferences. Runs synchronously before any analytics beacon. */
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
  var ui, statusText, panel, details, choiceRow, closeButton;
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

  function choose(choice) {
    var now = Date.now();
    if (choice === 'decline') { eraseVisitor(); sent = false; }
    var stored = write(CONSENT, {choice: choice, expiresAt: now + DAYS90});
    if (choice === 'allow' && stored) collect();
    render();
    if (panel) panel.hidden = true;
  }
  function render() {
    if (!ui) return;
    var pref = preference();
    var message = excluded ? 'Your visits are excluded on this browser.' :
      blockedSignal ? 'Your browser privacy signal is respected. Analytics is off.' :
      !localOK || !sessionOK ? 'Unique visitor counting is off because browser storage is unavailable.' :
      pref && pref.choice === 'allow' ? 'Unique visitor counting is allowed on this browser.' :
      pref && pref.choice === 'decline' ? 'Unique visitor counting is declined on this browser.' :
      'Allow a random browser ID to count return visits for up to 90 days?';
    statusText.textContent = message;
    choiceRow.hidden = excluded || blockedSignal || !localOK || !sessionOK;
    details.textContent = 'This optional ID measures browsers, not people. The site stores a random ID for up to 90 days and a session ID until 30 minutes of inactivity. We receive the page path and referring website, without query strings, and retain records for up to 90 days. Cloudflare processes and stores these statistics for YHLA. Decline or withdraw to delete your counting ID and request deletion of its records. A pending deletion ID is kept only until the request succeeds. Separate Cloudflare statistics use no cookies or visitor IDs. Exclusion and browser privacy signals stop both. Your choice stays in this browser. Questions: hello@yhlarchitects.com.';
    closeButton.hidden = !pref && !excluded && !blockedSignal && localOK && sessionOK;
    ui.settings.textContent = excluded ? 'Analytics excluded' : 'Privacy';
  }
  function openSettings() {
    if (!ui) return;
    render(); panel.hidden = false;
    if (!choiceRow.hidden) panel.querySelector('#allow').focus();
    else if (!closeButton.hidden) closeButton.focus();
    else panel.querySelector('summary').focus();
  }
  function mount() {
    if (ui || !document.body) return;
    var host = document.createElement('div');
    host.id = 'yhla-analytics-preferences';
    // Existing public YHLA styling is preserved, with a small isolated preference control.
    var shadow = host.attachShadow({mode: 'open'});
    shadow.innerHTML = '<style>' +
      ':host{all:initial;position:fixed;top:max(12px,env(safe-area-inset-top,0px));right:max(16px,env(safe-area-inset-right,0px));z-index:2147483647;font:12px/1.5 "Univers 55",Arial,sans-serif;color:#111;text-align:left}' +
      '*{box-sizing:border-box}[hidden]{display:none!important}button{font:inherit;color:inherit;cursor:pointer;border-radius:0;touch-action:manipulation}' +
      '#settings{display:block;margin-left:auto;background:#fff;border:1px solid #dcdcda;padding:4px 8px;min-height:30px}' +
      '#panel{margin-top:6px;width:min(320px,calc(100vw - 32px));max-height:calc(100dvh - 80px);overflow:auto;background:#fff;border:1px solid #dcdcda;padding:14px}' +
      'h2{font:400 15px/1.3 "Univers 55",Arial,sans-serif;margin:0 0 8px}p{margin:0 0 12px}#choices{display:flex;gap:8px}#choices button{flex:1;border:1px solid #111;background:#fff;padding:7px 12px;min-height:36px}' +
      'details{margin-top:12px;font-size:11px}summary{cursor:pointer;text-decoration:underline;padding:2px 0}details p{margin-top:8px}#close{display:block;margin:12px 0 0 auto;border:0;background:#fff;text-decoration:underline;padding:2px 4px;min-height:30px}' +
      'button:focus-visible,summary:focus-visible{outline:2px solid #111;outline-offset:3px}@media print{:host{display:none}}' +
      '</style><button id="settings" type="button" aria-controls="panel" aria-expanded="false">Privacy</button>' +
      '<section id="panel" role="region" aria-labelledby="privacy-title" hidden><h2 id="privacy-title">Visitor privacy</h2>' +
      '<p id="state" role="status"></p><div id="choices"><button id="allow" type="button">Allow</button><button id="decline" type="button">Decline / withdraw</button></div>' +
      '<details><summary>Privacy details</summary><p id="details"></p></details><button id="close" type="button">Close</button></section>';
    document.body.appendChild(host);
    panel = shadow.getElementById('panel'); statusText = shadow.getElementById('state');
    details = shadow.getElementById('details'); choiceRow = shadow.getElementById('choices');
    closeButton = shadow.getElementById('close');
    ui = {settings: shadow.getElementById('settings')};
    ui.settings.addEventListener('click', function () {
      if (panel.hidden) { openSettings(); ui.settings.setAttribute('aria-expanded', 'true'); }
      else { panel.hidden = true; ui.settings.setAttribute('aria-expanded', 'false'); }
    });
    shadow.getElementById('allow').addEventListener('click', function () { choose('allow'); ui.settings.setAttribute('aria-expanded', 'false'); });
    shadow.getElementById('decline').addEventListener('click', function () { choose('decline'); ui.settings.setAttribute('aria-expanded', 'false'); });
    closeButton.addEventListener('click', function () { panel.hidden = true; ui.settings.setAttribute('aria-expanded', 'false'); ui.settings.focus(); });
    shadow.addEventListener('keydown', function (event) {
      event.stopPropagation();
      if (event.key === 'Escape') { panel.hidden = true; ui.settings.setAttribute('aria-expanded', 'false'); ui.settings.focus(); }
    });
    shadow.addEventListener('click', function (event) { event.stopPropagation(); });
    render();
    if (!excluded && !blockedSignal && localOK && sessionOK && !preference()) {
      panel.hidden = false; ui.settings.setAttribute('aria-expanded', 'true');
    }
  }
  window.YHLAAnalytics = {version: 1, openSettings: openSettings};
  function refreshExclusion() {
    var current = isExcluded();
    if (current && !excluded) {
      excluded = true; eraseVisitor(); write(CONSENT, null);
      if (cfStarted) { location.reload(); return; }
    }
    excluded = current; render();
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
      render();
    } else if (event.key === CONSENT) {
      var pref = preference();
      if (!pref || pref.choice !== 'allow') eraseVisitor(); else collect();
      render();
    }
  });
  // Count one page load, even if the bootstrap was accidentally inserted twice.
  startCloudflare(); collect();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, {once: true});
  else mount();
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
