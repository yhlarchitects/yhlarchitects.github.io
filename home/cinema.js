(() => {
  'use strict';
  const films = VIDEO-CATALOG;
  const layers = [...document.querySelectorAll('.film-layer')];
  const background = document.querySelector('.background');
  let layer = layers[0];
  let video = layer.querySelector('video');
  const toggle = document.getElementById('yhla');
  const contact = document.getElementById('contact');
  const status = document.getElementById('status');
  let cover = layer.querySelector('.cover');
  let outgoing = null;
  let changing = false;
  let fading = false;
  let changeTimer;
  const storageKey = 'yhla:last-film:v1';
  const failed = new Set();
  let opened = false;
  let selected;
  let playRequest = 0;
  let needsGesture = true;
  let hadGesture = false;
  let lastTime = 0;
  let loopRestartPending = false;

  const readPrevious = () => {
    try { return localStorage.getItem(storageKey); } catch { return null; }
  };
  const remember = id => {
    try { localStorage.setItem(storageKey, id); } catch { /* Storage is optional. */ }
  };
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

  const noZoom = event => event.preventDefault();
  ['gesturestart', 'gesturechange', 'gestureend'].forEach(type => document.addEventListener(type, noZoom, { passive: false }));
  document.addEventListener('touchmove', event => {
    if (event.touches.length > 1) event.preventDefault();
  }, { passive: false });
  document.addEventListener('click', unlockAudio, true);
  document.addEventListener('touchend', unlockAudio, { capture: true, passive: true });

  function load(film) {
    selected = film;
    lastTime = 0;
    loopRestartPending = false;
    video.dataset.film = film.id;
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
    const candidates = films.filter(film => film.id !== selected?.id && !failed.has(film.id));
    if (!candidates.length) return;
    changing = true;
    background.dataset.changing = 'loading';
    outgoing = { layer, video, cover, film: selected };
    layer.classList.remove('is-front');
    layer = layers.find(item => item !== layer);
    layer.classList.add('is-front');
    video = layer.querySelector('video');
    cover = layer.querySelector('.cover');
    changeTimer = setTimeout(cancelChange, 15000);
    load(choose(candidates));
  }

  function cancelChange() {
    if (!outgoing || fading) return;
    ++playRequest;
    video.pause();
    video.muted = true;
    layer.classList.remove('is-front', 'is-current', 'is-playing');
    ({ layer, video, cover, film: selected } = outgoing);
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

  function setOpened(value) {
    opened = value;
    toggle.setAttribute('aria-expanded', String(value));
    contact.setAttribute('aria-hidden', String(!value));
    contact.inert = !value;
    document.body.classList.toggle('is-open', value);
    updateInk(true);
  }

  toggle.addEventListener('click', () => setOpened(!opened));
  document.addEventListener('click', event => {
    if (toggle.contains(event.target) || event.target.closest('a')) return;
    if (opened) setOpened(false);
    else nextFilm();
  });
  const navigationKeys = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', ' ', 'Spacebar']);
  document.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.isComposing) return;
    if (event.key === 'Escape' && opened) {
      event.preventDefault();
      setOpened(false);
      toggle.focus({ preventScroll: true });
      return;
    }
    if (!navigationKeys.has(event.key)) return;
    // Enter still opens a focused email link. Elsewhere it always advances,
    // including when Escape has returned keyboard focus to the YHLA mark.
    if (event.key === 'Enter' && event.target.closest?.('a[href]')) {
      if (!event.repeat) unlockAudio();
      return;
    }
    event.preventDefault();
    if (event.repeat) return;
    unlockAudio();
    nextFilm();
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
    if (selected) remember(selected.id);
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
    const remaining = films.filter(film => !failed.has(film.id) && film.id !== outgoing?.film.id);
    if (remaining.length) load(choose(remaining));
    else if (outgoing) cancelChange();
    else {
      layer.classList.remove('is-playing');
      status.textContent = 'The background film could not be loaded.';
    }
  });
  window.addEventListener('pageshow', event => { if (event.persisted) startPlayback(); });

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
      const offsetX = (width * scale - frame.width) / 2;
      const offsetY = (height * scale - frame.height) / 2;
      context.globalAlpha = opacity;
      context.drawImage(source, (box.left - frame.left + offsetX) / scale,
        (box.top - frame.top + offsetY) / scale, box.width / scale, box.height / scale,
        0, 0, canvas.width, canvas.height);
      return true;
    }
    for (const group of inkGroups) {
      const contactVisible = getComputedStyle(contact).visibility !== 'hidden';
      const words = [...group.element.querySelectorAll('.word')].filter(word => contactVisible || !contact.contains(word));
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
    }
  }
  layers.forEach(item => item.querySelector('.cover').addEventListener('load', () => updateInk(true)));
  window.addEventListener('resize', () => updateInk(true));
  document.addEventListener('visibilitychange', () => { if (!document.hidden) updateInk(true); });
  setInterval(updateInk, 250);

  const previous = readPrevious();
  const candidates = films.filter(film => film.id !== previous);
  if (films.length) load(choose(candidates.length ? candidates : films));
})();
