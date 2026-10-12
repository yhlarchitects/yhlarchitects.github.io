// 진단: 갈래(skill)마다 쉬운 수준부터 올라간다. 한 수준에서 두 번 틀리면 그 갈래는 멈춘다.
// free·record 문항은 채점하지 않고 기록만 한다.

export const LEVELS = ["A1", "A2", "B1", "B2", "C1"];
export const SKILL_KO = {
  wortschatz: "낱말",
  grammatik: "문법",
  lesen: "읽기",
  hoeren: "듣기",
  schreiben: "쓰기",
  sprechen: "말하기",
};

const lv = (l) => { const i = LEVELS.indexOf(l); return i < 0 ? 0 : i; };

export function isScored(item) { return item.type === "mc" || item.type === "cloze"; }

export function checkAnswer(item, given) {
  // given: 고른 선택지 번호(숫자) 또는 입력한 글자
  if (!isScored(item)) return null;
  const opts = item.options || [];
  if (typeof given === "number") {
    if (typeof item.answer === "number") return given === item.answer;
    return norm(opts[given]) === norm(item.answer);
  }
  const want = typeof item.answer === "number" ? opts[item.answer] : item.answer;
  return norm(given) === norm(want);
}

function norm(s) { return String(s == null ? "" : s).trim().replace(/\s+/g, " ").toLowerCase(); }

export function createRun(items) {
  const skills = [];
  for (const it of items) if (!skills.includes(it.skill)) skills.push(it.skill);
  const bySkill = {};
  for (const s of skills) {
    bySkill[s] = items.map((it, i) => ({ it, i })).filter((x) => x.it.skill === s)
      .sort((a, b) => lv(a.it.level) - lv(b.it.level) || a.i - b.i).map((x) => x.it);
  }
  return { skills, bySkill, pos: {}, misses: {}, stopped: {}, answers: [] };
}

export function nextItem(run) {
  for (const s of run.skills) {
    if (run.stopped[s]) continue;
    const p = run.pos[s] || 0;
    if (p < run.bySkill[s].length) return run.bySkill[s][p];
  }
  return null;
}

export function answer(run, item, given) {
  const correct = checkAnswer(item, given);
  run.answers.push({ id: item.id, skill: item.skill, level: item.level, type: item.type, given, correct });
  run.pos[item.skill] = (run.pos[item.skill] || 0) + 1;
  if (correct === false) {
    const m = (run.misses[item.skill] = run.misses[item.skill] || {});
    m[item.level] = (m[item.level] || 0) + 1;
    if (m[item.level] >= 2) run.stopped[item.skill] = true;
  }
  return correct;
}

// 갈래별 「여기서 시작」 수준
export function result(run) {
  const out = [];
  for (const s of run.skills) {
    const mine = run.answers.filter((a) => a.skill === s);
    if (!mine.length) continue;
    const scored = mine.filter((a) => a.correct !== null);
    if (!scored.length) { out.push({ skill: s, start: null, note: "적은 것을 저장했다" }); continue; }
    const per = {};
    for (const a of scored) { const k = a.level; per[k] = per[k] || { c: 0, m: 0 }; a.correct ? per[k].c++ : per[k].m++; }
    const tested = Object.keys(per).sort((a, b) => lv(a) - lv(b));
    let start = null;
    for (const l of tested) { const x = per[l]; if (x.m >= 2 || (x.m > 0 && x.m >= x.c)) { start = l; break; } }
    if (!start) { const top = lv(tested[tested.length - 1]); start = LEVELS[Math.min(top + 1, LEVELS.length - 1)]; }
    out.push({ skill: s, start });
  }
  return out;
}
