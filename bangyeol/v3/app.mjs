// 방결 체험판 v3 대화형. 화면 ① 질문 → ② 생년월일 → ③ 유도질문 3 → ④ 안 하면 되는 것 → ⑤ 흐린 잠금 → ⑥ 준비 중(또는 ?all=1) → ⑦ 공유 카드.
import { pillars } from './saju.mjs';
import { QUESTIONS, GUIDES, compose } from './copy.mjs';
import { checkAll } from './guard.mjs';

const app = document.getElementById('app');
const restartBtn = document.getElementById('restart');
const params = new URLSearchParams(location.search);
const SHOW_ALL = params.get('all') === '1';
const SHOW_STATS = params.get('stats') === '1';
const KEY = 'bangyeol-v3';

// 세어 두는 것: 질문별 고른 수 · ④까지 간 수 · 잠금 누른 수 · 카드 저장/복사 수. 생년월일은 세지 않는다.
function loadStats() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}
function bump(name) {
  try {
    const s = loadStats();
    s[name] = (s[name] || 0) + 1;
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch { /* 저장이 막힌 브라우저면 세지 않는다 */ }
}

const state = { q: null, chart: null, hourKnown: true, other: null, picks: [], result: null, lockTouched: 0 };

const h = (tag, attrs = {}, ...kids) => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (v === true) el.setAttribute(k, '');
    else if (v !== false && v != null) el.setAttribute(k, v);
  }
  for (const kid of kids.flat()) if (kid != null) el.append(kid.nodeType ? kid : document.createTextNode(kid));
  return el;
};
function show(...nodes) { app.replaceChildren(...nodes); window.scrollTo({ top: 0 }); }

// ① 질문 고르기
function screenQuestion() {
  restartBtn.hidden = true;
  show(
    h('h1', {}, '내 방에도 나의 결이 있어요'),
    h('p', { class: 'muted' }, '하나만 골라요. 답은 「이것만 안 하면 된다」 하나예요.'),
    h('div', { class: 'list' }, QUESTIONS.map((q) => h('button', { class: 'choice', type: 'button', onclick: () => { state.q = q; bump('picked.' + q.id); screenBirth(); } }, q.title, h('span', { class: 'sub' }, q.short)))),
    SHOW_STATS ? h('pre', { class: 'stats' }, JSON.stringify(loadStats(), null, 2)) : null,
  );
}

// ② 생년월일. 시각은 「모름」 허용(정오로 계산하고 문장에 한 칸 넓어진다고 적는다).
function birthFields(prefix, label) {
  const y = h('input', { type: 'number', inputmode: 'numeric', placeholder: '년', min: 1900, max: 2026, 'aria-label': label + ' 태어난 해' });
  const m = h('input', { type: 'number', inputmode: 'numeric', placeholder: '월', min: 1, max: 12, 'aria-label': label + ' 태어난 달' });
  const d = h('input', { type: 'number', inputmode: 'numeric', placeholder: '일', min: 1, max: 31, 'aria-label': label + ' 태어난 날' });
  const hh = h('select', { 'aria-label': label + ' 태어난 시' }, Array.from({ length: 24 }, (_, i) => h('option', { value: i }, String(i).padStart(2, '0') + '시')));
  const mi = h('select', { 'aria-label': label + ' 태어난 분' }, [0, 10, 20, 30, 40, 50].map((v) => h('option', { value: v }, String(v).padStart(2, '0') + '분')));
  const unknown = h('input', { type: 'checkbox' });
  unknown.addEventListener('change', () => { hh.disabled = mi.disabled = unknown.checked; });
  const box = h('fieldset', { class: 'fieldset' },
    h('legend', {}, label),
    h('div', { class: 'form' },
      h('div', { class: 'field' }, h('label', {}, '생년월일'), h('div', { class: 'row' }, y, m, d)),
      h('div', { class: 'field' }, h('label', {}, '태어난 시각'), h('div', { class: 'row' }, hh, mi), h('label', { class: 'check' }, unknown, '시각을 몰라요')),
    ),
  );
  return {
    box,
    read() {
      const Y = +y.value, M = +m.value, D = +d.value;
      if (!Y || !M || !D) return { error: label + ' 생년월일을 다 적어 주세요.' };
      if (Y < 1900 || Y > 2026 || M < 1 || M > 12 || D < 1 || D > 31) return { error: label + ' 날짜가 범위를 벗어났어요.' };
      const date = new Date(Date.UTC(Y, M - 1, D));
      if (date.getUTCMonth() !== M - 1) return { error: label + ' 그 달에는 없는 날짜예요.' };
      const known = !unknown.checked;
      try {
        const chart = known ? pillars(Y, M, D, +hh.value, +mi.value) : pillars(Y, M, D, 12, 0);
        return { chart, known };
      } catch (e) {
        return { error: '계산할 수 없는 날짜예요.' };
      }
    },
  };
}

function screenBirth() {
  restartBtn.hidden = false;
  const me = birthFields('me', '나');
  const other = state.q.two ? birthFields('other', '그 사람') : null;
  const err = h('p', { class: 'error' });
  const go = () => {
    const a = me.read();
    if (a.error) { err.textContent = a.error; return; }
    let b = null;
    if (other) { b = other.read(); if (b.error) { err.textContent = b.error; return; } }
    state.chart = a.chart; state.hourKnown = a.known; state.other = b ? b.chart : null; state.picks = [];
    screenGuide(0);
  };
  show(
    h('p', { class: 'step' }, state.q.title),
    h('h1', {}, '언제 태어났어요?'),
    h('p', { class: 'muted' }, '음력이면 양력으로 바꿔서 적어 주세요. 시각은 몰라도 돼요.'),
    me.box,
    other ? other.box : null,
    other ? h('p', { class: 'hint' }, '그 사람의 생년월일은 계산에만 쓰고 저장하지 않아요.') : null,
    err,
    h('div', { class: 'actions' }, h('button', { class: 'btn', type: 'button', onclick: go }, '다음')),
  );
}

// ③ 유도질문 3개. 고르면 바로 되받는 문장이 뜨고, 그 뒤 「다음」. 고른 답은 계산에 쓰지 않고 문장에 되비추기만 한다.
function screenGuide(i) {
  const g = GUIDES[state.q.id][i];
  const echo = h('div', { class: 'echo', hidden: true });
  const next = h('button', { class: 'btn', type: 'button', disabled: true, onclick: () => (i < 2 ? screenGuide(i + 1) : screenAnswer()) }, i < 2 ? '다음' : '내 결 보기');
  const btns = ['a', 'b'].map((k) => h('button', { class: 'choice', type: 'button', onclick: (e) => {
    state.picks[i] = k;
    btns.forEach((b) => b.classList.remove('picked'));
    e.currentTarget.classList.add('picked');
    echo.textContent = g[k].echo;
    echo.hidden = false; echo.classList.remove('enter'); void echo.offsetWidth; echo.classList.add('enter');
    next.disabled = false;
  } }, g[k].label));
  show(
    h('p', { class: 'step' }, `${i + 1} / 3`),
    h('h1', {}, g.q),
    h('div', { class: 'list' }, btns),
    echo,
    h('div', { class: 'actions' }, next),
  );
}

// ④ 무료 답 네 문장 + ⑤ 흐린 잠금. 출력 전 금지 목록을 한 번 더 돈다.
function screenAnswer() {
  const r = compose({ chart: state.chart, hourKnown: state.hourKnown, q: state.q.id, picks: state.picks, other: state.other, now: Date.now() });
  const hits = checkAll([...r.free, r.lock, ...r.paid, r.card]);
  if (hits.length) {
    console.error('금지 목록에 걸린 문장', hits);
    show(h('h1', {}, '문장을 다시 고르는 중이에요'), h('p', { class: 'muted' }, '잠시 뒤 처음부터 다시 해 주세요.'), h('div', { class: 'actions' }, h('button', { class: 'btn', type: 'button', onclick: screenQuestion }, '처음으로')));
    return;
  }
  state.result = r; state.lockTouched = 0;
  bump('reached4.' + state.q.id);

  // 흐린 부분은 실제 문장이 아니라 같은 길이의 채움 글자. 개발자 도구로도 읽히지 않는다.
  const filler = '●'.repeat(Math.max(4, r.lockFull.length - 1)) + '.';
  const lock = h('div', { class: 'lock', role: 'button', tabindex: 0, 'aria-label': '잠긴 답 보기' },
    h('div', { class: 'blur' }, r.lock, h('span', {}, filler)),
    h('div', { class: 'cta' }, '나머지 하나 보기 · 990원'),
  );
  const open = () => { state.lockTouched++; bump('lockTouch.' + state.q.id); lock.classList.add('touched'); screenPay(); };
  lock.addEventListener('click', open);
  lock.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });

  show(
    h('p', { class: 'step' }, state.q.title),
    h('div', { class: 'answer' }, r.free.map((s, i) => h('p', { class: i === 3 ? 'last' : '' }, s))),
    lock,
    h('div', { class: 'actions' },
      h('button', { class: 'btn ghost', type: 'button', onclick: screenCard }, '카드로 남기기'),
    ),
  );
}

// ⑥ 결제 자리. 결제가 붙기 전에는 「준비 중」. ?all=1이면 유료 다섯 문장을 그대로 보여 준다(검수용).
function screenPay() {
  const r = state.result;
  const body = SHOW_ALL
    ? h('div', { class: 'pay' }, r.paid.map((s) => h('p', {}, s)))
    : h('div', { class: 'pay' },
      h('p', {}, '결제는 준비 중이에요.'),
      h('p', { class: 'muted' }, '열리면 990원에 나머지 하나를 보여 드려요. 지금은 무료 답과 카드까지만 돼요.'),
    );
  show(
    h('p', { class: 'step' }, state.q.title),
    h('h2', {}, '나머지 하나'),
    body,
    h('div', { class: 'actions' },
      h('button', { class: 'btn', type: 'button', onclick: screenCard }, '카드로 남기기'),
      h('button', { class: 'btn ghost', type: 'button', onclick: screenAnswer }, '앞으로'),
    ),
  );
}

// ⑦ 공유 카드. 이름·생년월일 없이 「안 하면 되는 것」 한 줄만.
function screenCard() {
  const r = state.result;
  const card = h('div', { class: 'card' },
    h('div', { class: 'k' }, '이것만 안 하면 돼요'),
    h('div', { class: 'v' }, r.card),
    h('div', { class: 'm' }, state.q.title),
    h('div', { class: 'b' }, '방결'),
  );
  const note = h('p', { class: 'hint' });
  const copy = async () => {
    try { await navigator.clipboard.writeText(`이것만 안 하면 돼요: ${r.card}\n${state.q.title} · 방결`); note.textContent = '복사했어요.'; bump('share.copy'); }
    catch { note.textContent = '복사가 막혀 있어요. 길게 눌러 복사해 주세요.'; }
  };
  const png = () => {
    const c = document.createElement('canvas'); c.width = 1080; c.height = 1080;
    const x = c.getContext('2d');
    x.fillStyle = '#f6f7f8'; x.fillRect(0, 0, 1080, 1080);
    x.fillStyle = '#ffffff'; x.fillRect(80, 80, 920, 920);
    x.strokeStyle = '#dfe3e8'; x.lineWidth = 2; x.strokeRect(80, 80, 920, 920);
    x.textAlign = 'center'; x.fillStyle = '#5b6878';
    x.font = '32px "Malgun Gothic","Apple SD Gothic Neo",sans-serif'; x.fillText('이것만 안 하면 돼요', 540, 300);
    x.fillStyle = '#192a43'; x.font = '600 56px "Malgun Gothic","Apple SD Gothic Neo",sans-serif';
    const lines = wrap(x, r.card, 820);
    lines.forEach((l, i) => x.fillText(l, 540, 440 + i * 80));
    x.fillStyle = '#5b6878'; x.font = '30px "Malgun Gothic","Apple SD Gothic Neo",sans-serif'; x.fillText(state.q.title, 540, 760);
    x.fillStyle = '#396253'; x.font = '28px "Malgun Gothic","Apple SD Gothic Neo",sans-serif'; x.fillText('방결', 540, 900);
    const a = document.createElement('a'); a.download = '방결 카드.png'; a.href = c.toDataURL('image/png'); a.click();
    note.textContent = '저장했어요.'; bump('share.png');
  };
  show(
    h('p', { class: 'step' }, '카드'),
    card,
    h('div', { class: 'actions' },
      h('button', { class: 'btn', type: 'button', onclick: copy }, '문장 복사'),
      h('button', { class: 'btn ghost', type: 'button', onclick: png }, '그림으로 저장'),
      h('button', { class: 'btn ghost', type: 'button', onclick: screenQuestion }, '다른 질문'),
    ),
    note,
  );
}

function wrap(ctx, text, maxW) {
  const words = text.split(' '); const lines = []; let cur = '';
  for (const w of words) {
    const t = cur ? cur + ' ' + w : w;
    if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}

restartBtn.addEventListener('click', screenQuestion);
screenQuestion();
