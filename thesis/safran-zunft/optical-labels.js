(function (global) {
  'use strict';
  if (global.OpticalLabels && global.OpticalLabels.version) return;
  const selector = '.optical-label,[data-optical-label]';
  const states = new WeakMap();
  const watched = new Set();
  const pending = new Set();
  const rasterCache = new Map();
  const coverageCache = new Map();
  const oversampling = 8;
  let colorContext;
  let frame = 0;
  let busy = false;
  let probeHost;
  let probe;
  let baselineMarker;
  let resolutionQuery;
  let resolutionHandler;
  let overlay;
  let overlayStyle = '';
  const round = n => Math.round(n * 100000) / 100000;
  const fraction = n => n - Math.floor(n);
  const effectiveDpr = () => Math.max(.5, (global.devicePixelRatio || 1) * (global.visualViewport ? global.visualViewport.scale || 1 : 1));

  function ensureProbe() {
    if (probeHost) return;
    probeHost = document.createElement('div');
    probeHost.setAttribute('aria-hidden', 'true');
    probeHost.style.cssText = 'position:fixed;left:-100000px;top:0;visibility:hidden;pointer-events:none;z-index:-1;white-space:pre';
    probe = document.createElement('span');
    probe.style.cssText = 'display:inline-block;padding:0;border:0;margin:0;white-space:pre;text-indent:0;text-transform:none';
    baselineMarker = document.createElement('i');
    baselineMarker.style.cssText = 'display:inline-block;width:0;height:0;margin:0;padding:0;border:0;vertical-align:baseline;line-height:0';
    probeHost.append(probe);
    document.body.append(probeHost);
  }

  function textFor(ink, style) {
    let value = ink.textContent || '';
    const language = ink.lang || ink.closest('[lang]')?.lang || document.documentElement.lang || undefined;
    if (style.textTransform === 'uppercase') value = value.toLocaleUpperCase(language);
    if (style.textTransform === 'lowercase') value = value.toLocaleLowerCase(language);
    if (style.textTransform === 'capitalize') value = value.replace(/(^|\s)(\p{L})/gu, (_, space, letter) => space + letter.toLocaleUpperCase(language));
    return value;
  }

  function baselineFor(text, style) {
    ensureProbe();
    for (const property of ['fontFamily', 'fontSize', 'fontStyle', 'fontWeight', 'fontStretch', 'fontVariant',
      'fontVariantNumeric', 'fontFeatureSettings', 'fontVariationSettings', 'fontKerning', 'letterSpacing', 'wordSpacing', 'lineHeight', 'direction']) {
      probe.style[property] = style[property];
    }
    probe.replaceChildren(document.createTextNode(text), baselineMarker);
    const bounds = probe.getBoundingClientRect();
    return {offset: baselineMarker.getBoundingClientRect().top - bounds.top, width: bounds.width, height: bounds.height};
  }

  function color(value) {
    if (!colorContext) colorContext = document.createElement('canvas').getContext('2d', {willReadFrequently: true});
    colorContext.clearRect(0, 0, 1, 1); colorContext.fillStyle = value; colorContext.fillRect(0, 0, 1, 1);
    return [...colorContext.getImageData(0, 0, 1, 1).data];
  }
  function backgroundFor(label) {
    const layers = [];
    for (let node = label; node; node = node.parentElement) layers.push(color(getComputedStyle(node).backgroundColor));
    const result = [255, 255, 255];
    for (const layer of layers.reverse()) for (let channel = 0; channel < 3; channel += 1)
      result[channel] = Math.round(layer[channel] * layer[3] / 255 + result[channel] * (1 - layer[3] / 255));
    return result;
  }
  function coverage(rgb, foreground, background) {
    let total = 0, channels = 0;
    for (let channel = 0; channel < 3; channel += 1) if (Math.abs(foreground[channel] - background[channel]) > 1) {
      total += (rgb[channel] - background[channel]) / (foreground[channel] - background[channel]); channels += 1;
    }
    return channels ? Math.max(0, Math.min(1, total / channels)) : 0;
  }
  function raster(text, style, dpr, foreground, background) {
    const font = style.fontStyle + ' ' + style.fontWeight + ' ' + style.fontSize + ' ' + style.fontFamily;
    const key = [text, font, style.letterSpacing, style.wordSpacing, style.fontKerning, style.fontStretch,
      style.fontVariantCaps, style.direction, dpr, foreground.join(','), background.join(',')].join('|');
    if (rasterCache.has(key)) return rasterCache.get(key);
    const canvas = document.createElement('canvas');
    let context = canvas.getContext('2d', {willReadFrequently: true});
    function configure() {
      context.font = font; context.textAlign = 'left'; context.textBaseline = 'alphabetic'; context.direction = style.direction;
      for (const property of ['fontKerning', 'fontStretch', 'fontVariantCaps', 'letterSpacing', 'wordSpacing'])
        if (property in context) context[property] = style[property] === 'normal' && /Spacing/.test(property) ? '0px' : style[property];
    }
    configure();
    const metrics = context.measureText(text), size = parseFloat(style.fontSize);
    const origin = {x: Math.max(0, metrics.actualBoundingBoxLeft || 0) + 2,
      y: Math.max(size, metrics.actualBoundingBoxAscent || size) + 2};
    const scale = dpr * oversampling;
    canvas.width = Math.ceil((origin.x + Math.max(metrics.width, metrics.actualBoundingBoxRight || 0) + 2) * scale);
    canvas.height = Math.ceil((origin.y + Math.max(size / 2, metrics.actualBoundingBoxDescent || 0) + 2) * scale);
    context = canvas.getContext('2d', {willReadFrequently: true});
    // Paint the real foreground on the real background before extracting coverage.
    // Transparent black followed by tinting loses Chromium's text contrast adjustment.
    context.fillStyle = 'rgb(' + background.join(',') + ')'; context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(scale, 0, 0, scale, 0, 0); configure(); context.fillStyle = style.color;
    context.fillText(text, origin.x, origin.y);
    const bytes = context.getImageData(0, 0, canvas.width, canvas.height).data;
    const samples = []; let area = 0, mx = 0, my = 0;
    let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity;
    for (let y = 0; y < canvas.height; y += 1) for (let x = 0; x < canvas.width; x += 1) {
      const index = (y * canvas.width + x) * 4;
      const alpha = coverage([bytes[index], bytes[index + 1], bytes[index + 2]], foreground, background);
      if (!alpha) continue;
      samples.push(x, y, alpha); area += alpha; mx += (x + .5) * alpha; my += (y + .5) * alpha;
      left = Math.min(left, x); right = Math.max(right, x + 1); top = Math.min(top, y); bottom = Math.max(bottom, y + 1);
    }
    if (!area) return null;
    const value = {key, font, advance: metrics.width, samples: new Float32Array(samples), mass: {x: mx / area, y: my / area},
      bounds: {left, right, top, bottom}, foreground, background};
    // Cache only nonempty high-resolution ink samples, never whole RGBA canvases.
    if (rasterCache.size >= 64) rasterCache.delete(rasterCache.keys().next().value);
    rasterCache.set(key, value); return value;
  }
  function resample(source, width, height, target) {
    const key = source.key + '|' + width + ':' + height + ':' + round(target.x) + ':' + round(target.y);
    if (coverageCache.has(key)) return coverageCache.get(key);
    const shift = {x: target.x * oversampling - source.mass.x, y: target.y * oversampling - source.mass.y};
    let best;
    for (let iteration = 0; iteration < 8; iteration += 1) {
      const values = new Float64Array(width * height), rgba = new Uint8ClampedArray(width * height * 4);
      for (let index = 0; index < source.samples.length; index += 3) {
        const left = (source.samples[index] + shift.x) / oversampling;
        const top = (source.samples[index + 1] + shift.y) / oversampling;
        const right = left + 1 / oversampling, bottom = top + 1 / oversampling, alpha = source.samples[index + 2];
        for (let py = Math.floor(top); py <= Math.floor(bottom - 1e-10); py += 1) {
          if (py < 0 || py >= height) continue;
          const overlapY = Math.max(0, Math.min(bottom, py + 1) - Math.max(top, py));
          for (let px = Math.floor(left); px <= Math.floor(right - 1e-10); px += 1) {
            if (px < 0 || px >= width) continue;
            const overlapX = Math.max(0, Math.min(right, px + 1) - Math.max(left, px));
            values[py * width + px] += alpha * overlapX * overlapY;
          }
        }
      }
      let area = 0, mx = 0, my = 0, maximum = 0, square = 0, dark75 = 0;
      let left = Infinity, right = -Infinity, top = Infinity, bottom = -Infinity;
      for (let index = 0; index < values.length; index += 1) {
        const byte = Math.min(255, Math.round(values[index] * 255));
        for (let channel = 0; channel < 3; channel += 1) rgba[index * 4 + channel] = source.foreground[channel];
        rgba[index * 4 + 3] = byte;
        const painted = source.background.map((background, channel) => Math.round(background + (source.foreground[channel] - background) * byte / 255));
        const alpha = coverage(painted, source.foreground, source.background), x = index % width, y = Math.floor(index / width);
        area += alpha; mx += (x + .5) * alpha; my += (y + .5) * alpha; square += alpha * alpha;
        maximum = Math.max(maximum, alpha); if (alpha >= .75) dark75 += 1;
        if (alpha >= 8 / 255) {left = Math.min(left, x);right = Math.max(right, x + 1);top = Math.min(top, y);bottom = Math.max(bottom, y + 1);}
      }
      if (!area) return null;
      const error = {x: mx / area - target.x, y: my / area - target.y}, distance = Math.hypot(error.x, error.y);
      if (!best || distance < best.distance) best = {rgba, area, error, distance, bounds: {left, right, top, bottom},
        shift: {...shift}, iterations: iteration + 1, maxAlpha: maximum, dark75, sharpness: square / area};
      if (distance < .008) break;
      shift.x -= error.x * oversampling; shift.y -= error.y * oversampling;
    }
    // Native-size, already centered coverage is reused while scrolling and clipping.
    if (coverageCache.size >= 512) coverageCache.delete(coverageCache.keys().next().value);
    coverageCache.set(key, best); return best;
  }

  function nativeFallback(label, reason, error, clearSource) {
    delete label.dataset.opticalBackend;
    label.dataset.opticalReady = 'false';
    label.dataset.opticalStatus = 'fallback';
    label.dataset.opticalFallback = reason;
    const state = states.get(label);
    if (state) {
      if (clearSource) state.source = null;
      if (state.metrics) Object.assign(state.metrics, {backend: 'native', fallback: true, fallbackReason: reason});
      if (error && state.metrics) state.metrics.error = String(error);
    }
  }

  function register(label) {
    if (!label || !label.isConnected) return null;
    if (!label.classList.contains('optical-label')) label.classList.add('optical-label');
    let ink = label.querySelector(':scope > .optical-label__ink');
    if (!ink && label.children.length === 0) {
      ink = document.createElement('span'); ink.className = 'optical-label__ink';
      while (label.firstChild) ink.append(label.firstChild);
      label.append(ink);
    }
    if (!ink) {nativeFallback(label, 'needs-ink-wrapper', null, true); return null;}
    if (!states.has(label)) states.set(label, {x: 0, y: 0, lastStyle: '', metrics: null, surface: null});
    if (!watched.has(label)) {watched.add(label); resizeObserver?.observe(label); resizeObserver?.observe(ink);}
    return ink;
  }

  function measure(label) {
    const ink = register(label);
    if (!ink) return null;
    if (!label.getClientRects().length || !ink.getClientRects().length || getComputedStyle(label).visibility === 'hidden') {
      nativeFallback(label, 'hidden', null, true); return null;
    }
    const state = states.get(label), style = getComputedStyle(ink), text = textFor(ink, style);
    if (!text.trim()) {nativeFallback(label, 'empty', null, true); return null;}
    const foreground = color(style.color), background = backgroundFor(label);
    const source = raster(text, style, effectiveDpr(), foreground, background);
    if (!source) {nativeFallback(label, 'no-ink', null, true); return null;}
    const caveats = [];
    if (style.fontFeatureSettings !== 'normal') caveats.push('canvas-font-feature-settings');
    if (style.fontVariantNumeric !== 'normal') caveats.push('canvas-font-variant-numeric');
    if (Math.abs(baselineFor(text, style).width - source.advance) > .5) caveats.push('canvas-dom-advance-difference');
    state.source = source;
    state.metrics = {text, font: source.font, devicePixelRatio: global.devicePixelRatio || 1, effectiveDpr: effectiveDpr(),
      backend: 'native', oversampling, caveats, measuredAt: performance.now()};
    delete label.dataset.opticalBackend;
    label.dataset.opticalStatus = 'pending'; label.dataset.opticalReady = 'false';
    return state.metrics;
  }

  function visibleRegion(label) {
    let region = {left: 0, top: 0, right: innerWidth, bottom: innerHeight};
    for (let node = label; node && node !== document.documentElement; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.display === 'none' || style.visibility === 'hidden' || +style.opacity === 0) return null;
      if (node === label) continue;
      const bounds = node.getBoundingClientRect();
      if (/auto|scroll|hidden|clip/.test(style.overflowX)) {
        region.left = Math.max(region.left, bounds.left + parseFloat(style.borderLeftWidth || 0));
        region.right = Math.min(region.right, bounds.right - parseFloat(style.borderRightWidth || 0));
      }
      if (/auto|scroll|hidden|clip/.test(style.overflowY)) {
        region.top = Math.max(region.top, bounds.top + parseFloat(style.borderTopWidth || 0));
        region.bottom = Math.min(region.bottom, bounds.bottom - parseFloat(style.borderBottomWidth || 0));
      }
    }
    const bounds = label.getBoundingClientRect();
    if (bounds.right <= region.left || bounds.left >= region.right || bounds.bottom <= region.top || bounds.top >= region.bottom) return null;
    const x = Math.max(region.left + .1, Math.min(region.right - .1, bounds.left + bounds.width / 2));
    const y = Math.max(region.top + .1, Math.min(region.bottom - .1, bounds.top + bounds.height / 2));
    const hit = document.elementFromPoint(x, y);
    if (hit && !label.contains(hit) && !hit.contains(label)) return null;
    return region;
  }

  function overlayAvailable(width, height) {
    if (!overlay || !overlay.isConnected) return false;
    const style = getComputedStyle(overlay), bounds = overlay.getBoundingClientRect();
    return style.display !== 'none' && style.visibility !== 'hidden' && +style.opacity > 0 &&
      Math.abs(bounds.left) < 1 && Math.abs(bounds.top) < 1 && Math.abs(bounds.width - width) < 1 && Math.abs(bounds.height - height) < 1;
  }

  function paint() {
    const labels = [...watched].filter(label => label.isConnected);
    // Native DOM text is the default for every frame. Canvas is committed only after a successful paint.
    for (const label of labels) nativeFallback(label, states.get(label)?.source ? 'paint-pending' : label.dataset.opticalFallback || 'measurement-unavailable');
    try {
    if (!overlay) {
      overlay = document.createElement('canvas'); overlay.dataset.opticalSurface = 'overlay'; overlay.setAttribute('aria-hidden', 'true');
      overlay.style.cssText = 'position:fixed;left:0;top:0;margin:0;padding:0;border:0;pointer-events:none;z-index:2147483000;max-width:none;max-height:none';
    }
    if (!overlay.isConnected) document.body.append(overlay);
    const dpr = effectiveDpr(), width = Math.max(1, innerWidth), height = Math.max(1, innerHeight);
    overlay.width = Math.ceil(width * dpr); overlay.height = Math.ceil(height * dpr);
    overlay.style.width = width + 'px'; overlay.style.height = height + 'px';
    overlayStyle = overlay.style.cssText;
    if (!overlayAvailable(width, height)) {
      for (const label of labels) nativeFallback(label, 'overlay-unavailable');
      return false;
    }
    const sx = overlay.width / width, sy = overlay.height / height;
    const context = overlay.getContext('2d');
    if (!context) throw new Error('Canvas 2D context unavailable');
    const image = context.createImageData(overlay.width, overlay.height), painted = [];
    for (const label of labels) {
      const state = states.get(label);
      if (!state?.source) continue;
      const region = visibleRegion(label), outer = label.getBoundingClientRect();
      if (!region) {nativeFallback(label, 'not-visible-or-occluded');continue;}
      const origin = {x: Math.floor(outer.left * sx) - 1, y: Math.floor(outer.top * sy) - 1};
      const w = Math.ceil(outer.width * sx) + 3, h = Math.ceil(outer.height * sy) + 3;
      const target = {x: (outer.left + outer.width / 2) * sx - origin.x, y: (outer.top + outer.height / 2) * sy - origin.y};
      const result = resample(state.source, w, h, target);
      if (!result) {nativeFallback(label, 'no-ink');continue;}
      const bounds = {left: (origin.x + result.bounds.left) / sx - outer.left, right: (origin.x + result.bounds.right) / sx - outer.left,
        top: (origin.y + result.bounds.top) / sy - outer.top, bottom: (origin.y + result.bounds.bottom) / sy - outer.top};
      const expectedBounds = {left: (origin.x + (state.source.bounds.left + result.shift.x) / oversampling) / sx - outer.left,
        right: (origin.x + (state.source.bounds.right + result.shift.x) / oversampling) / sx - outer.left,
        top: (origin.y + (state.source.bounds.top + result.shift.y) / oversampling) / sy - outer.top,
        bottom: (origin.y + (state.source.bounds.bottom + result.shift.y) / oversampling) / sy - outer.top};
      const fits = [bounds, expectedBounds].every(value => value.left >= -.05 && value.top >= -.05 && value.right <= outer.width + .05 && value.bottom <= outer.height + .05);
      const error = {x: result.error.x / sx, y: result.error.y / sy};
      Object.assign(state.metrics, {massError: error, massDistance: Math.hypot(error.x, error.y), bounds, expectedBounds, fits,
        alphaArea: result.area / sx / sy, maxAlpha: result.maxAlpha, dark75: result.dark75, sharpness: result.sharpness, iterations: result.iterations,
        boundsCenterError: {x: (bounds.left + bounds.right) / 2 - outer.width / 2, y: (bounds.top + bounds.bottom) / 2 - outer.height / 2}});
      if (!fits) {nativeFallback(label, 'overflow');continue;}
      let copied = 0;
      // Transfer final native pixels at integer coordinates. No drawImage scale or second resampling.
      for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) {
        const px = origin.x + x, py = origin.y + y, source = (y * w + x) * 4;
        if (!result.rgba[source + 3] || px < 0 || py < 0 || px >= overlay.width || py >= overlay.height) continue;
        if ((px + .5) / sx < region.left || (px + .5) / sx >= region.right || (py + .5) / sy < region.top || (py + .5) / sy >= region.bottom) continue;
        const destination = (py * overlay.width + px) * 4;
        image.data.set(result.rgba.subarray(source, source + 4), destination);
        copied += 1;
      }
      if (copied) painted.push(label); else nativeFallback(label, 'outside-paint-clip');
    }
    context.putImageData(image, 0, 0);
    if (!overlayAvailable(width, height)) throw new Error('Canvas overlay disconnected or hidden during paint');
    for (const label of painted) {
      label.dataset.opticalStatus = 'ready'; label.dataset.opticalReady = 'true'; label.dataset.opticalBackend = 'canvas';
      delete label.dataset.opticalFallback;
      const metrics = states.get(label)?.metrics;
      if (metrics) {metrics.backend = 'canvas';metrics.fallback = false;delete metrics.fallbackReason;delete metrics.error;}
    }
    return true;
    } catch (error) {
      // Resizing clears a partially painted surface so the visible fallback cannot double-print.
      try {if (overlay) overlay.width = overlay.width;} catch (_) {}
      for (const label of labels) nativeFallback(label, 'paint-error', error);
      return false;
    }
  }

  async function flush() {
    frame = 0;
    if (busy) {schedule(); return;}
    busy = true;
    try {
      if (document.fonts) await document.fonts.ready;
      const labels = [...pending]; pending.clear();
      for (const label of labels) if (label.isConnected) {
        try {measure(label);} catch (error) {
          const state = states.get(label); if (state) state.metrics = {text: label.textContent, error: String(error), fits: false};
          nativeFallback(label, 'measurement-error', error, true);
        }
      } else watched.delete(label);
      paint();
    } finally {busy = false; if (pending.size) schedule();}
  }
  function schedule() {if (!frame) frame = requestAnimationFrame(flush);}
  function enqueue(label) {if (label?.matches?.(selector)) {register(label);nativeFallback(label, 'measurement-pending');pending.add(label);schedule();}}
  function refresh(root) {
    const target = root || document;
    if (target.matches?.(selector)) enqueue(target);
    target.querySelectorAll?.(selector).forEach(enqueue);
  }
  function enhance(root, targets) {
    const target = root || document;
    target.querySelectorAll(targets || '[data-optical-label]').forEach(label => {if (!label.classList.contains('optical-label')) label.classList.add('optical-label'); enqueue(label);});
  }
  const resizeObserver = global.ResizeObserver ? new ResizeObserver(entries => {
    for (const entry of entries) enqueue(entry.target.matches(selector) ? entry.target : entry.target.closest(selector));
  }) : null;
  const mutations = new MutationObserver(records => {
    for (const record of records) {
      if (overlay && record.removedNodes && [...record.removedNodes].some(node => node === overlay || node.contains?.(overlay))) {
        for (const label of watched) if (label.isConnected) nativeFallback(label, 'overlay-detached');
        schedule();
      }
      const target = record.target.nodeType === 1 ? record.target : record.target.parentElement;
      if (!target || target === probe || probeHost?.contains(target)) continue;
      if (target.matches?.('[data-optical-surface]')) {
        if (target === overlay && (record.attributeName === 'class' || overlay.style.cssText !== overlayStyle)) {
          for (const label of watched) if (label.isConnected) nativeFallback(label, 'overlay-style-changed');
          schedule();
        }
        continue;
      }
      if (record.type === 'attributes' && target.matches('.optical-label__ink') && target.getAttribute('style') === states.get(target.closest(selector))?.lastStyle) continue;
      if (target.matches?.('style,link') || record.attributeName === 'data-theme') {rasterCache.clear(); coverageCache.clear(); refresh(); continue;}
      enqueue(target.closest?.(selector));
      if (record.type === 'attributes') refresh(target);
      record.addedNodes?.forEach(node => {if (node.nodeType === 1) refresh(node);});
      record.removedNodes?.forEach(node => {
        if (node.nodeType !== 1 || node.isConnected) return;
        const removed = [...node.querySelectorAll(selector)]; if (node.matches(selector)) removed.push(node);
        for (const label of removed) {watched.delete(label); pending.delete(label); resizeObserver?.unobserve(label); const ink = label.querySelector('.optical-label__ink'); if (ink) resizeObserver?.unobserve(ink);}
      });
      schedule();
    }
  });
  function watchResolution() {
    if (resolutionQuery && resolutionHandler) resolutionQuery.removeEventListener('change', resolutionHandler);
    resolutionQuery = matchMedia('(resolution: ' + (global.devicePixelRatio || 1) + 'dppx)');
    resolutionHandler = () => {rasterCache.clear(); coverageCache.clear(); watchResolution(); refresh();};
    resolutionQuery.addEventListener('change', resolutionHandler);
  }
  function start() {
    mutations.observe(document.documentElement, {subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['class', 'style', 'data-optical-label', 'data-theme']});
    refresh(); watchResolution();
    global.addEventListener('resize', () => refresh());
    global.addEventListener('scroll', () => refresh(), true);
    global.visualViewport?.addEventListener('resize', () => refresh());
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => refresh());
    document.fonts?.addEventListener('loadingdone', () => {rasterCache.clear(); coverageCache.clear(); refresh();});
    document.fonts?.addEventListener('loadingerror', () => {rasterCache.clear(); coverageCache.clear(); refresh();});
    document.fonts?.ready.then(() => refresh());
  }
  global.OpticalLabels = {version: '1.3.1', refresh, enhance, measure: label => {try {measure(label);} catch (error) {nativeFallback(label, 'measurement-error', error, true);}paint();return states.get(label)?.metrics || null;},
    getMetrics: label => states.get(label)?.metrics || null,
    audit: () => [...watched].filter(label => label.isConnected).map(label => ({...states.get(label)?.metrics, status: label.dataset.opticalStatus, ready: label.dataset.opticalReady === 'true', backend: label.dataset.opticalBackend || 'native', fallbackReason: label.dataset.opticalFallback || null})),
    whenReady: async () => {if (document.fonts) await document.fonts.ready; refresh(); await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); return global.OpticalLabels.audit();}};
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once: true}); else start();
})(window);
/* FORMA optical-labels source end */

/* FORMA optical component binding begin */
(function () {
  'use strict';
  var shapes = '.btn,.tabs button,.toc a,.chip,.tag,.pill,.count-badge,[data-optical-label]';
  function connect(root) {
    if (!window.OpticalLabels || !root.querySelectorAll) return;
    var labels = Array.from(root.querySelectorAll(shapes));
    if (root.nodeType === 1 && root.matches(shapes)) labels.unshift(root);
    labels.forEach(function (label) {
      if (!label.hasAttribute('data-optical-label')) label.setAttribute('data-optical-label', '');
    });
    window.OpticalLabels.refresh(root);
  }
  function start() {
    connect(document);
    new MutationObserver(function (records) {
      records.forEach(function (record) {
        if (record.type === 'attributes') connect(record.target);
        record.addedNodes.forEach(function (node) { if (node.nodeType === 1) connect(node); });
      });
    }).observe(document.body, {subtree: true, childList: true, attributes: true, attributeFilter: ['class']});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once: true});
  else start();
})();
/* FORMA optical component binding end */
