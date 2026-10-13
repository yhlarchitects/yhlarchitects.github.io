// 기기 안 기록(localStorage). 녹음 파일은 rec.js 가 IndexedDB 에 따로 둔다.
// 모양은 content/SCHEMA.md 「Local state」: reviews[userId][cardId], log[] = { user, date, block, seconds, errors[] }.
import { schedule } from "./sync.js";

const KEY = "deutsch2628:v1";
export const USERS = { yeonho: "연호", junghyun: "정현" };
export const BLOCKS = {
  review: "복습",
  stair: "원문 계단",
  ear: "귀",
  hand: "손",
};
const MAX_SECONDS = 20 * 60; // 한 번 열어 둔 채 자리를 비워도 20분 넘게 세지 않는다

function blank() {
  return {
    version: 1,
    user: null,
    reviews: { yeonho: {}, junghyun: {} },
    reviewLogs: [],
    log: [],
    attempts: [],
    diagnostic: { yeonho: null, junghyun: null },
    dayPtr: {},
    stairLayer: {},
    prefs: {},
  };
}

function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && s.version === 1) {
      const b = blank();
      const out = Object.assign(b, s);
      out.reviews = Object.assign(b.reviews, s.reviews || {});
      out.diagnostic = Object.assign({ yeonho: null, junghyun: null }, s.diagnostic || {});
      return out;
    }
  } catch (e) { /* 깨진 값이면 새로 시작 */ }
  return blank();
}

const state = load();

export function S() { return state; }

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* 용량 초과 등 */ }
  schedule();
}

export function ymd(d = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
}

export function weekStart(d = new Date()) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const wd = (x.getDay() + 6) % 7; // 월요일 = 0
  x.setDate(x.getDate() - wd);
  return ymd(x);
}

export function weekMinutes(user, d = new Date()) {
  const from = weekStart(d);
  const to = ymd(d);
  let sec = 0;
  for (const e of state.log) if (e.user === user && e.date >= from && e.date <= to) sec += e.seconds || 0;
  return Math.round(sec / 60);
}

export function closedOn(user, date = ymd()) {
  const set = new Set();
  for (const e of state.log) if (e.user === user && e.date === date && e.closed && BLOCKS[e.block]) set.add(e.block);
  return set;
}

export function addLog(entry) {
  const seconds = Math.max(0, Math.min(MAX_SECONDS, Math.round(entry.seconds || 0)));
  state.log.push(Object.assign({ user: state.user, date: ymd(), ts: new Date().toISOString(), errors: [] }, entry, { seconds }));
  save();
}

export function addAttempt(a) {
  state.attempts.push(Object.assign({ user: state.user, date: ymd(), ts: new Date().toISOString() }, a));
  save();
}

export function exportFor(user, meta) {
  const mine = (arr) => arr.filter((x) => x.user === user);
  return {
    app: "deutsch-2628",
    schema: 1,
    exportedAt: new Date().toISOString(),
    user,
    content: meta,
    reviews: state.reviews[user] || {},
    reviewLogs: mine(state.reviewLogs),
    log: mine(state.log),
    attempts: mine(state.attempts),
    diagnostic: state.diagnostic[user] || null,
    dayPtr: state.dayPtr[user] || null,
  };
}

/* ── 동기화: 한 코드에 두 사람 기록 ── */
// 올리는 것: 기록 전체. 이 기기의 사람(user)·목소리 같은 기기 설정은 받는 쪽이 무시한다.
export function exportState() {
  return { app: "deutsch2628", state };
}

const t = (iso) => (iso ? new Date(iso).getTime() || 0 : 0);
function rowKey(x) { return JSON.stringify([x.user, x.ts || x.reviewedAt || x.at || "", x.block || "", x.cardId || x.task || "", x.dayId || ""]); }
function union(a, b) {
  const seen = new Set((a || []).map(rowKey));
  const out = (a || []).slice();
  for (const x of b || []) { const k = rowKey(x); if (!seen.has(k)) { seen.add(k); out.push(x); } }
  return out.sort((x, y) => t(x.ts || x.reviewedAt) - t(y.ts || y.reviewedAt));
}
function dayNo(id) { const m = /(\d+)$/.exec(String(id || "")); return m ? Number(m[1]) : -1; }

// 받은 기록을 사람별로 합친다. 카드는 더 최근에 본 쪽, 진행(dayPtr·계단 층)은 더 나아간 쪽.
export function mergeState(data) {
  const inc = data && data.state;
  if (!inc || data.app !== "deutsch2628") throw new Error("이 앱의 기록이 아니다.");
  const st = state;
  for (const u of new Set(Object.keys(st.reviews).concat(Object.keys(inc.reviews || {})))) {
    const mine = (st.reviews[u] = st.reviews[u] || {});
    const theirs = (inc.reviews || {})[u] || {};
    for (const id of Object.keys(theirs)) {
      const a = mine[id]; const b = theirs[id];
      if (!a || t(b && b.last_review) > t(a.last_review)) mine[id] = b;
    }
  }
  st.reviewLogs = union(st.reviewLogs, inc.reviewLogs);
  st.log = union(st.log, inc.log);
  st.attempts = union(st.attempts, inc.attempts);
  for (const u of Object.keys(inc.diagnostic || {})) {
    const a = st.diagnostic[u]; const b = inc.diagnostic[u];
    if (b && (!a || t(b.at) > t(a.at))) st.diagnostic[u] = b;
  }
  for (const u of Object.keys(inc.dayPtr || {})) {
    const a = st.dayPtr[u]; const b = inc.dayPtr[u];
    if (!b) continue;
    if (!a || dayNo(b.dayId) > dayNo(a.dayId) || (dayNo(b.dayId) === dayNo(a.dayId) && String(b.date) > String(a.date))) st.dayPtr[u] = b;
  }
  for (const u of Object.keys(inc.stairLayer || {})) {
    const mine = (st.stairLayer[u] = st.stairLayer[u] || {});
    for (const [d, i] of Object.entries(inc.stairLayer[u] || {})) mine[d] = Math.max(mine[d] || 0, i || 0);
  }
  // 사람별 표시(진단 건너뜀 · 주간 정리 본 것)만 합친다. 목소리·속도는 기기마다 다르다.
  const ip = inc.prefs || {}; const p = st.prefs;
  for (const k of ["diagSkipped", "weekSeen"]) if (ip[k]) {
    p[k] = Object.assign({}, p[k]);
    for (const u of Object.keys(ip[k])) p[k][u] = typeof ip[k][u] === "object" && ip[k][u] ? Object.assign({}, p[k][u] || {}, ip[k][u]) : (p[k][u] || ip[k][u]);
  }
  save();
}
