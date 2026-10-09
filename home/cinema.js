(() => {
  'use strict';
  const films = VIDEO-CATALOG;
  const video = document.getElementById('film');
  const toggle = document.getElementById('yhla');
  const contact = document.getElementById('contact');
  const status = document.getElementById('status');
  const storageKey = 'yhla:last-film:v1';
  const attempted = new Set();
  let opened = false;
  let selected;
  let playRequest = 0;
  let needsGesture = true;
  let lastTime = 0;
  let loopRestartPending = false;

  const readPrevious = () => {
    try { return localStorage.getItem(storageKey); } catch { return null; }
  };
  const remember = id => {
    try { localStorage.setItem(storageKey, id); } catch { /* Playback works without storage. */ }
  };
  const choose = candidates => candidates[Math.floor(Math.random() * candidates.length)];

  function playWithSound() {
    const request = ++playRequest;
    video.muted = false;
    // Keep play() synchronous with a real click or touch when audio needs unlocking.
    const result = video.play();
    if (!result) return;
    result.then(() => {
      if (request === playRequest) needsGesture = video.muted;
    }).catch(() => {
      // An older autoplay rejection must not mute a newer gesture-driven attempt.
      if (request !== playRequest) return;
      needsGesture = true;
      video.muted = true;
      video.play().catch(() => {
        if (request === playRequest) status.textContent = 'Tap anywhere to play the background film.';
      });
    });
  }

  function unlockAudio() {
    if (needsGesture || video.muted || video.paused) playWithSound();
  }
  // Capture gestures before links or the contact toggle handle their own actions.
  document.addEventListener('click', unlockAudio, true);
  document.addEventListener('touchend', unlockAudio, { capture: true, passive: true });
  document.addEventListener('keydown', event => {
    if (!event.repeat && (event.key === 'Enter' || event.key === ' ')) unlockAudio();
  }, true);

  function load(film) {
    selected = film;
    lastTime = 0;
    loopRestartPending = false;
    attempted.add(film.id);
    video.dataset.film = film.id;
    if (film.poster) video.poster = film.poster;
    else video.removeAttribute('poster');
    video.src = film.src;
    playWithSound();
  }

  function setOpened(value) {
    opened = value;
    toggle.setAttribute('aria-expanded', String(value));
    contact.hidden = !value;
    document.body.classList.toggle('is-open', value);
  }

  toggle.addEventListener('click', () => setOpened(!opened));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && opened) {
      setOpened(false);
      toggle.focus({ preventScroll: true });
    }
  });
  document.querySelector('.background').addEventListener('click', () => {
    if (opened) setOpened(false);
  });
  video.addEventListener('playing', () => {
    status.textContent = '';
    if (selected) remember(selected.id);
  });
  function resumeLoop() {
    if (!loopRestartPending || !video.paused || document.hidden) return;
    loopRestartPending = false;
    if (!video.muted) playWithSound();
    else video.play().catch(() => { needsGesture = true; });
  }
  video.addEventListener('timeupdate', () => {
    const wrapped = video.loop && lastTime > video.duration - 1 && video.currentTime < .25;
    lastTime = video.currentTime;
    // Some WebKit media backends pause at the start of a native loop.
    // Resume only that boundary, preserving sound and ordinary user pauses.
    if (wrapped) loopRestartPending = true;
    else if (video.currentTime >= .25) loopRestartPending = false;
    resumeLoop();
  });
  video.addEventListener('pause', resumeLoop);
  video.addEventListener('error', () => {
    const remaining = films.filter(film => !attempted.has(film.id));
    if (remaining.length) load(choose(remaining));
    else status.textContent = 'The background film could not be loaded.';
  });
  window.addEventListener('pageshow', event => { if (event.persisted) playWithSound(); });

  const previous = readPrevious();
  const candidates = films.filter(film => film.id !== previous);
  if (films.length) load(choose(candidates.length ? candidates : films));
})();
