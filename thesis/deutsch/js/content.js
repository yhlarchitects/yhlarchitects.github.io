// 콘텐츠 읽기. content/manifest.json 이 있으면 그것을, 없으면 content/sample/ 을 쓴다.
// 서비스 워커는 manifest.json 이 없을 때 404 대신 null 을 돌려준다(콘솔을 깨끗하게).
// 사람별 변형(variants.<user>)은 forUser 가 기본 판 위에 덮는다. 카드 id·new_cards 는 공통이다.

async function getJSON(url) {
  const r = await fetch(url, { cache: "no-cache" });
  if (!r.ok) throw new Error(url + " " + r.status);
  return r.json();
}

function settledValues(results) {
  return results.filter((r) => r.status === "fulfilled" && r.value).map((r) => r.value);
}

export async function loadContent() {
  let base = "content/";
  let man = null;
  try { man = await getJSON(base + "manifest.json"); } catch (e) { man = null; }
  if (!man || !Array.isArray(man.days)) {
    base = "content/sample/";
    man = await getJSON(base + "manifest.json");
  }
  const days = settledValues(await Promise.allSettled((man.days || []).map((d) => getJSON(base + "days/" + d + ".json"))));
  const decks = settledValues(await Promise.allSettled((man.decks || []).map((d) => getJSON(base + "cards/" + d + ".json"))));
  // 주간 챕터: manifest.weeks 가 없거나 파일이 없으면 조용히 건너뛴다.
  const weeks = Array.isArray(man.weeks)
    ? settledValues(await Promise.allSettled(man.weeks.map((w) => getJSON(base + "weeks/" + w + ".json"))))
      .filter((w) => w && Array.isArray(w.days) && w.days.length)
    : [];
  let diagnostic = null;
  if (man.diagnostic) { try { diagnostic = await getJSON(base + man.diagnostic); } catch (e) { diagnostic = null; } }

  const cards = {};
  for (const deck of decks) for (const c of deck.cards || []) if (c && c.id) cards[c.id] = Object.assign({ deck: deck.deck }, c);

  return { base, sample: base.indexOf("sample") >= 0, manifest: man, baseDays: days, days, baseWeeks: weeks, weeks, decks, cards, diagnostic, viewUser: null };
}

const SHARED = new Set(["id", "new_cards", "variants", "days"]); // 사람마다 다르지 않은 키

// 계단은 층 단위로 덮는다(층 dict 끼리 합침, source·summit 은 변형에 없으면 물려받음).
function mergeStair(base, v) {
  if (!base) return v;
  const out = Object.assign({}, base);
  for (const k of Object.keys(v)) if (k !== "layers") out[k] = v[k];
  if (Array.isArray(v.layers)) {
    const bl = base.layers || [];
    const n = Math.max(bl.length, v.layers.length);
    const layers = [];
    for (let i = 0; i < n; i++) {
      const a = bl[i]; const b = v.layers[i];
      layers.push(b ? Object.assign({}, a || {}, b) : a);
    }
    out.layers = layers;
  }
  return out;
}

// day 또는 week 하나에 그 사람의 변형을 덮는다. 변형이 없으면 원본 그대로 돌려준다.
export function applyVariant(item, user) {
  const v = item && item.variants && user ? item.variants[user] : null;
  if (!v || typeof v !== "object") return item;
  const out = Object.assign({}, item);
  for (const k of Object.keys(v)) {
    if (SHARED.has(k)) continue;
    if (k === "stair") out.stair = mergeStair(item.stair, v.stair);
    else if (k === "review" && item.review && v.review) out.review = Object.assign({}, item.review, v.review); // 주간: tasks·write 따로
    else out[k] = v[k]; // ear · hand · theme_ko · focus_ko · illustration · phrases · mix … 통째 교체
  }
  return out;
}

// 지금 사람에 맞춰 C.days · C.weeks 를 다시 깐다. 사람이 그대로면 아무것도 안 한다.
export function forUser(C, user) {
  if (!C || C.viewUser === user) return C;
  C.days = C.baseDays.map((d) => applyVariant(d, user));
  C.weeks = C.baseWeeks.map((w) => applyVariant(w, user));
  C.viewUser = user;
  return C;
}
