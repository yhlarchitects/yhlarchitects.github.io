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

  const readPrevious = () => {
    try { return localStorage.getItem(storageKey); } catch { return null; }
  };
  const remember = id => {
    try { localStorage.setItem(storageKey, id); } catch { /* Playback works without storage. */ }
  };
  const choose = candidates => candidates[Math.floor(Math.random() * candidates.length)];

  function play() {
    const request = ++playRequest;
    video.muted = !opened;
    const result = video.play();
    if (!result) return;
    result.catch(() => {
      if (request !== playRequest) return;
      // A muted retry keeps the background usable under stricter browser policies.
      video.muted = true;
      video.play().catch(() => {
        if (request === playRequest) status.textContent = 'Select YHLA to play the background film.';
      });
    });
  }

  function load(film) {
    selected = film;
    attempted.add(film.id);
    video.dataset.film = film.id;
    if (film.poster) video.poster = film.poster;
    else video.removeAttribute('poster');
    video.src = film.src;
    play();
  }

  function setOpened(value) {
    opened = value;
    toggle.setAttribute('aria-expanded', String(value));
    contact.hidden = !value;
    document.body.classList.toggle('is-open', value);
    // Run play directly inside the click handler so the gesture unlocks audio.
    play();
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
  video.addEventListener('error', () => {
    const remaining = films.filter(film => !attempted.has(film.id));
    if (remaining.length) load(choose(remaining));
    else status.textContent = 'The background film could not be loaded.';
  });
  window.addEventListener('pageshow', event => { if (event.persisted) play(); });

  const previous = readPrevious();
  const candidates = films.filter(film => film.id !== previous);
  if (films.length) load(choose(candidates.length ? candidates : films));
})();
