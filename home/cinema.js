(() => {
  'use strict';
  const films = VIDEO-CATALOG;
  const filmOrder = ['yakushima', 'manhattan', 'nordhavn', 'amk-library'];
  // Where the screen's crop is anchored for each film (CSS object-position).
  // A portrait phone shows one narrow column of a landscape film; name that column here.
  // Films without an entry stay centred.
  const filmPosition = { 'amk-library': '35.9% 50%' };
  const positionOf = film => filmPosition[film.id] || '50% 50%';
  const anchorOf = element => (element.style.objectPosition || '50% 50%').split(/\s+/).map(part => parseFloat(part) / 100);
  const orderedFilms = [
    ...filmOrder.map(id => films.find(film => film.id === id)).filter(Boolean),
    ...films.filter(film => !filmOrder.includes(film.id))
  ];
  const layers = [...document.querySelectorAll('.film-layer')];
  const background = document.querySelector('.background');
  const touchScreen = matchMedia('(hover: none) and (pointer: coarse)');
  let layer = layers[0];
  let video = layer.querySelector('video');
  const toggle = document.getElementById('yhla');
  const contact = document.getElementById('contact');
  const workspaceToggle = document.getElementById('workspace-toggle');
  const workspace = document.getElementById('workspace');
  const panels = [contact, workspace].filter(Boolean);
  let openedPanel = null;
  const status = document.getElementById('status');
  let cover = layer.querySelector('.cover');
  let outgoing = null;
  let changing = false;
  let fading = false;
  let changeTimer;
  const failed = new Set();
  let opened = false;
  let selected;
  let playRequest = 0;
  let needsGesture = true;
  let hadGesture = false;
  let lastTime = 0;
  let loopRestartPending = false;

  const choose = candidates => candidates[Math.floor(Math.random() * candidates.length)];

  function playWithSound() {
    const request = ++playRequest;
    video.muted = false;
    // Call play synchronously inside the gesture, including after source changes.
    const result = video.play();
    if (!result) return;
    result.then(() => {
      if (request === playRequest) needsGesture = video.muted;
    }).catch(() => {
      if (request !== playRequest) return;
      needsGesture = true;
      video.muted = true;
      video.play().catch(() => {
        if (request === playRequest) status.textContent = 'Tap anywhere to play the background film.';
      });
    });
  }

  function soundAllowed() {
    try {
      if (navigator.getAutoplayPolicy) return navigator.getAutoplayPolicy(video) === 'allowed';
      const Context = window.AudioContext || window.webkitAudioContext;
      if (!Context) return false;
      const probe = new Context();
      const allowed = probe.state === 'running';
      probe.close().catch(() => {});
      return allowed;
    } catch { return false; }
  }

  function startPlayback() {
    if (hadGesture || soundAllowed()) { playWithSound(); return; }
    const request = ++playRequest;
    needsGesture = true;
    video.muted = true;
    const result = video.play();
    if (result) result.catch(() => {
      if (request === playRequest) status.textContent = 'Tap anywhere to play the background film.';
    });
  }

  function unlockAudio() {
    hadGesture = true;
    if (needsGesture || video.muted || video.paused) playWithSound();
  }

  // The first deliberate activation only unlocks sound, even if autoplay
  // already had permission. Later activations can navigate or open contact.
  function activateSound() {
    const first = !hadGesture;
    unlockAudio();
    return first;
  }

  let touchStart = null;
  let suppressTouchClickUntil = 0;
  const noZoom = event => event.preventDefault();
  ['gesturestart', 'gesturechange', 'gestureend'].forEach(type => document.addEventListener(type, noZoom, { passive: false }));
  document.addEventListener('touchstart', event => {
    suppressTouchClickUntil = 0;
    const touch = event.touches.length === 1 ? event.touches[0] : null;
    touchStart = touch ? { id: touch.identifier, x: touch.clientX, y: touch.clientY, time: performance.now() } : null;
  }, { capture: true, passive: true });
  document.addEventListener('touchmove', event => {
    if (event.touches.length > 1) touchStart = null;
    // The full-screen canvas owns directional swipes, rather than page scroll.
    if (event.cancelable) event.preventDefault();
  }, { passive: false });
  document.addEventListener('touchcancel', () => { touchStart = null; }, { capture: true, passive: true });
  document.addEventListener('touchend', event => {
    const start = touchStart;
    touchStart = null;
    if (!start || event.touches.length) return;
    const touch = [...event.changedTouches].find(item => item.identifier === start.id);
    if (!touch) return;
    const distance = Math.max(Math.abs(touch.clientX - start.x), Math.abs(touch.clientY - start.y));
    const swiped = distance >= 48 && performance.now() - start.time <= 1500;
    const tapped = distance < 12;
    const email = event.target.closest?.('a[href]') || (workspace && workspace.contains(event.target));
    if (!hadGesture || swiped || (tapped && !email)) {
      if (event.cancelable) event.preventDefault();
      suppressTouchClickUntil = performance.now() + 750;
      if (!activateSound()) {
        if (swiped) nextFilm();
        else if (tapped) activateTarget(event.target);
      }
    } else if (tapped && email) unlockAudio();
    // Email keeps its native link activation. Other taps are handled here:
    // mobile WebKit does not always synthesize a click on plain backgrounds.
  }, { capture: true, passive: false });
  document.addEventListener('click', event => {
    const touchClick = event.pointerType === 'touch' || !event.pointerType;
    if (event.detail > 0 && touchClick && performance.now() < suppressTouchClickUntil) {
      suppressTouchClickUntil = 0;
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    if (activateSound()) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);

  function followingFilm() {
    const current = orderedFilms.findIndex(film => film.id === selected?.id);
    for (let step = 1; step <= orderedFilms.length; step++) {
      const candidate = orderedFilms[(current + step) % orderedFilms.length];
      if (candidate.id !== selected?.id && candidate.id !== outgoing?.film.id && !failed.has(candidate.id)) return candidate;
    }
    return null;
  }

  function load(film) {
    selected = film;
    document.body.dataset.film = film.id;
    lastTime = 0;
    loopRestartPending = false;
    video.dataset.film = film.id;
    video.style.objectPosition = cover.style.objectPosition = positionOf(film);
    layer.classList.remove('is-playing');
    if (film.poster) {
      video.poster = film.poster;
      cover.src = film.poster;
    } else {
      video.removeAttribute('poster');
      cover.removeAttribute('src');
    }
    video.src = film.src;
    startPlayback();
  }

  function nextFilm() {
    if (changing) return;
    const next = followingFilm();
    if (!next) return;
    changing = true;
    background.dataset.changing = 'loading';
    outgoing = { layer, video, cover, film: selected };
    layer.classList.remove('is-front');
    layer = layers.find(item => item !== layer);
    layer.classList.add('is-front');
    video = layer.querySelector('video');
    cover = layer.querySelector('.cover');
    changeTimer = setTimeout(cancelChange, 15000);
    load(next);
  }

  function cancelChange() {
    if (!outgoing || fading) return;
    ++playRequest;
    video.pause();
    video.muted = true;
    layer.classList.remove('is-front', 'is-current', 'is-playing');
    ({ layer, video, cover, film: selected } = outgoing);
    document.body.dataset.film = selected.id;
    layer.classList.add('is-front');
    outgoing = null;
    changing = false;
    background.dataset.changing = 'idle';
    clearTimeout(changeTimer);
    status.textContent = 'The next film could not be loaded. The current film is still available.';
    updateInk(true);
  }

  function beginDissolve() {
    if (!outgoing || fading) return;
    clearTimeout(changeTimer);
    fading = true;
    outgoing.video.muted = true;
    layer.classList.add('is-current');
    const duration = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--film-time')) || 0;
    // Explicit keyframes also cover cached films that become ready within one paint.
    // Keep the outgoing film until the rendered animation, not a timer, finishes.
    const dissolve = layer.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration, easing: 'ease-in-out', fill: 'both'
    });
    background.classList.add('is-changing');
    background.dataset.changing = 'fading';
    const finish = () => {
      outgoing.video.pause();
      outgoing.layer.classList.remove('is-current', 'is-playing');
      outgoing = null;
      changing = false;
      fading = false;
      background.classList.remove('is-changing');
      background.dataset.changing = 'idle';
      dissolve.cancel();
      updateInk(true);
    };
    dissolve.finished.then(finish, finish);
  }

  const toggleFor = panel => panel === workspace ? workspaceToggle : toggle;
  function showPanel(panel, value) {
    if (value && panel.hidden) {
      panel.hidden = false;
      // Establish the closed style before starting the normal reveal transition.
      void panel.offsetHeight;
    }
    panel.classList.toggle('is-shown', value);
    panel.setAttribute('aria-hidden', String(!value));
    panel.inert = !value;
    toggleFor(panel).setAttribute('aria-expanded', String(value));
  }
  // One lens for both panels: contact (YHLA) and the WORKSPACE sign-in.
  function setOpened(value, panel = contact) {
    panels.forEach(item => { if (item !== panel || !value) showPanel(item, false); });
    if (value) showPanel(panel, true);
    openedPanel = value ? panel : null;
    opened = value;
    document.body.classList.toggle('is-open', value);
    updateInk(true);
    if (value && panel === workspace && !touchScreen.matches) {
      const field = workspace.querySelector('input:not([hidden])');
      field?.focus({ preventScroll: true });
    }
  }

  function activateTarget(target) {
    if (target.closest?.('a[href]')) return;
    if (workspace && workspace.contains(target)) return;
    if (toggle.contains(target)) setOpened(openedPanel !== contact, contact);
    else if (workspaceToggle && workspaceToggle.contains(target)) setOpened(openedPanel !== workspace, workspace);
    else if (opened) setOpened(false);
    else nextFilm();
  }
  document.addEventListener('click', event => activateTarget(event.target));
  const navigationKeys = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', ' ', 'Spacebar']);
  document.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.isComposing) return;
    if (event.key === 'Escape' && opened) {
      event.preventDefault();
      const mark = toggleFor(openedPanel || contact);
      setOpened(false);
      mark.focus({ preventScroll: true });
      return;
    }
    if (!navigationKeys.has(event.key)) return;
    // Typing inside the sign-in panel belongs to the form.
    if (workspace && workspace.contains(event.target)) return;
    // Enter still opens a focused email link. Elsewhere it always advances,
    // including when Escape has returned keyboard focus to the YHLA mark.
    if (event.key === 'Enter' && event.target.closest?.('a[href]')) {
      if (!event.repeat) unlockAudio();
      return;
    }
    event.preventDefault();
    if (event.repeat) return;
    if (!activateSound()) nextFilm();
  });

  function onCurrent(type, callback) {
    layers.forEach(item => item.querySelector('video').addEventListener(type, event => {
      if (event.currentTarget === video) callback(event);
    }));
  }
  onCurrent('playing', () => {
    document.body.classList.add('is-playing');
    layer.classList.add('is-playing');
    beginDissolve();
    status.textContent = '';
    updateInk(true);
  });
  function resumeLoop() {
    if (!loopRestartPending || !video.paused || document.hidden) return;
    loopRestartPending = false;
    if (!video.muted) playWithSound();
    else video.play().catch(() => { needsGesture = true; });
  }
  onCurrent('timeupdate', () => {
    const wrapped = video.loop && lastTime > video.duration - 1 && video.currentTime < .25;
    lastTime = video.currentTime;
    if (wrapped) loopRestartPending = true;
    else if (video.currentTime >= .25) loopRestartPending = false;
    resumeLoop();
  });
  onCurrent('pause', () => {
    resumeLoop();
    // Cover held playback while leaving the video visible to Safari's autoplay policy.
    if (video.paused) layer.classList.remove('is-playing');
  });
  onCurrent('error', () => {
    if (selected) failed.add(selected.id);
    const next = followingFilm();
    if (next) load(next);
    else if (outgoing) cancelChange();
    else {
      layer.classList.remove('is-playing');
      status.textContent = 'The background film could not be loaded.';
    }
  });
  function resetIntroduction() {
    opened = false;
    openedPanel = null;
    panels.forEach(panel => {
      toggleFor(panel).setAttribute('aria-expanded', 'false');
      panel.classList.remove('is-shown');
      panel.setAttribute('aria-hidden', 'true');
      panel.inert = true;
      panel.hidden = true;
    });
    document.body.classList.remove('is-open');
    // Do not save or restore an open introduction in the browser's page cache.
    const lens = document.querySelector('.lens');
    void getComputedStyle(lens).backdropFilter;
    lens.getAnimations().forEach(animation => animation.finish());
    updateInk(true);
  }
  window.addEventListener('pagehide', resetIntroduction);
  window.addEventListener('pageshow', event => {
    if (event.persisted) {
      resetIntroduction();
      startPlayback();
    }
  });

  // Sample the cover crop behind the visible lettering. One inherited color
  // keeps the logo and contact identical throughout every color transition.
  const canvas = document.createElement('canvas');
  canvas.width = 48;
  canvas.height = 12;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  const linear = Array.from({ length: 256 }, (_, value) => {
    const channel = value / 255;
    return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
  });
  const inkGroups = [
    { element: document.querySelector('.identity'), property: '--ink', white: false, pending: null, count: 0 }
  ];
  function updateInk(force = false) {
    if (!context || document.hidden) return;
    function draw(scene, box, opacity) {
      const playing = scene.layer.classList.contains('is-playing') && scene.video.readyState >= 2;
      const source = playing ? scene.video : scene.cover;
      const width = playing ? scene.video.videoWidth : scene.cover.naturalWidth;
      const height = playing ? scene.video.videoHeight : scene.cover.naturalHeight;
      if (!width || !height) return false;
      const frame = scene.video.getBoundingClientRect();
      const scale = Math.max(frame.width / width, frame.height / height);
      const [anchorX, anchorY] = anchorOf(scene.video);
      const offsetX = (width * scale - frame.width) * anchorX;
      const offsetY = (height * scale - frame.height) * anchorY;
      context.globalAlpha = opacity;
      context.drawImage(source, (box.left - frame.left + offsetX) / scale,
        (box.top - frame.top + offsetY) / scale, box.width / scale, box.height / scale,
        0, 0, canvas.width, canvas.height);
      return true;
    }
    // Share the sampled page color with the lower fade so the softened film
    // meets Safari's page-background fallback without a hard color boundary.
    if (touchScreen.matches) {
      try {
        const box = { left: 0, top: 0, width: innerWidth, height: 1 };
        context.clearRect(0, 0, canvas.width, canvas.height);
        const previousDrawn = outgoing && draw(outgoing, box, 1);
        const drawn = draw({ layer, video, cover }, box, outgoing ? Number(getComputedStyle(layer).opacity) : 1);
        if (drawn || previousDrawn) {
          const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
          const sums = [0, 0, 0];
          let count = 0;
          for (let i = 0; i < pixels.length; i += 4) {
            if (!pixels[i + 3]) continue;
            sums.forEach((_, channel) => { sums[channel] += pixels[i + channel]; });
            count++;
          }
          if (count) document.documentElement.style.setProperty('--edge-top',
            `rgb(${sums.map(sum => Math.round(sum / count)).join(', ')})`);
        }
      } catch { /* Keep the last sampled fallback while a frame loads. */ }
    }
    for (const group of inkGroups) {
      const hiddenPanels = panels.filter(panel => getComputedStyle(panel).visibility === 'hidden');
      const words = [...group.element.querySelectorAll('.word')].filter(word => !hiddenPanels.some(panel => panel.contains(word)));
      let total = 0;
      let samples = 0;
      try {
        for (const word of words) {
          const box = word.getBoundingClientRect();
          if (!box.width || !box.height) continue;
          context.clearRect(0, 0, canvas.width, canvas.height);
          const previousDrawn = outgoing && draw(outgoing, box, 1);
          const drawn = draw({ layer, video, cover }, box, outgoing ? Number(getComputedStyle(layer).opacity) : 1);
          if (!drawn && !previousDrawn) continue;
          const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
          for (let i = 0; i < pixels.length; i += 4) {
            total += .2126 * linear[pixels[i]] + .7152 * linear[pixels[i + 1]] + .0722 * linear[pixels[i + 2]];
            samples++;
          }
        }
      } catch { continue; }
      if (!samples) continue;
      const luminance = total / samples;
      const white = force ? luminance < .179 : group.white ? luminance < .22 : luminance < .14;
      if (!force && white !== group.white) {
        group.count = group.pending === white ? group.count + 1 : 1;
        group.pending = white;
        if (group.count < 3) continue;
      }
      group.white = white;
      group.pending = null;
      group.count = 0;
      document.documentElement.style.setProperty(group.property, white ? '#fff' : '#000');
      // The sign-in panel's veil is the opposite of the ink: paper on a dark film, shadow on a light one.
      document.documentElement.style.setProperty('--veil', white ? 'rgba(0, 0, 0, .24)' : 'rgba(255, 255, 255, .24)');
      document.documentElement.style.setProperty('--rule', white ? 'rgba(255, 255, 255, .6)' : 'rgba(0, 0, 0, .55)');
    }
  }
  layers.forEach(item => item.querySelector('.cover').addEventListener('load', () => updateInk(true)));
  function positionFilmPage() {
    if (!touchScreen.matches) return;
    const bleed = parseFloat(getComputedStyle(document.body).paddingTop) || 0;
    // Preserve the earlier crop and top alignment; the lower edge fades out.
    window.scrollTo({ left: 0, top: bleed, behavior: 'instant' });
  }
  let viewportFrame = 0;
  function queueFilmLayout() {
    if (viewportFrame) return;
    viewportFrame = requestAnimationFrame(() => {
      viewportFrame = 0;
      positionFilmPage();
      updateInk(true);
    });
  }
  window.addEventListener('resize', queueFilmLayout);
  window.addEventListener('orientationchange', queueFilmLayout);
  window.visualViewport?.addEventListener('resize', queueFilmLayout);
  window.addEventListener('pageshow', queueFilmLayout);
  positionFilmPage();
  document.addEventListener('visibilitychange', () => { if (!document.hidden) updateInk(true); });
  setInterval(updateInk, 250);

  // WORKSPACE sign-in. The panel talks to the workspace origin without cookies;
  // a successful code returns a one-time hand-off that the workspace turns into the session.
  if (workspace) {
    const origin = workspace.dataset.origin || '';
    const relative = value => typeof value === 'string' && /^\/(?!\/)/.test(value) ? value : '/';
    let step = 'email';
    let busy = false;
    const note = name => workspace.querySelectorAll('.note [data-note]').forEach(item => { item.hidden = item.dataset.note !== name; });
    const show = name => {
      step = name;
      workspace.querySelectorAll('[data-step]').forEach(item => { item.hidden = item.dataset.step !== name; });
      workspace.elements.email.readOnly = name === 'code';
      (name === 'code' ? workspace.elements.code : workspace.elements.email).focus({ preventScroll: true });
    };
    const post = (path, body) => fetch(origin + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    workspace.addEventListener('submit', async event => {
      event.preventDefault();
      if (busy) return;
      const email = workspace.elements.email.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { workspace.elements.email.focus(); return; }
      busy = true;
      workspace.querySelectorAll('button').forEach(button => { button.disabled = true; });
      try {
        if (step === 'email') {
          const reply = await post('/auth/request', { email });
          if (reply.status === 429) note('later');
          else if (reply.status === 503) note('offline');
          else if (!reply.ok) note('wrong');
          else { note('sent'); show('code'); }
        } else {
          const code = workspace.elements.code.value.trim();
          if (!/^\d{6}$/.test(code)) { note('wrong'); workspace.elements.code.focus(); return; }
          const next = relative(workspace.dataset.next);
          const reply = await post('/auth/verify', { email, code, next });
          const data = await reply.json().catch(() => ({}));
          if (reply.status === 429) note('later');
          else if (!reply.ok) note('wrong');
          else {
            note('in');
            if (data.handoff) location.assign(origin + '/auth/finish?t=' + encodeURIComponent(data.handoff));
            else location.assign(origin + next);
          }
        }
      } catch {
        note('offline');
      } finally {
        busy = false;
        workspace.querySelectorAll('button').forEach(button => { button.disabled = false; });
      }
    });
    // The workspace sends visitors here to sign in: open the panel at once.
    const query = new URLSearchParams(location.search);
    if (query.has('workspace')) {
      workspace.dataset.next = relative(query.get('next'));
      history.replaceState(null, '', location.pathname);
      requestAnimationFrame(() => setOpened(true, workspace));
    }
  }

  // A fresh visit can start on any film; navigation then follows the fixed cycle.
  if (films.length) load(choose(films));
})();
