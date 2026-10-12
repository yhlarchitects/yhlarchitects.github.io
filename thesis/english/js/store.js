// 기억: 이 기기의 localStorage 한 덩어리. 진도·카드 일정·자주 걸린 규칙·보낸 메시지 짝·녹음 목록.
// 내보내기 JSON 으로 다른 기기에 옮긴다(불러오기는 합친다).

const KEY = "english:v1";

export const BLOCKS = {
  msg: "메시지",
  review: "카드",
  shadow: "따라 말하기",
  talk: "90 · 60 · 45초",
};

function fresh() {
  return {
    v: 1,
    since: new Date().toISOString(),
    logs: [],        // { block, seconds, closed, at }
    reviews: {},     // cardId → FSRS 카드
    reviewLogs: [],  // { cardId, rating, at, ms }
    hits: {},        // 규칙 id → { n, last }
    pulled: [],      // 규칙에 걸려 앞으로 당겨 온 카드 id (최근 것이 앞)
    msgs: [],        // { at, draft, fixed, sent, rules: [] }
    recs: [],        // { key, kind, label, round, at, sec }
    talkPtr: 0,
    prefs: { voiceURI: null, rate: 1 },
  };
}

let state = null;

export function S() {
  if (state) return state;
  try { state = Object.assign(fresh(), JSON.parse(localStorage.getItem(KEY) || "null") || {}); }
  catch (e) { state = fresh(); }
  return state;
}

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S())); return true; }
  catch (e) { return false; }
}

export function ymd(d = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + p(d.getMonth() + 1) + "-" + p(d.getDate());
}

export function addLog({ block, seconds, closed }) {
  S().logs.push({ block, seconds: Math.round(seconds), closed: !!closed, at: new Date().toISOString() });
  save();
}

export function closedOn(day = ymd()) {
  const out = new Set();
  for (const l of S().logs) if (l.closed && ymd(new Date(l.at)) === day) out.add(l.block);
  return out;
}

export function weekMinutes(now = new Date()) {
  const from = new Date(now); from.setHours(0, 0, 0, 0);
  from.setDate(from.getDate() - ((from.getDay() + 6) % 7)); // 월요일부터
  let s = 0;
  for (const l of S().logs) if (new Date(l.at) >= from) s += l.seconds;
  return Math.round(s / 60);
}

export function daysUsed() {
  const d = new Set(S().logs.map((l) => ymd(new Date(l.at))));
  return d.size;
}

// 규칙에 걸리면 수를 세고, 그 규칙의 카드를 오늘 복습 앞으로 당긴다(이미 본 카드면 지금 때로).
export function recordHits(ruleIds, cards) {
  const st = S(); const now = new Date().toISOString();
  for (const id of [...ruleIds].reverse()) {
    const h = st.hits[id] || { n: 0, last: null };
    h.n += 1; h.last = now; st.hits[id] = h;
    for (const cid of Object.keys(cards).reverse()) {
      if (cards[cid].rule !== id) continue;
      st.pulled = [cid].concat(st.pulled.filter((x) => x !== cid)).slice(0, 60);
      const r = st.reviews[cid];
      if (r && new Date(r.due) > new Date()) r.due = now;
    }
  }
  save();
}

export function addMsg(m) {
  S().msgs.unshift(Object.assign({ at: new Date().toISOString() }, m));
  S().msgs = S().msgs.slice(0, 300);
  save();
}

export function addRec(r) {
  S().recs.unshift(Object.assign({ at: new Date().toISOString() }, r));
  S().recs = S().recs.slice(0, 200);
  save();
}

export function exportAll() {
  return { app: "english", exportedAt: new Date().toISOString(), state: S() };
}

// 불러오기: 두 기기 기록을 합친다. 같은 카드는 더 최근에 본 쪽.
export function importAll(data) {
  const inc = data && data.state;
  if (!inc || data.app !== "english") throw new Error("이 앱의 기록 파일이 아니다.");
  const st = S();
  const key = (o) => JSON.stringify([o.at, o.block || o.cardId || o.key || o.draft]);
  const merge = (a, b) => { const seen = new Set(a.map(key)); return a.concat((b || []).filter((x) => !seen.has(key(x)))); };
  st.logs = merge(st.logs, inc.logs).sort((x, y) => x.at < y.at ? -1 : 1);
  st.reviewLogs = merge(st.reviewLogs, inc.reviewLogs);
  st.msgs = merge(st.msgs, inc.msgs).sort((x, y) => x.at < y.at ? 1 : -1);
  st.recs = merge(st.recs, inc.recs).sort((x, y) => x.at < y.at ? 1 : -1);
  for (const id of Object.keys(inc.reviews || {})) {
    const a = st.reviews[id]; const b = inc.reviews[id];
    const t = (c) => (c && c.last_review ? new Date(c.last_review).getTime() : 0);
    if (!a || t(b) > t(a)) st.reviews[id] = b;
  }
  for (const id of Object.keys(inc.hits || {})) {
    const a = st.hits[id]; const b = inc.hits[id];
    st.hits[id] = !a ? b : { n: Math.max(a.n, b.n), last: (a.last || "") > (b.last || "") ? a.last : b.last };
  }
  st.pulled = Array.from(new Set(st.pulled.concat(inc.pulled || [])));
  if (inc.since && inc.since < st.since) st.since = inc.since;
  st.talkPtr = Math.max(st.talkPtr || 0, inc.talkPtr || 0);
  save();
}
