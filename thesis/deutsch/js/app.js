// Deutsch - 화면과 흐름. 빌드 도구 없이 ES 모듈로 돈다.
import { S, save, USERS, BLOCKS, ymd, weekMinutes, closedOn, addLog, addAttempt, exportFor } from "./store.js";
import { loadContent } from "./content.js";
import { RATINGS, preview, rate, intervalKo, buildQueue } from "./srs.js";
import { hasSpeech, deVoices, onVoices, pickVoice, speak, stopSpeaking } from "./speech.js";
import { canRecord, startRec, putRec, getRec } from "./rec.js";
import { createRun, nextItem, answer as diagAnswer, result as diagResult, SKILL_KO, isScored } from "./diag.js";

const app = document.getElementById("app");
let C = null;          // 콘텐츠
let session = null;    // 지금 열린 블록 { block, start, errors, dayId }

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
function render(...nodes) { stopSpeaking(); app.replaceChildren(...nodes); window.scrollTo(0, 0); }
function go(route) { if (location.hash === "#/" + route) route_(); else location.hash = "#/" + route; }
function user() { return S().user; }
function dateKo(d = new Date()) { return (d.getMonth() + 1) + "월 " + d.getDate() + "일 " + "일월화수목금토"[d.getDay()] + "요일"; }
function norm(s) { return String(s == null ? "" : s).trim().replace(/\s+/g, " "); }
function fold(s) { return norm(s).toLowerCase().replace(/ä/g, "a").replace(/ö/g, "o").replace(/ü/g, "u").replace(/ß/g, "ss").replace(/ae/g, "a").replace(/oe/g, "o").replace(/ue/g, "u"); }

/* ── 블록 시간 ── */
function openSession(block, dayId) { flushSession(); session = { block, start: Date.now(), errors: [], dayId }; }
function flushSession(closed = false) {
  if (!session) return;
  const seconds = (Date.now() - session.start) / 1000;
  if (closed || seconds >= 3) addLog({ block: session.block, seconds, closed, errors: session.errors, dayId: session.dayId });
  session.start = Date.now(); session.errors = [];
}
function endSession(closed) { flushSession(closed); session = null; }
window.addEventListener("pagehide", () => flushSession(false));
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flushSession(false); else if (session) session.start = Date.now(); });

/* ── 오늘의 날(콘텐츠 하루) ── */
function currentDay(u) {
  const days = C.days; if (!days.length) return null;
  const t = ymd();
  let p = S().dayPtr[u];
  let idx = p ? days.findIndex((d) => d.id === p.dayId) : -1;
  if (idx < 0) { p = { dayId: days[0].id, date: t }; S().dayPtr[u] = p; save(); return days[0]; }
  if (p.date !== t) {
    if (closedOn(u, p.date).size && idx < days.length - 1) idx++;
    S().dayPtr[u] = { dayId: days[idx].id, date: t }; save();
  }
  return days[idx];
}
function introduced(u) {
  const day = currentDay(u); const upto = day ? C.days.indexOf(day) : -1;
  const ids = [];
  C.days.forEach((d, i) => { if (i <= upto) for (const id of d.new_cards || []) if (!ids.includes(id)) ids.push(id); });
  return ids.length ? ids : Object.keys(C.cards);
}

/* ── 피드백: 맞힌 것 → 고칠 것 하나 → 바른 문장 ── */
function feedback({ right, fix, sentence, sentenceLabel = "바른 문장", de = true }) {
  const box = h("div", { class: "fb" });
  if (right) box.append(h("p", null, h("span", { class: "label" }, "맞힌 것"), " ", right));
  if (fix) box.append(h("p", null, h("span", { class: "label" }, "고칠 것"), " ", fix));
  if (sentence) box.append(h("p", null, h("span", { class: "label" }, sentenceLabel), " ", h("span", { lang: de ? "de" : "ko" }, sentence)));
  return box;
}
function clozeFeedback(task, given) {
  const want = norm(task.answer); const g = norm(given);
  const filled = String(task.prompt_de || "").replace(/_{2,}/, want);
  if (g === want) return { ok: true, fb: feedback({ right: "「" + want + "」 자리를 맞혔다.", sentence: filled }) };
  let right = null; let fix = "「" + (g || "빈칸") + "」 대신 「" + want + "」.";
  if (g && g.toLowerCase() === want.toLowerCase()) { right = "낱말은 맞다."; fix = /^[A-ZÄÖÜ]/.test(want) ? "명사는 대문자로 시작한다: 「" + want + "」." : "소문자로 쓴다: 「" + want + "」."; }
  else if (g && fold(g) === fold(want)) { right = "낱말은 맞다."; fix = "움라우트·ß 표기: 「" + want + "」."; }
  return { ok: false, fb: feedback({ right, fix, sentence: filled }) };
}

/* ── 사람 고르기 ── */
function screenPick() {
  endSession(false);
  setWho();
  const pick = (id) => () => {
    S().user = id; save(); setWho();
    const d = S().diagnostic[id]; const skipped = (S().prefs.diagSkipped || {})[id];
    go(!d && !skipped && C.diagnostic ? "diag" : "today");
  };
  render(
    h("p", { class: "meta" }, "이 기기를 쓰는 사람"),
    h("h1", null, "누구인가"),
    h("p", { class: "lead" }, "한 번 고르면 이 기기가 기억한다. 나중에 바꿀 수 있다."),
    h("div", { class: "picks" }, Object.keys(USERS).map((id) => btn(USERS[id], pick(id), "btn big primary-outline")))
  );
}
function setWho() { const el = document.getElementById("who"); if (el) el.textContent = user() ? "· " + USERS[user()] : ""; }

/* ── 오늘 ── */
function screenToday() {
  endSession(false);
  const u = user(); const day = currentDay(u); const closed = closedOn(u);
  const intro = introduced(u);
  const due = buildQueue(S().reviews[u] || {}, C.cards, intro).length;
  const layerIdx = day ? ((S().stairLayer[u] || {})[day.id] || 0) : 0;
  const layers = day && day.stair ? day.stair.layers || [] : [];
  const hints = {
    review: due ? "카드 " + due + "장" : "볼 카드 없음",
    stair: layers.length ? (layers[layerIdx] ? layers[layerIdx].level + " 층" : "꼭대기") : "원문 없음",
    ear: day && day.ear ? "속도 " + ((day.ear.rates || [1])[0]) + "부터" : "대본 없음",
    hand: day && day.hand ? "한 문장" : "지시 없음",
  };
  const rows = Object.keys(BLOCKS).map((b) =>
    h("button", { class: "blk", type: "button", "data-block": b, onclick: () => go(b) },
      h("span", { class: "nm" }, BLOCKS[b]),
      h("span", { class: "hint" }, hints[b]),
      h("span", { class: "st" }, closed.has(b) ? "닫음" : "5분")));
  const mins = weekMinutes(u);
  render(
    h("p", { class: "meta" }, dateKo(), " · ", closed.size ? h("b", { id: "closed-today" }, "오늘 닫힘") : "블록 하나면 오늘이 닫힌다"),
    h("h1", null, "오늘"),
    h("p", { class: "lead" }, day ? day.theme_ko || day.id : "콘텐츠가 아직 없다.", C.sample ? h("span", { class: "faint" }, " · 예시 콘텐츠") : null),
    h("div", { class: "blocks" }, rows),
    h("div", { class: "stats" }, h("div", { class: "stat" }, h("span", { class: "n", id: "week-min" }, String(mins), h("small", null, "분")), h("span", { class: "l" }, "이번 주"))),
    h("div", { class: "foot" },
      btn(S().diagnostic[u] ? "진단 다시" : "진단", () => go("diag"), "btn"),
      btn("기록 내보내기", () => exportJSON(), "btn"),
      btn("사람 바꾸기", () => { S().user = null; save(); go("pick"); }, "btn")),
    h("p", { class: "fn", id: "export-msg" }, "기록은 이 기기에만 있다.")
  );
}

function exportJSON() {
  const u = user();
  const data = exportFor(u, { base: C.base, days: C.days.map((d) => d.id), sample: C.sample });
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const a = h("a", { href: URL.createObjectURL(blob), download: "deutsch-" + u + "-" + ymd() + ".json" });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  const m = document.getElementById("export-msg"); if (m) m.textContent = "기록을 내려받았다.";
}

/* ── 블록 틀 ── */
function blockFrame(block, day, ...body) {
  openSession(block, day ? day.id : null);
  return [
    h("div", { class: "bar" }, btn("오늘로", () => go("today"), "btn")),
    h("p", { class: "meta" }, "약 5분 · ", day ? day.theme_ko || day.id : ""),
    h("h1", null, BLOCKS[block]),
    ...body,
    h("div", { class: "closebar" }, btn("이 블록 닫기", () => { endSession(true); go("today"); }, "btn big primary")),
  ];
}

/* ── 복습 ── */
function screenReview() {
  const u = user(); const day = currentDay(u);
  const reviews = (S().reviews[u] = S().reviews[u] || {});
  const queue = buildQueue(reviews, C.cards, introduced(u));
  const area = h("div", { class: "review" });

  function next() {
    area.replaceChildren();
    if (!queue.length) {
      const dues = Object.values(reviews).map((c) => new Date(c.due)).sort((a, b) => a - b);
      area.append(h("p", { class: "lead", id: "review-done" }, "지금 볼 카드는 다 봤다."),
        dues.length ? h("p", { class: "muted" }, "다음 카드는 " + intervalKo(dues[0]) + " 뒤.") : null);
      return;
    }
    const id = queue[0]; const c = C.cards[id]; const shown = Date.now();
    const back = h("div", { class: "back", hidden: true },
      h("p", { class: "ko" }, c.ko || ""),
      c.example_de ? h("p", { class: "ex", lang: "de" }, c.example_de) : null,
      c.example_ko ? h("p", { class: "muted" }, c.example_ko) : null,
      c.example_de && hasSpeech() ? btn("예문 듣기", () => speak(c.example_de, voiceOpts()), "btn") : null,
      h("div", { class: "rates" }, RATINGS.map(({ r, ko }) => {
        const due = preview(reviews[id])[r];
        return h("button", { class: "btn big rate", type: "button", "data-rating": String(r), onclick: () => grade(id, r, shown) },
          ko, h("small", null, intervalKo(due)));
      })));
    const flip = btn("뒤집기", () => { back.hidden = false; flip.hidden = true; }, "btn big primary");
    flip.id = "flip";
    area.append(
      h("p", { class: "meta" }, "남은 카드 ", h("b", null, String(queue.length))),
      h("div", { class: "face card" },
        h("p", { class: "de", lang: "de" }, c.de),
        c.plural ? h("p", { class: "pl muted", lang: "de" }, "복수 · " + c.plural) : null),
      flip, back);
  }

  function grade(id, r, shown) {
    const now = new Date(); const before = reviews[id] ? reviews[id].state : 0;
    const { card } = rate(reviews[id], r, now);
    reviews[id] = card;
    S().reviewLogs.push({ user: u, cardId: id, rating: r, reviewedAt: now.toISOString(), durationMs: Date.now() - shown, stateBefore: before });
    if (r === 1) session && session.errors.push({ task: "card", cardId: id });
    save();
    queue.shift();
    // 「다시」(몇 분 뒤)만 이번 블록 끝에 한 번 더. 나머지는 때가 되면 다음 복습에서.
    if (new Date(card.due) - now < 5 * 60000 && queue.length) queue.push(id);
    next();
  }

  next();
  render(...blockFrame("review", day, area));
}

/* ── 원문 계단 ── */
const ARTS = new Set(["der", "die", "das", "den", "dem", "des", "ein", "eine", "einen", "einem", "einer", "eines", "sich"]);
function wordKey(s) { return String(s).toLowerCase().replace(/[^\p{L}]/gu, ""); }
function findGloss(word, gloss) {
  const w = wordKey(word); if (!w) return null;
  let near = null;
  for (const g of gloss || []) {
    const parts = String(g.de).replace(/\(.*?\)/g, " ").split(/\s+/).map(wordKey).filter((p) => p && !ARTS.has(p));
    for (const p of parts) {
      if (p === w) return g;
      if (!near && p.length >= 4 && w.length >= 4 && (w.startsWith(p) || p.startsWith(w))) near = g;
    }
  }
  return near;
}
function glossText(text, gloss) {
  const line = h("p", { class: "gl", id: "gloss-line" }, h("span", { class: "muted" }, "낱말을 누르면 뜻이 나온다."));
  const p = h("p", { class: "de-text", lang: "de" });
  const re = /[\p{L}\p{M}]+(?:-[\p{L}\p{M}]+)*/gu;
  let last = 0; let m;
  const s = String(text || "");
  while ((m = re.exec(s))) {
    if (m.index > last) p.append(s.slice(last, m.index));
    const word = m[0];
    p.append(h("button", { class: "w", type: "button", onclick: (e) => {
      p.querySelectorAll(".w.on").forEach((x) => x.classList.remove("on"));
      e.currentTarget.classList.add("on");
      const g = findGloss(word, gloss);
      line.replaceChildren(...(g ? [h("b", { lang: "de" }, g.de), " ", g.ko] : [h("b", { lang: "de" }, word), " ", h("span", { class: "muted" }, "풀이 없음")]));
    } }, word));
    last = m.index + word.length;
  }
  if (last < s.length) p.append(s.slice(last));
  return [p, line];
}
const LICENSE_KO = { "public-domain": "퍼블릭 도메인", "cc-by-sa-4.0": "CC BY-SA 4.0", own: "선생 작성" };

function taskView(task, ctx) {
  const box = h("div", { class: "task card", "data-task": task.type });
  const out = h("div", { class: "out" });
  const log = (answer, correct, fb) => {
    addAttempt({ block: "stair", dayId: ctx.dayId, level: ctx.level, task: task.type, prompt: task.prompt_de || task.prompt_ko || "", answer, correct });
    if (correct === false && session) session.errors.push({ task: task.type, wrong: answer, right: task.type === "mc" ? (task.options || [])[task.answer] : task.answer });
    out.replaceChildren(fb);
  };
  if (task.type === "cloze") {
    box.append(h("p", { class: "label" }, "빈칸"), h("p", { class: "q", lang: "de" }, task.prompt_de || ""));
    if (task.options && task.options.length) {
      const opts = h("div", { class: "opts" }, task.options.map((o) => h("button", { class: "opt", type: "button", lang: "de", onclick: () => {
        opts.querySelectorAll("button").forEach((b) => { b.disabled = true; });
        const r = clozeFeedback(task, o); log(o, r.ok, r.fb);
      } }, o)));
      box.append(opts);
    } else {
      const inp = h("input", { type: "text", lang: "de", autocapitalize: "off", autocomplete: "off", spellcheck: "false", "aria-label": "빈칸 답" });
      const ok = btn("확인", () => { if (!norm(inp.value)) return; const r = clozeFeedback(task, inp.value); log(norm(inp.value), r.ok, r.fb); }, "btn");
      inp.addEventListener("keydown", (e) => { if (e.key === "Enter") ok.click(); });
      box.append(h("div", { class: "row" }, inp, ok));
    }
  } else if (task.type === "mc") {
    box.append(h("p", { class: "label" }, "고르기"), h("p", { class: "q" }, task.prompt_ko || task.prompt_de || ""));
    const opts = h("div", { class: "opts" }, (task.options || []).map((o, i) => h("button", { class: "opt", type: "button", onclick: () => {
      opts.querySelectorAll("button").forEach((b) => { b.disabled = true; });
      const want = (task.options || [])[task.answer];
      const ok = i === task.answer;
      log(o, ok, ok ? feedback({ right: "「" + o + "」.", sentence: want, sentenceLabel: "바른 답", de: false })
        : feedback({ fix: "「" + o + "」이 아니라 「" + want + "」.", sentence: want, sentenceLabel: "바른 답", de: false }));
    } }, o)));
    box.append(opts);
  } else if (task.type === "summary") {
    box.append(h("p", { class: "label" }, "한 줄 요약"), h("p", { class: "q" }, task.prompt_ko || ""));
    const ta = h("textarea", { rows: "2", "aria-label": "요약" });
    const ok = btn("저장", () => {
      if (!norm(ta.value)) return;
      log(norm(ta.value), null, feedback({ right: "적은 요약을 저장했다." }));
    }, "btn");
    box.append(ta, ok);
  } else {
    return null;
  }
  box.append(out);
  return box;
}

function screenStair() {
  const u = user(); const day = currentDay(u);
  const st = day && day.stair ? day.stair : null;
  const layers = st ? st.layers || [] : [];
  const pos = (S().stairLayer[u] = S().stairLayer[u] || {});
  const area = h("div", { class: "stair" });
  const tabs = h("div", { class: "tabs", role: "tablist" });

  function show(i) {
    pos[day.id] = i; save();
    tabs.querySelectorAll("button").forEach((b, j) => b.setAttribute("aria-selected", String(j === i)));
    area.replaceChildren();
    if (i < layers.length) {
      const L = layers[i];
      if (L.swiss) area.append(h("p", { class: "meta" }, "스위스 표기"));
      area.append(...glossText(L.text_de, L.gloss));
      (L.tasks || []).forEach((t) => { const v = taskView(t, { dayId: day.id, level: L.level }); if (v) area.append(v); });
    } else {
      const sm = st.summit || {};
      const allGloss = layers.flatMap((l) => l.gloss || []);
      if (sm.text_de) area.append(...glossText(sm.text_de, allGloss));
      if (sm.note_ko) area.append(h("p", { class: "muted" }, sm.note_ko));
      const url = sm.url || (st.source && st.source.url);
      if (url) area.append(h("p", null, h("a", { href: url, target: "_blank", rel: "noopener" }, "원문 열기")));
      if (!sm.text_de && !sm.note_ko && !url) area.append(h("p", { class: "muted" }, "꼭대기 원문이 아직 없다."));
    }
  }

  if (!st) { render(...blockFrame("stair", day, h("p", { class: "muted" }, "오늘 원문이 없다."))); return; }
  layers.forEach((L, i) => tabs.append(h("button", { type: "button", role: "tab", onclick: () => show(i) }, L.level || "층 " + (i + 1))));
  tabs.append(h("button", { type: "button", role: "tab", onclick: () => show(layers.length) }, "꼭대기"));
  const src = st.source || {};
  const srcLine = h("p", { class: "fn" }, [src.author, src.title, src.year || null].filter(Boolean).join(" · "), src.license ? " · " + (LICENSE_KO[src.license] || src.license) : "");
  render(...blockFrame("stair", day, tabs, area, srcLine));
  show(Math.min(pos[day.id] || 0, layers.length));
}

/* ── 귀 ── */
function voiceOpts(lang) { const p = S().prefs; return { voiceURI: p.voiceURI || null, rate: p.rate || 1, lang: lang || "de-DE" }; }

function screenEar() {
  const u = user(); const day = currentDay(u); const ear = day && day.ear;
  if (!ear) { render(...blockFrame("ear", day, h("p", { class: "muted" }, "오늘 듣기 대본이 없다."))); return; }
  const lang = ear.lang || "de-DE";
  const rates = ear.rates && ear.rates.length ? ear.rates : [0.75, 0.9, 1];
  if (!rates.includes(S().prefs.rate)) S().prefs.rate = rates[0];

  const text = h("p", { class: "de-text", lang: "de", id: "ear-text" }, ear.text_de);
  const hide = btn("글 가리기", () => { text.hidden = !text.hidden; hide.textContent = text.hidden ? "글 보이기" : "글 가리기"; }, "btn");

  const sel = h("select", { "aria-label": "목소리", id: "voice" });
  const noVoice = h("p", { class: "muted small", hidden: true }, "이 기기에 독일어 음성이 없다. 기기 설정에서 독일어 음성을 받으면 들린다.");
  function fillVoices() {
    const vs = deVoices();
    sel.replaceChildren(...vs.map((v) => h("option", { value: v.voiceURI }, v.name + " · " + String(v.lang).replace("_", "-"))));
    const cur = pickVoice(S().prefs.voiceURI, lang);
    if (cur) sel.value = cur.voiceURI;
    sel.hidden = !vs.length; noVoice.hidden = !!vs.length || !hasSpeech();
  }
  sel.addEventListener("change", () => { S().prefs.voiceURI = sel.value; save(); });
  fillVoices(); onVoices(fillVoices);

  const rateRow = h("div", { class: "chips" }, rates.map((r) => {
    const b = h("button", { class: "btn", type: "button", "aria-pressed": String(S().prefs.rate === r), onclick: () => {
      S().prefs.rate = r; save(); rateRow.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    } }, "×" + r);
    return b;
  }));

  const play = btn("듣기", () => speak(ear.text_de, voiceOpts(lang)), "btn big primary");
  const stop = btn("멈춤", () => stopSpeaking(), "btn big");

  // 따라 말하기
  const key = u + ":" + day.id;
  const player = h("audio", { controls: true, hidden: true, id: "my-rec" });
  const recMsg = h("p", { class: "muted small" }, "녹음은 이 기기에만 남는다. 30초까지.");
  let handle = null; let url = null;
  function showBlob(blob) { if (url) URL.revokeObjectURL(url); url = URL.createObjectURL(blob); player.src = url; player.hidden = false; }
  const recBtn = btn("녹음", async () => {
    if (handle) { recBtn.disabled = true; const blob = await handle.stop(); return; }
    try {
      stopSpeaking();
      handle = await startRec();
      recBtn.textContent = "녹음 멈춤"; recMsg.textContent = "녹음 중.";
      handle.done.then(async (blob) => {
        handle = null; recBtn.disabled = false; recBtn.textContent = "다시 녹음";
        if (!blob.size) { recMsg.textContent = "녹음이 비었다."; return; }
        try { await putRec(key, blob); } catch (e) { /* 저장 실패해도 재생은 된다 */ }
        showBlob(blob); recMsg.textContent = "내 녹음. 원문과 번갈아 듣는다.";
        addAttempt({ block: "ear", dayId: day.id, task: "shadow", prompt: ear.text_de, answer: "recorded:" + Math.round(blob.size / 1024) + "KB" });
      });
    } catch (e) {
      handle = null; recMsg.textContent = "마이크를 쓸 수 없다. 브라우저의 마이크 허용을 확인한다.";
    }
  }, "btn big");
  recBtn.id = "rec";
  if (!canRecord()) { recBtn.disabled = true; recMsg.textContent = "이 기기에서는 녹음이 안 된다."; }
  else getRec(key).then((v) => { if (v && v.blob) { showBlob(v.blob); recMsg.textContent = "지난 녹음."; } }).catch(() => {});

  render(...blockFrame("ear", day,
    text, h("div", { class: "row" }, hide),
    h("h3", null, "듣기"),
    h("div", { class: "row" }, sel), noVoice,
    rateRow,
    h("div", { class: "row" }, play, stop),
    h("h3", null, "따라 말하기"),
    h("div", { class: "row" }, recBtn), player, recMsg));
}

/* ── 손 ── */
function screenHand() {
  const u = user(); const day = currentDay(u); const hand = day && day.hand;
  if (!hand) { render(...blockFrame("hand", day, h("p", { class: "muted" }, "오늘 쓰기 지시가 없다."))); return; }
  const ta = h("textarea", { rows: "3", lang: "de", id: "hand-input", "aria-label": "한 문장", spellcheck: "false" });
  const out = h("div", { class: "out", id: "hand-out" });
  const submit = btn("제출", () => {
    const v = norm(ta.value); if (!v) return;
    addAttempt({ block: "hand", dayId: day.id, task: "write", prompt: hand.prompt_ko, situation: hand.situation_ko, answer: v });
    out.replaceChildren(
      h("p", { class: "label" }, "모범 문장"),
      h("p", { class: "model", lang: "de" }, hand.model_de),
      hasSpeech() ? btn("듣기", () => speak(hand.model_de, voiceOpts()), "btn") : null,
      (hand.chunks || []).length ? h("p", { class: "label" }, "덩어리") : null,
      h("div", { class: "chips" }, (hand.chunks || []).map((c) => h("span", { class: "chunk", lang: "de" }, c))),
      h("p", { class: "muted small" }, "적은 문장은 기록에 남았다."));
    submit.textContent = "다시 제출";
  }, "btn big primary");
  submit.id = "hand-submit";
  render(...blockFrame("hand", day,
    h("p", { class: "label" }, "상황"), h("p", null, hand.situation_ko),
    h("p", { class: "label" }, "쓰기"), h("p", null, hand.prompt_ko),
    ta, h("div", { class: "row" }, submit), out));
}

/* ── 진단 ── */
function screenDiag() {
  endSession(false);
  const u = user(); const D = C.diagnostic;
  const back = h("div", { class: "bar" }, btn("오늘로", () => go("today"), "btn"));
  if (!D || !(D.items || []).length) { render(back, h("h1", null, "진단"), h("p", { class: "muted" }, "진단 문항이 아직 없다.")); return; }

  const intro = () => render(back,
    h("p", { class: "meta" }, "약 " + (D.minutes || 10) + "분 · 한 번"),
    h("h1", null, "진단"),
    h("p", { class: "lead" }, "갈래마다 쉬운 것부터 올라간다. 한 수준에서 두 번 틀리면 그 갈래는 거기서 멈춘다. 끝나면 어디서 시작할지 한 줄씩 나온다."),
    h("div", { class: "row" },
      btn("시작", run, "btn big primary"),
      btn("나중에", () => { const p = S().prefs; p.diagSkipped = Object.assign({}, p.diagSkipped, { [u]: true }); save(); go("today"); }, "btn big")));

  function run() {
    const R = createRun(D.items); const t0 = Date.now(); let n = 0;
    const finish = () => {
      const levels = diagResult(R);
      S().diagnostic[u] = { date: ymd(), at: new Date().toISOString(), levels, answers: R.answers, itemCount: D.items.length };
      addLog({ block: "diagnostic", seconds: (Date.now() - t0) / 1000, closed: false, errors: R.answers.filter((a) => a.correct === false) });
      addAttempt({ block: "diagnostic", task: "result", answer: levels });
      showResult(levels);
    };
    const step = () => {
      const it = nextItem(R);
      if (!it) return finish();
      n++;
      const submit = (given) => { diagAnswer(R, it, given); step(); };
      const body = [];
      body.push(h("p", { class: "meta" }, (SKILL_KO[it.skill] || it.skill) + " · " + it.level + " · 문항 " + n));
      if (it.prompt_ko) body.push(h("p", { class: "q" }, it.prompt_ko));
      if (it.text_de) body.push(h("p", { class: "de-text", lang: "de" }, it.text_de));
      if (it.audio_text_de) body.push(h("div", { class: "row" }, btn("듣기", () => speak(it.audio_text_de, voiceOpts()), "btn")));
      if ((it.type === "mc" || it.type === "cloze") && (it.options || []).length) {
        body.push(h("div", { class: "opts", id: "diag-opts" }, it.options.map((o, i) => h("button", { class: "opt", type: "button", lang: it.type === "cloze" ? "de" : null, onclick: () => submit(i) }, o))));
      } else if (it.type === "cloze") {
        const inp = h("input", { type: "text", lang: "de", autocapitalize: "off", autocomplete: "off", spellcheck: "false", "aria-label": "답" });
        body.push(h("div", { class: "row" }, inp, btn("다음", () => submit(inp.value), "btn")));
      } else if (it.type === "free") {
        const ta = h("textarea", { rows: "3", lang: "de", "aria-label": "답" });
        body.push(ta, h("div", { class: "row" }, btn("다음", () => submit(norm(ta.value)), "btn big primary")));
      } else if (it.type === "record") {
        const msg = h("p", { class: "muted small" }, "녹음은 이 기기에만 남는다.");
        let hd = null;
        const rb = btn("녹음", async () => {
          if (hd) { const blob = await hd.stop(); return; }
          try {
            hd = await startRec(); rb.textContent = "녹음 멈춤";
            hd.done.then(async (blob) => { hd = null; try { await putRec("diag:" + u + ":" + it.id, blob); } catch (e) {} submit("recorded"); });
          } catch (e) { msg.textContent = "마이크를 쓸 수 없다."; }
        }, "btn big primary");
        if (!canRecord()) rb.disabled = true;
        body.push(h("div", { class: "row" }, rb, btn("건너뛰기", () => submit(null), "btn big")), msg);
      } else {
        body.push(btn("다음", () => submit(null), "btn big"));
      }
      render(...body, h("div", { class: "closebar" }, btn("여기까지", finish, "btn")));
    };
    step();
  }

  function showResult(levels) {
    render(
      h("p", { class: "meta" }, dateKo()),
      h("h1", null, "여기서 시작"),
      levels.length ? h("dl", { class: "kv lined", id: "diag-result" }, levels.flatMap((x) => [
        h("dt", null, SKILL_KO[x.skill] || x.skill),
        h("dd", null, x.start ? x.start + "부터" : x.note || "")])) : h("p", { class: "muted" }, "답한 문항이 없다."),
      h("p", { class: "muted" }, "이 결과는 기록에 남았다. 진단은 언제든 다시 할 수 있다."),
      h("div", { class: "row" }, btn("오늘로", () => go("today"), "btn big primary")));
  }

  intro();
}

/* ── 길 ── */
const ROUTES = { pick: screenPick, today: screenToday, review: screenReview, stair: screenStair, ear: screenEar, hand: screenHand, diag: screenDiag };
function route_() {
  const name = (location.hash.replace(/^#\/?/, "") || "today").split("?")[0];
  if (!user() || !USERS[user()]) { if (name !== "pick") history.replaceState(null, "", "#/pick"); return screenPick(); }
  setWho();
  (ROUTES[name] || screenToday)();
}
window.addEventListener("hashchange", () => { if (session) endSession(false); route_(); });

/* ── 시작 ── */
async function swReady() {
  if (!("serviceWorker" in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.register("sw.js");
    if (navigator.serviceWorker.controller) return;
    // 첫 방문: 서비스 워커가 이 페이지를 잡을 때까지 잠깐 기다린다(콘텐츠 요청이 워커를 거치게).
    await Promise.race([
      new Promise((res) => navigator.serviceWorker.addEventListener("controllerchange", res, { once: true })),
      new Promise((res) => setTimeout(res, 3000)),
    ]);
    void reg;
  } catch (e) { /* 워커가 없어도 앱은 돈다 */ }
}

async function main() {
  await swReady();
  try { C = await loadContent(); }
  catch (e) { render(h("h1", null, "열 수 없다"), h("p", { class: "muted" }, "콘텐츠를 읽지 못했다. 처음 한 번은 인터넷이 필요하다.")); return; }
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  route_();
}
main();
