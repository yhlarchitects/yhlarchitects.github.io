/* Cookie-free Cloudflare statistics, with a persistent owner opt-out and no visible controls. */
(function () {
  'use strict';
  if (window.YHLAAnalytics) return;
  var TOKEN = '89894b1a3f054c01b57106249f69807c';
  var EXCLUDE = 'yhla.analytics.excluded.v1';
  var COOKIE = 'yhla_analytics_excluded';
  var production = /^(www\.)?yhlarchitects\.com$/.test(location.hostname);
  var blockedSignal = navigator.globalPrivacyControl === true ||
    /^(1|yes)$/i.test(navigator.doNotTrack || window.doNotTrack || navigator.msDoNotTrack || '');
  var cfStarted = false;
  var excluded;

  function readExclusion() {
    try { return JSON.parse(localStorage.getItem(EXCLUDE)); }
    catch (_) { return null; }
  }
  function writeExclusion(value) {
    try { localStorage.setItem(EXCLUDE, JSON.stringify(value)); }
    catch (_) {}
  }
  function cookieValue() {
    try {
      var found = document.cookie.split(';').map(function (part) { return part.trim(); })
        .find(function (part) { return part.indexOf(COOKIE + '=') === 0; });
      return found ? found.slice(COOKIE.length + 1) : null;
    } catch (_) { return null; }
  }
  function setExclusion(value) {
    writeExclusion(value);
    // This preference contains no visitor ID and covers all paths and the www hostname.
    try {
      document.cookie = COOKIE + '=' + (value ? '1' : '0') +
        '; Max-Age=31536000; Path=/; Secure; SameSite=Lax' +
        (production ? '; Domain=yhlarchitects.com' : '');
    } catch (_) {}
    excluded = value;
  }
  function isExcluded() {
    var value = cookieValue();
    // Shared preference takes priority over an older hostname-specific local value.
    if (value === '0' || value === '1') {
      var result = value === '1';
      if (readExclusion() !== result) writeExclusion(result);
      return result;
    }
    return readExclusion() === true;
  }
  function cleanParameter(url) {
    url.searchParams.delete('analytics');
    try { history.replaceState(history.state, '', url.pathname + url.search + url.hash); }
    catch (_) {}
  }

  // Apply the owner preference before loading the statistics script.
  excluded = isExcluded();
  var url = new URL(location.href), command = url.searchParams.get('analytics');
  if (command === 'off' || command === 'on') {
    setExclusion(command === 'off');
    cleanParameter(url);
  }

  // Preserve the old API without creating a popup or button.
  // Legacy visitor IDs and consent records are unused; no custom collection or deletion is sent.
  window.YHLAAnalytics = {version: 2, mode: 'cookieless', openSettings: function () {}};
  function startCloudflare() {
    if (!production || excluded || blockedSignal || cfStarted || isExcluded()) return;
    cfStarted = true;
    var script = document.createElement('script');
    script.async = true;
    script.src = 'https://static.cloudflareinsights.com/beacon.min.js';
    script.setAttribute('data-cf-beacon', JSON.stringify({token: TOKEN}));
    script.setAttribute('data-yhla-cloudflare', '');
    (document.head || document.documentElement).appendChild(script);
  }
  function refreshExclusion() {
    var previous = excluded;
    excluded = isExcluded();
    if (excluded && !previous && cfStarted) {
      location.reload();
      return;
    }
    if (!excluded) startCloudflare();
  }
  window.addEventListener('focus', refreshExclusion);
  window.addEventListener('pageshow', refreshExclusion);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') refreshExclusion();
  });
  window.addEventListener('storage', function (event) {
    if (event.key === EXCLUDE) refreshExclusion();
  });
  startCloudflare();
}());
