// 기기 안 기록(localStorage). 녹음 파일은 rec.js 가 IndexedDB 에 따로 둔다.
// 모양은 content/SCHEMA.md 「Local state」: reviews[userId][cardId], log[] = { user, date, block, seconds, errors[] }.
import { sync } from "./sync.js";

const KEY = "deutsch:v1";
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
  sync(state).catch(() => {});
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
    app: "deutsch",
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
