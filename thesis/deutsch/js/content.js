// 콘텐츠 읽기. content/manifest.json 이 있으면 그것을, 없으면 content/sample/ 을 쓴다.
// 서비스 워커는 manifest.json 이 없을 때 404 대신 null 을 돌려준다(콘솔을 깨끗하게).

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
  let diagnostic = null;
  if (man.diagnostic) { try { diagnostic = await getJSON(base + man.diagnostic); } catch (e) { diagnostic = null; } }

  const cards = {};
  for (const deck of decks) for (const c of deck.cards || []) if (c && c.id) cards[c.id] = Object.assign({ deck: deck.deck }, c);

  return { base, sample: base.indexOf("sample") >= 0, manifest: man, days, decks, cards, diagnostic };
}
