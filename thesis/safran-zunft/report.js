/* Safran Zunft report: section rail, zoom viewer with numbered spots, compare slider, timeline, lightbox. */
(function () {
  'use strict';
  var root = document.documentElement;
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function lang() { return 'en'; }
  function t(el, name) { return el.getAttribute('data-' + name + '-' + lang()) || el.getAttribute('data-' + name) || ''; }
  function refreshOptical(r) { if (window.OpticalLabels) window.OpticalLabels.refresh(r || document); }

  /* English only, light only */

  /* zoom and pan viewer */
  function Viewer(fig) {
    var stage = $('.stage', fig), canvas = $('.canvas', fig), img = $('img', canvas);
    var s = 1, x = 0, y = 0, base = 1, iw = 0, ih = 0, pointers = new Map(), last = null, moved = 0, note = null;
    function size() { return stage.getBoundingClientRect(); }
    function fit() {
      var r = size(); iw = img.naturalWidth || 1600; ih = img.naturalHeight || 1200;
      canvas.style.width = iw + 'px'; canvas.style.height = ih + 'px';
      base = Math.min(r.width / iw, r.height / ih); s = base; x = (r.width - iw * s) / 2; y = (r.height - ih * s) / 2; apply();
    }
    function clamp() {
      var r = size(), w = iw * s, h = ih * s;
      x = w <= r.width ? (r.width - w) / 2 : Math.min(0, Math.max(r.width - w, x));
      y = h <= r.height ? (r.height - h) / 2 : Math.min(0, Math.max(r.height - h, y));
    }
    function apply() { clamp(); canvas.style.transform = 'translate(' + x + 'px,' + y + 'px) scale(' + s + ')'; canvas.style.setProperty('--k', s); }
    function zoomAt(cx, cy, f) {
      var ns = Math.min(Math.max(base, s * f), Math.max(base * 8, 2));
      x = cx - (cx - x) * (ns / s); y = cy - (cy - y) * (ns / s); s = ns; apply();
    }
    function center() { var r = size(); return [r.width / 2, r.height / 2]; }
    stage.addEventListener('wheel', function (e) {
      e.preventDefault(); fig.classList.add('touched');
      var r = size(); zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * (e.ctrlKey ? .01 : .0018)));
    }, { passive: false });
    stage.addEventListener('pointerdown', function (e) {
      if (e.target.closest('.spot,.tools,.note')) return;
      stage.setPointerCapture(e.pointerId); pointers.set(e.pointerId, [e.clientX, e.clientY]); moved = 0;
      stage.classList.add('drag'); fig.classList.add('touched');
    });
    stage.addEventListener('pointermove', function (e) {
      if (!pointers.has(e.pointerId)) return;
      var p = pointers.get(e.pointerId), r = size();
      if (pointers.size === 1) { x += e.clientX - p[0]; y += e.clientY - p[1]; moved += Math.abs(e.clientX - p[0]) + Math.abs(e.clientY - p[1]); apply(); }
      pointers.set(e.pointerId, [e.clientX, e.clientY]);
      if (pointers.size === 2) {
        var a = Array.from(pointers.values()), d = Math.hypot(a[0][0] - a[1][0], a[0][1] - a[1][1]);
        var mx = (a[0][0] + a[1][0]) / 2 - r.left, my = (a[0][1] + a[1][1]) / 2 - r.top;
        if (last) { x += mx - last.mx; y += my - last.my; zoomAt(mx, my, d / last.d); }
        last = { d: d, mx: mx, my: my };
      }
    });
    function up(e) { pointers.delete(e.pointerId); last = null; if (!pointers.size) stage.classList.remove('drag'); }
    stage.addEventListener('pointerup', up); stage.addEventListener('pointercancel', up);
    stage.addEventListener('dblclick', function (e) {
      if (e.target.closest('.spot,.tools,.note')) return;
      var r = size(); zoomAt(e.clientX - r.left, e.clientY - r.top, s > base * 1.9 ? base / s : 2);
    });
    stage.tabIndex = 0;
    stage.addEventListener('keydown', function (e) {
      var c = center(), k = e.key, step = 60;
      if (k === '+' || k === '=') zoomAt(c[0], c[1], 1.4); else if (k === '-') zoomAt(c[0], c[1], 1 / 1.4); else if (k === '0') fit();
      else if (k === 'ArrowLeft') { x += step; apply(); } else if (k === 'ArrowRight') { x -= step; apply(); }
      else if (k === 'ArrowUp') { y += step; apply(); } else if (k === 'ArrowDown') { y -= step; apply(); } else return;
      e.preventDefault();
    });
    fig.addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]');
      if (b && fig.contains(b)) {
        var c = center(), act = b.getAttribute('data-act');
        if (act === 'in') zoomAt(c[0], c[1], 1.5); else if (act === 'out') zoomAt(c[0], c[1], 1 / 1.5); else if (act === 'fit') fit();
        else if (act === 'spots') { var on = fig.classList.toggle('nospots'); b.setAttribute('aria-pressed', String(!on)); closeNote(); }
        else if (act === 'full') openLightbox(fig);
        return;
      }
      var sp = e.target.closest('.spot');
      if (sp && fig.contains(sp)) { select(sp.getAttribute('data-n')); return; }
      if (e.target.closest('.note .x')) closeNote();
    });
    function closeNote() {
      if (note) { note.remove(); note = null; }
      $$('.spot', fig).forEach(function (q) { q.setAttribute('aria-pressed', 'false'); });
      legend().forEach(function (li) { li.classList.remove('on'); });
    }
    function legend() { var id = fig.getAttribute('data-legend'); return id ? $$('#' + id + ' li') : []; }
    function select(n, focus) {
      var sp = $('.spot[data-n="' + n + '"]', fig); if (!sp) return;
      var was = sp.getAttribute('aria-pressed') === 'true'; closeNote(); if (was) return;
      fig.classList.remove('nospots'); var tg = $('[data-act="spots"]', fig); if (tg) tg.setAttribute('aria-pressed', 'true');
      sp.setAttribute('aria-pressed', 'true');
      legend().forEach(function (li) { li.classList.toggle('on', li.getAttribute('data-n') === n); });
      if (focus) {
        var r = size(), px = parseFloat(sp.style.left) / 100 * iw, py = parseFloat(sp.style.top) / 100 * ih;
        s = Math.max(s, base * 2.2); x = r.width / 2 - px * s; y = r.height / 2 - py * s; apply();
      }
      note = document.createElement('div'); note.className = 'note'; note.setAttribute('data-yhla-floating-surface', 'text'); note.setAttribute('role', 'status');
      var b = document.createElement('b'), p = document.createElement('span'), xb = document.createElement('button');
      b.textContent = n + '  ' + t(sp, 'title'); p.textContent = t(sp, 'text'); xb.className = 'x'; xb.type = 'button'; xb.textContent = '×';
      xb.setAttribute('aria-label', 'Close');
      note.appendChild(xb); note.appendChild(b); note.appendChild(p); fig.appendChild(note);
    }
    legend().forEach(function (li) { li.addEventListener('click', function () { select(li.getAttribute('data-n'), true); fig.scrollIntoView({ block: 'nearest' }); }); });
    if (img.complete && img.naturalWidth) fit(); else img.addEventListener('load', fit, { once: true });
    if (window.ResizeObserver) new ResizeObserver(function () { var z = s / base; fit(); if (z > 1.01) { var c = center(); zoomAt(c[0], c[1], z); } }).observe(stage);
    return { fit: fit };
  }

  /* lightbox: the same viewer, full window, glass backdrop */
  var lb = null;
  function openLightbox(src) {
    closeLightbox();
    var fig = src.classList && src.classList.contains('viewer') ? src : null, img = fig ? $('img', fig) : src;
    lb = document.createElement('div'); lb.className = 'lb'; lb.setAttribute('data-yhla-floating-surface', ''); lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true');
    var cap = (fig ? t(fig, 'cap') : '') || t(img, 'cap') || img.alt || '';
    lb.innerHTML = '<div class="bar"><span></span><button type="button" class="pill" data-close></button></div>' +
      '<figure class="viewer"><div class="stage"><div class="canvas"></div></div>' +
      '<div class="tools" data-yhla-floating-surface>' +
      '<button type="button" class="ib" data-act="out"><svg viewBox="0 0 24 24"><path d="M5 12h14"/></svg></button>' +
      '<button type="button" class="ib" data-act="in"><svg viewBox="0 0 24 24"><path d="M5 12h14M12 5v14"/></svg></button>' +
      '<button type="button" class="ib" data-act="fit"><svg viewBox="0 0 24 24"><path d="M5 9V5h4M15 5h4v4M19 15v4h-4M9 19H5v-4"/></svg></button>' +
      '</div></figure>';
    $('.bar span', lb).textContent = cap; $('[data-close]', lb).textContent = 'Close';
    var tips = { out: 'Zoom out', in: 'Zoom in', fit: 'Fit' };
    $$('.ib', lb).forEach(function (b) { var p = tips[b.getAttribute('data-act')]; b.setAttribute('data-tip', p); b.setAttribute('aria-label', p); });
    var c = $('.canvas', lb), ni = new Image(); ni.src = img.currentSrc || img.src; ni.alt = img.alt; if (img.classList.contains('ink')) ni.className = 'ink';
    c.appendChild(ni);
    if (fig) $$('.spot', fig).forEach(function (sp) { var q = sp.cloneNode(true); q.setAttribute('aria-pressed', 'false'); c.appendChild(q); });
    document.body.appendChild(lb); document.body.style.overflow = 'hidden';
    Viewer($('.viewer', lb)); refreshOptical(lb); $('[data-close]', lb).focus();
  }
  function closeLightbox() { if (lb) { lb.remove(); lb = null; document.body.style.overflow = ''; } }
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-close]') || (lb && e.target === lb)) { closeLightbox(); return; }
    var z = e.target.closest('[data-zoom]');
    if (z) { var im = z.tagName === 'IMG' ? z : $('img', z); if (im) openLightbox(im); }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeLightbox(); });

  /* compare slider */
  function Compare(el) {
    var input = $('input', el);
    function set(v) { el.style.setProperty('--pos', v + '%'); }
    input.addEventListener('input', function () { set(input.value); }); set(input.value);
  }

  /* timeline */
  function Timeline(el) {
    var tabs = $$('.track button', el), panels = $$('.panel', el), i = 0;
    function show(n, focus) {
      i = (n + tabs.length) % tabs.length;
      tabs.forEach(function (b, k) { b.setAttribute('aria-selected', String(k === i)); b.tabIndex = k === i ? 0 : -1; });
      panels.forEach(function (p, k) { p.hidden = k !== i; });
      if (focus) tabs[i].focus();
      if (tabs[i].scrollIntoView) tabs[i].scrollIntoView({ block: 'nearest', inline: 'nearest' });
      refreshOptical(el);
    }
    tabs.forEach(function (b, k) { b.addEventListener('click', function () { show(k); }); });
    $('.track', el).addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { show(i + 1, true); e.preventDefault(); } else if (e.key === 'ArrowLeft') { show(i - 1, true); e.preventDefault(); }
    });
    el.addEventListener('click', function (e) { var b = e.target.closest('[data-step]'); if (b) show(i + Number(b.getAttribute('data-step'))); });
    show(0);
  }

  /* rail: current section */
  function Rail() {
    var links = $$('.rail a[href^="#"]'), notice = $('.yhla-notice'); if (!links.length || !window.IntersectionObserver) return;
    var map = {}; links.forEach(function (a) { map[a.getAttribute('href').slice(1)] = a; });
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (!en.isIntersecting) return;
        links.forEach(function (a) { a.removeAttribute('aria-current'); });
        var a = map[en.target.id]; if (!a) return; a.setAttribute('aria-current', 'true');
        if (notice) notice.textContent = (a.innerText || a.textContent).replace(/\s+/g, ' ').trim();
      });
    }, { rootMargin: '-30% 0px -60% 0px' });
    Object.keys(map).forEach(function (id) { var s = document.getElementById(id); if (s) io.observe(s); });
  }

  function start() {
    $$('figure.viewer[data-viewer]').forEach(Viewer); $$('.compare').forEach(Compare); $$('.tl').forEach(Timeline); Rail();
    refreshOptical();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true }); else start();
})();
