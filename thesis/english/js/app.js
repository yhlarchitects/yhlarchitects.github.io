// English - 화면과 흐름. 빌드 도구 없이 ES 모듈로 돈다.
import { S, save, BLOCKS, ymd, weekMinutes, closedOn, daysUsed, addLog, recordHits, addMsg, addRec, exportAll, importAll } from "./store.js";
import { check, RULE_KO } from "./check.js";
import { RATINGS, preview, rate, intervalKo, buildQueue } from "./srs.js";
import { hasSpeech, enVoices, onVoices, speak, stopSpeaking } from "./speech.js";
import { canRecord, startRec, putRec, getRec } from "./rec.js";

const app = document.getElementById("app");
let C = null;          // 콘텐츠
let session = null;    // 지금 열린 블록 { block, start }
let recNow = null;     // 지금 도는 녹음

/* ── 작은 도구 ── */
function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  if (attrs) for (const k of Object.keys(attrs)) {
    const v = attrs[k];
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "text") el.textContent = v;
    else if (k.slice(0, 2) === "on") el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const c of kids.flat(Infinity)) if (c != null && c !== false) el.append(c.nodeType ? c : String(c));
  return el;
}
function btn(label, onclick, cls = "btn big") { return h("button", { class: cls, type: "button", onclick }, label); }
function render(...nodes) { stopSpeaking(); stopRec(); app.replaceChildren(...nodes); window.scrollTo(0, 0); }
function go(route) { if (location.hash === "#/" + route) route_(); else location.hash = "#/" + route; }
function dateKo(d = new Date()) { return (d.getMonth() + 1) + "월 " + d.getDate() + "일 " + "일월화수목금토"[d.getDay()] + "요일"; }
function whenKo(iso) { const d = new Date(iso); return (d.getMonth() + 1) + "." + d.getDate() + " " + String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); }
function voiceOpts(rate) { const p = S().prefs; return { voiceURI: p.voiceURI || null, rate: rate || p.rate || 1, lang: "en-GB" }; }
function stopRec() { if (recNow) { try { recNow.stop(); } catch (e) { /* 이미 멈춤 */ } recNow = null; } }

/* ── 블록 시간 ── */
function openSession(block) { flushSession(); session = { block, start: Date.now() }; }
function flushSession(closed = false) {
  if (!session) return;
  const seconds = (Date.now() - session.start) / 1000;
  if (closed || seconds >= 3) addLog({ block: session.block, seconds, closed });
  session.start = Date.now();
}
function endSession(closed) { flushSession(closed); session = null; }
window.addEventListener("pagehide", () => flushSession(false));
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flushSession(false); else if (session) session.start = Date.now(); });

/* ── 카드 들이기: 걸린 규칙의 카드가 먼저, 그다음 하루에 여섯 장씩 ── */
function introduced() {
  const all = Object.keys(C.cards);
  const n = Math.min(all.length, 12 + 6 * daysUsed());
  const ids = S().pulled.filter((id) => C.cards[id]);
  for (const id of all.slice(0, n)) if (!ids.includes(id)) ids.push(id);
  return ids;
}
function queue() { return buildQueue(S().reviews, C.cards, introduced()); }

/* ── 피드백: 맞힌 것 → 고칠 것 하나 → 바른 꼴 ── */
function feedback({ right, fix, sentence, more }) {
  const box = h("div", { class: "fb", id: "fb" });
  if (right) box.append(h("p", null, h("span", { class: "label" }, "맞힌 것"), " ", right));
  if (fix) box.append(h("p", null, h("span", { class: "label" }, "고칠 것"), " ", fix));
  if (sentence) box.append(h("p", null, h("span", { class: "label" }, "바른 꼴"), " ", h("span", { lang: "en", id: "fixed" }, sentence)));
  if (more) box.append(h("p", null, h("span", { class: "label" }, ""), " ", h("span", { class: "muted" }, more)));
  return box;
}

/* ── 오늘 ── */
function screenToday() {
  endSession(false);
  const closed = closedOn();
  const due = queue().length;
  const talk = C.prompts[(S().talkPtr || 0) % C.prompts.length];
  const hints = {
    msg: "보내기 전 영어 한 통을 먼저 쓴다",
    review: due ? "카드 " + due + "장" : "볼 카드 없음",
    shadow: "카드 문장 다섯 · 이달 강연",
    talk: talk ? talk.ko : "주제 없음",
  };
  const rows = Object.keys(BLOCKS).map((b) =>
    h("button", { class: "blk", type: "button", "data-block": b, onclick: () => go(b) },
      h("span", { class: "nm" }, BLOCKS[b]),
      h("span", { class: "hint" }, hints[b]),
      h("span", { class: "st" }, closed.has(b) ? "닫음" : "5분")));
  const seen = Object.keys(S().reviews).length;
  const stat = (n, unit, l, id) => h("div", { class: "stat" }, h("span", { class: "n", id }, String(n), unit ? h("small", null, unit) : null), h("span", { class: "l" }, l));
  render(
    h("p", { class: "meta" }, dateKo(), " · ", closed.size ? h("b", { id: "closed-today" }, "오늘 닫힘") : "블록 하나면 오늘이 닫힌다"),
    h("h1", null, "오늘"),
    h("div", { class: "blocks" }, rows),
    h("div", { class: "stats" },
      stat(weekMinutes(), "분", "이번 주", "week-min"),
      stat(seen, "장", "본 카드", "seen"),
      stat(S().msgs.length, "통", "저장한 메시지", "msg-n")),
    h("div", { class: "foot" }, btn("기억", () => go("memory"), "btn")),
    h("p", { class: "fn" }, "기록은 이 기기에 남는다. 홈 화면에 추가해 두면 지워지지 않는다.")
  );
}

/* ── 블록 틀 ── */
function blockFrame(block, sub, ...body) {
  openSession(block);
  return [
    h("div", { class: "bar" }, btn("오늘로", () => go("today"), "btn")),
    h("p", { class: "meta" }, "약 5분", sub ? " · " + sub : ""),
    h("h1", null, BLOCKS[block]),
    ...body.flat(Infinity),
    h("div", { class: "closebar" }, btn("이 블록 닫기", () => { endSession(true); go("today"); }, "btn big primary")),
  ];
}

/* ── 메시지: 먼저 내가 쓰고, 고칠 것 하나 ── */
function screenMsg() {
  const ta = h("textarea", { id: "draft", rows: "5", lang: "en", spellcheck: "false", autocapitalize: "sentences", placeholder: "보낼 영어를 먼저 쓴다. 다섯 줄 안." });
  const out = h("div", { class: "out" });
  const counted = new Set();
  let last = null;

  function run() {
    const text = ta.value;
    if (!text.trim()) { ta.focus(); return; }
    const r = check(text); last = { draft: text, r };
    const fresh = r.hits.map((x) => x.id).filter((id) => !counted.has(id));
    fresh.forEach((id) => counted.add(id));
    if (fresh.length) recordHits(fresh, C.cards);
    const top = r.hits[0];
    const fix = top ? h("span", null, top.found ? h("b", { lang: "en" }, "「" + top.found + "」 ") : null, top.ko, top.ex ? h("span", { class: "muted", lang: "en" }, " 예: " + top.ex) : null) : null;
    const more = r.hits.length > 1 ? "그 밖에 " + (r.hits.length - 1) + "곳: " + r.hits.slice(1).map((x) => RULE_KO[x.id] || x.id).join(" · ") : null;
    const sent = h("textarea", { id: "sent", rows: "4", lang: "en", spellcheck: "false" }); sent.value = r.fixed;
    const note = h("p", { class: "fn", id: "msg-saved" });
    out.replaceChildren(
      feedback({ right: r.right, fix, sentence: r.hits.length ? r.fixed : null, more }),
      h("p", { class: "label" }, "보낸 판"),
      sent,
      h("div", { class: "row" },
        btn("복사", async () => { try { await navigator.clipboard.writeText(sent.value); note.textContent = "복사했다."; } catch (e) { sent.select(); note.textContent = "선택해 두었다. 복사해서 붙인다."; } }, "btn"),
        btn("기억에 저장", () => {
          addMsg({ draft: last.draft, fixed: last.r.fixed, sent: sent.value, rules: last.r.hits.map((x) => x.id) });
          note.textContent = "저장했다. 걸린 꼴의 카드는 오늘 복습 앞으로 왔다.";
          ta.value = ""; counted.clear();
        }, "btn big primary")),
      note);
  }

  render(...blockFrame("msg", "먼저 내가 쓴다",
    h("p", { class: "lead" }, "Teams · 메일에 보낼 영어를 여기에 먼저 친다. 고칠 것은 하나만 본다."),
    ta,
    h("div", { class: "row" }, btn("검사", run, "btn big primary")),
    out));
}

/* ── 카드 ── */
function screenReview() {
  const reviews = S().reviews;
  const q = queue();
  const area = h("div", { class: "review" });

  function next() {
    area.replaceChildren();
    if (!q.length) {
      const dues = Object.values(reviews).map((c) => new Date(c.due)).sort((a, b) => a - b);
      area.append(h("p", { class: "lead", id: "review-done" }, "지금 볼 카드는 다 봤다."),
        dues.length ? h("p", { class: "muted" }, "다음 카드는 " + intervalKo(dues[0]) + " 뒤.") : null);
      return;
    }
    const id = q[0]; const c = C.cards[id]; const shown = Date.now();
    const back = h("div", { class: "back", hidden: true },
      h("p", { class: "en", lang: "en" }, c.en),
      hasSpeech() ? btn("듣기", () => speak(c.en, voiceOpts()), "btn") : null,
      h("div", { class: "rates" }, RATINGS.map(({ r, ko }) => {
        const due = preview(reviews[id])[r];
        return h("button", { class: "btn big rate", type: "button", "data-rating": String(r), onclick: () => grade(id, r, shown) },
          ko, h("small", null, intervalKo(due)));
      })));
    const flip = btn("원어민 판", () => { back.hidden = false; flip.hidden = true; }, "btn big primary");
    flip.id = "flip";
    area.append(
      h("p", { class: "meta" }, "남은 카드 ", h("b", null, String(q.length)), " · ", C.groups[c.g] || ""),
      h("div", { class: "face card" },
        h("p", { class: "sit muted" }, c.sit),
        h("p", { class: "fn" }, "이렇게 쓰던 것을 소리 내어 고쳐 말한다"),
        h("p", { class: "was", lang: "en" }, c.was)),
      flip, back);
  }

  function grade(id, r, shown) {
    const now = new Date();
    const { card } = rate(reviews[id], r, now);
    reviews[id] = card;
    S().reviewLogs.push({ cardId: id, rating: r, at: now.toISOString(), ms: Date.now() - shown });
    S().pulled = S().pulled.filter((x) => x !== id);
    save();
    q.shift();
    if (new Date(card.due) - now < 5 * 60000 && q.length) q.push(id);
    next();
  }

  next();
  render(...blockFrame("review", "상황을 보고 원어민 판을 먼저 말한다", area));
}

/* ── 녹음 한 칸: 시작 · 멈춤 · 다시 듣기, 기억에 남긴다 ── */
function recBox({ key, kind, label, maxSec, onDone, timer }) {
  const player = h("audio", { controls: true, hidden: true });
  const st = h("span", { class: "muted" });
  let url = null; let tick = null;
  function show(blob) { if (url) URL.revokeObjectURL(url); url = URL.createObjectURL(blob); player.src = url; player.hidden = false; }
  const b = btn("녹음", async () => {
    if (recNow) { stopRec(); return; }
    try {
      const started = Date.now();
      recNow = await startRec(maxSec * 1000);
      b.textContent = "멈춤"; st.textContent = "녹음 중";
      if (timer) { timer.textContent = String(maxSec); tick = setInterval(() => { timer.textContent = String(Math.max(0, maxSec - Math.floor((Date.now() - started) / 1000))); }, 250); }
      const blob = await recNow.done;
      clearInterval(tick); recNow = null; b.textContent = "다시 녹음";
      const sec = Math.round((Date.now() - started) / 1000);
      st.textContent = sec + "초";
      show(blob);
      await putRec(key, blob);
      addRec({ key, kind, label, sec });
      if (onDone) onDone(sec);
    } catch (e) { clearInterval(tick); recNow = null; b.textContent = "녹음"; st.textContent = "마이크를 열 수 없다."; }
  }, "btn big");
  if (!canRecord()) return h("p", { class: "fn" }, "이 브라우저는 녹음이 안 된다.");
  return h("div", null, h("div", { class: "row" }, b, st), player);
}

/* ── 따라 말하기 ── */
function screenShadow() {
  const q = queue();
  const ids = (q.length ? q : Object.keys(S().reviews)).concat(introduced()).filter((v, i, a) => a.indexOf(v) === i).slice(0, 5);
  const m = ymd().slice(0, 7);
  const talk = C.talks.find((t) => t.month === m) || C.talks[0];
  const list = ids.map((id, i) => {
    const c = C.cards[id];
    return h("div", { class: "task" },
      h("p", { class: "model", lang: "en" }, c.en),
      h("div", { class: "row" },
        hasSpeech() ? btn("듣기", () => speak(c.en, voiceOpts()), "btn") : null,
        hasSpeech() ? btn("천천히", () => speak(c.en, voiceOpts(0.8)), "btn") : null),
      recBox({ key: "sh-" + ymd() + "-" + id, kind: "shadow", label: c.en, maxSec: 20 }));
  });
  const sel = h("select", { id: "voice", "aria-label": "목소리" });
  function fillVoices() {
    const vs = enVoices(); sel.replaceChildren(h("option", { value: "" }, "기본 목소리"));
    for (const v of vs) sel.append(h("option", { value: v.voiceURI, selected: S().prefs.voiceURI === v.voiceURI }, v.name + " · " + v.lang));
  }
  sel.addEventListener("change", () => { S().prefs.voiceURI = sel.value || null; save(); });
  fillVoices(); onVoices(fillVoices);
  render(...blockFrame("shadow", "들은 그대로, 강세 자리까지",
    hasSpeech() ? h("div", { class: "row" }, sel) : h("p", { class: "fn" }, "이 브라우저는 읽어 주기가 안 된다."),
    list,
    talk ? h("div", { class: "task" },
      h("p", { class: "label" }, "이달 강연"),
      h("p", null, h("a", { href: "https://www.youtube.com/results?search_query=" + encodeURIComponent(talk.q), target: "_blank", rel: "noopener" }, talk.title)),
      h("p", { class: "fn" }, "30~60초 한 구간을 골라 소리 내어 따라 한다.")) : null));
}

/* ── 90 · 60 · 45초 ── */
function screenTalk() {
  const i = (S().talkPtr || 0) % C.prompts.length;
  const p = C.prompts[i];
  const ROUNDS = [90, 60, 45];
  let round = 0;
  const chips = h("div", { class: "rounds" }, ROUNDS.map((s) => h("span", null, s + "초")));
  const timer = h("p", { class: "timer", id: "timer" }, String(ROUNDS[0]));
  const slot = h("div");
  const note = h("input", { type: "text", id: "fix-one", placeholder: "다음 판에서 고칠 것 하나 (한국어로)" });

  function show() {
    [...chips.children].forEach((c, k) => c.classList.toggle("on", k === round));
    if (round >= ROUNDS.length) {
      timer.textContent = "끝";
      S().talkPtr = i + 1; save();
      slot.replaceChildren(h("p", { class: "lead", id: "talk-done" }, "세 판을 다 했다. 녹음은 기억에 있다."));
      return;
    }
    timer.textContent = String(ROUNDS[round]);
    slot.replaceChildren(
      recBox({ key: "tk-" + ymd() + "-" + i + "-" + ROUNDS[round], kind: "talk", label: p.ko + " · " + ROUNDS[round] + "초" + (note.value ? " · 고칠 것: " + note.value : ""), maxSec: ROUNDS[round], timer, onDone: () => {
        slot.append(round === 0 ? h("div", { class: "row" }, note) : null, h("div", { class: "row" }, btn(round < ROUNDS.length - 1 ? "다음 판 " + ROUNDS[round + 1] + "초" : "마치기", () => { round++; show(); }, "btn big primary")));
      } }));
  }
  show();
  render(...blockFrame("talk", "같은 이야기를 세 번, 점점 짧게",
    h("p", { class: "lead" }, p.ko),
    h("p", { class: "fn" }, "영어로 말한다. 멈추지 말고, 막히면 쉬운 말로 돌아간다."),
    chips, timer, slot,
    h("div", { class: "row" }, btn("다른 주제", () => { S().talkPtr = i + 1; save(); go("talk"); }, "btn"))));
}

/* ── 기억 ── */
function screenMemory() {
  endSession(false);
  const hits = Object.entries(S().hits).sort((a, b) => b[1].n - a[1].n);
  const msgs = S().msgs.slice(0, 30);
  const recs = S().recs.slice(0, 30);
  const total = Object.keys(C.cards).length;
  const seen = Object.keys(S().reviews).length;
  const dues = Object.values(S().reviews).map((c) => new Date(c.due)).sort((a, b) => a - b);
  const persisted = h("p", { class: "fn", id: "persist" });
  if (navigator.storage && navigator.storage.persisted) navigator.storage.persisted().then((p) => { persisted.textContent = p ? "이 기기에 고정 저장되어 있다." : "브라우저가 정리하면 지워질 수 있다. 홈 화면에 추가하거나 가끔 내보내 둔다."; });
  const msgOut = h("p", { class: "fn", id: "io-msg" });
  const file = h("input", { type: "file", accept: "application/json,.json", hidden: true, onchange: async () => {
    try { importAll(JSON.parse(await file.files[0].text())); msgOut.textContent = "불러와 합쳤다."; setTimeout(() => go("memory"), 600); }
    catch (e) { msgOut.textContent = "불러오지 못했다: " + e.message; }
  } });

  function playRow(r) {
    const player = h("audio", { controls: true, hidden: true });
    return h("li", null,
      h("div", { class: "line" }, h("p", null, r.label, h("span", { class: "muted" }, " · " + whenKo(r.at) + " · " + r.sec + "초")),
        btn("듣기", async () => { const v = await getRec(r.key); if (!v) { player.replaceWith(h("p", { class: "fn" }, "이 기기에는 녹음이 없다.")); return; } player.src = URL.createObjectURL(v.blob); player.hidden = false; player.play(); }, "btn")),
      player);
  }

  render(
    h("div", { class: "bar" }, btn("오늘로", () => go("today"), "btn")),
    h("h1", null, "기억"),
    h("p", { class: "meta" }, "카드 ", h("b", null, seen + " / " + total), dues.length ? " · 다음 복습 " + intervalKo(dues[0]) + " 뒤" : "", " · 쓴 날 " + daysUsed() + "일"),
    h("h2", null, "자주 걸린 꼴"),
    hits.length ? h("ul", { class: "memlist", id: "hits" }, hits.map(([id, v]) => h("li", null, h("div", { class: "line" }, h("p", null, RULE_KO[id] || id), h("p", { class: "muted" }, v.n + "번 · " + whenKo(v.last)))))) : h("p", { class: "muted" }, "아직 없다. 메시지 블록에서 검사하면 쌓인다."),
    h("h2", null, "보낸 메시지"),
    msgs.length ? h("ul", { class: "memlist", id: "msgs" }, msgs.map((m) => h("li", null,
      m.draft !== m.sent ? h("p", { class: "was", lang: "en" }, m.draft) : null,
      h("p", { class: "now", lang: "en" }, m.sent),
      h("p", { class: "fn" }, whenKo(m.at), m.rules.length ? " · " + m.rules.map((x) => RULE_KO[x] || x).join(" · ") : "")))) : h("p", { class: "muted" }, "아직 없다."),
    h("h2", null, "녹음"),
    recs.length ? h("ul", { class: "memlist", id: "recs" }, recs.map(playRow)) : h("p", { class: "muted" }, "아직 없다."),
    h("h2", null, "옮기기"),
    h("p", { class: "fn" }, "다른 기기로 옮길 때: 여기서 내보내고, 그 기기에서 불러온다. 두 기기 기록은 합쳐진다. 녹음 파일은 옮겨지지 않는다."),
    h("div", { class: "row" },
      btn("내보내기", () => {
        const blob = new Blob([JSON.stringify(exportAll(), null, 2)], { type: "application/json" });
        const a = h("a", { href: URL.createObjectURL(blob), download: "english-" + ymd() + ".json" });
        document.body.append(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
        msgOut.textContent = "내려받았다.";
      }, "btn"),
      btn("불러오기", () => file.click(), "btn"), file),
    msgOut, persisted
  );
}

/* ── 길 ── */
const ROUTES = { today: screenToday, msg: screenMsg, review: screenReview, shadow: screenShadow, talk: screenTalk, memory: screenMemory };
function route_() {
  const name = (location.hash.replace(/^#\/?/, "") || "today").split("?")[0];
  (ROUTES[name] || screenToday)();
}
window.addEventListener("hashchange", () => { if (session) endSession(false); route_(); });

/* ── 시작 ── */
async function swReady() {
  if (!("serviceWorker" in navigator)) return;
  try {
    await navigator.serviceWorker.register("sw.js");
    if (navigator.serviceWorker.controller) return;
    await Promise.race([
      new Promise((res) => navigator.serviceWorker.addEventListener("controllerchange", res, { once: true })),
      new Promise((res) => setTimeout(res, 3000)),
    ]);
  } catch (e) { /* 워커가 없어도 앱은 돈다 */ }
}

async function main() {
  await swReady();
  try { C = await (await fetch("content/en.json", { cache: "no-cache" })).json(); }
  catch (e) { render(h("h1", null, "열 수 없다"), h("p", { class: "muted" }, "콘텐츠를 읽지 못했다. 처음 한 번은 인터넷이 필요하다.")); return; }
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  route_();
}
main();
