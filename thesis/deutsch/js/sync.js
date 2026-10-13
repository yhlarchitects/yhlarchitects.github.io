// 기기 사이 동기화: 기록을 이 기기에서 암호화해 yhl-sync(Cloudflare)에 둔다. 서버는 내용을 못 읽는다.
// 코드(20자)는 기기에만 있다. 같은 코드를 넣은 기기끼리 기록이 합쳐진다. 녹음 파일은 옮기지 않는다.
// 한 코드에 연호·정현 두 사람 기록이 함께 담긴다(합치는 규칙은 store.js mergeState). english-2629 sync.js 와 같은 설계.
const URL_ = (localStorage.getItem("sync:url") || "https://yhl-sync.yhl-sync.workers.dev") + "/v1/"; // sync:url 은 시험용
const ABC = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"; // 헷갈리는 0 · 1 · I · L · O 는 뺀다
const enc = new TextEncoder();

let cfg = null;      // { app, get(): 내보낼 기록, merge(기록), changed() }
let keys = null;     // { id, key, code }
let timer = null; let busy = null; let merging = false;

const LS = () => "sync:" + cfg.app;
export function normalize(s) { return String(s || "").toUpperCase().replace(/[^0-9A-Z]/g, ""); }
export function pretty(c) { return normalize(c).match(/.{1,4}/g)?.join("-") || ""; }
export function newCode() {
  let out = "";
  while (out.length < 20) for (const b of crypto.getRandomValues(new Uint8Array(32))) if (b < 248 && out.length < 20) out += ABC[b % 31];
  return out;
}

function hex(buf) { return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join(""); }
function b64(u8) { let s = ""; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode(...u8.subarray(i, i + 0x8000)); return btoa(s); }
function unb64(s) { return Uint8Array.from(atob(s), (c) => c.charCodeAt(0)); }
async function pipe(u8, stream) { return new Uint8Array(await new Response(new Blob([u8]).stream().pipeThrough(stream)).arrayBuffer()); }

async function derive(code) {
  const c = normalize(code);
  const id = hex(await crypto.subtle.digest("SHA-256", enc.encode("yhl-sync/id/" + cfg.app + "/" + c)));
  const base = await crypto.subtle.importKey("raw", enc.encode(c), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey({ name: "PBKDF2", salt: enc.encode("yhl-sync/key/" + cfg.app), iterations: 200000, hash: "SHA-256" },
    base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
  return { id, key, code: c };
}

async function seal(obj) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const z = await pipe(enc.encode(JSON.stringify(obj)), new CompressionStream("gzip"));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, keys.key, z));
  const out = new Uint8Array(12 + ct.length); out.set(iv); out.set(ct, 12);
  return b64(out);
}
async function open(s) {
  const u = unb64(s);
  const z = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: u.subarray(0, 12) }, keys.key, u.subarray(12)));
  return JSON.parse(new TextDecoder().decode(await pipe(z, new DecompressionStream("gzip"))));
}

function setStatus(o) { const st = Object.assign(status(), o); localStorage.setItem(LS() + ":st", JSON.stringify(st)); return st; }
export function status() { try { return JSON.parse(localStorage.getItem(LS() + ":st")) || {}; } catch (e) { return {}; } }
export function code() { return keys ? keys.code : null; }

export async function setup(c) {
  cfg = c;
  const saved = localStorage.getItem(LS());
  if (saved) keys = await derive(saved);
  // 앱을 다시 볼 때 · 인터넷이 돌아올 때 맞춘다(코드가 있을 때만).
  document.addEventListener("visibilitychange", () => { if (keys && document.visibilityState === "visible") syncNow().catch(() => {}); });
  window.addEventListener("online", () => { if (keys) syncNow().catch(() => {}); });
  if (keys) syncNow().catch(() => {});
}

// 기록이 바뀔 때마다 부른다. 5초 모아서 한 번 보낸다.
export function schedule() {
  if (!keys || merging) return;
  clearTimeout(timer);
  timer = setTimeout(() => syncNow().catch(() => {}), 5000);
}

export function syncNow() {
  if (!keys) return Promise.resolve({ ok: false, reason: "off" });
  if (busy) return busy;
  busy = (async () => {
    let changed = false;
    for (let i = 0; i < 4; i++) {
      const cur = await (await fetch(URL_ + keys.id, { cache: "no-store" })).json();
      if (cur.data) {
        const before = JSON.stringify(cfg.get().state);
        merging = true;
        try { cfg.merge(await open(cur.data)); } finally { merging = false; }
        if (JSON.stringify(cfg.get().state) !== before) changed = true;
      }
      const r = await fetch(URL_ + keys.id, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ver: cur.ver, data: await seal(cfg.get()) }) });
      if (r.status === 409) continue;
      if (!r.ok) throw new Error("서버 " + r.status);
      setStatus({ at: new Date().toISOString(), err: null });
      if (changed && cfg.changed) cfg.changed();
      return { ok: true, changed };
    }
    throw new Error("다른 기기와 겹쳐 보내지 못했다");
  })().catch((e) => { setStatus({ err: e.message || String(e) }); throw e; }).finally(() => { busy = null; });
  return busy;
}

// 첫 기기: 새 코드를 만들어 지금 기록을 올린다.
export async function start() {
  keys = await derive(newCode());
  localStorage.setItem(LS(), keys.code);
  await syncNow();
  return keys.code;
}

// 다른 기기: 받은 코드로 들어간다. 그 코드의 기록이 서버에 없으면 오타로 보고 멈춘다.
export async function join(input) {
  const c = normalize(input);
  if (c.length !== 20) throw new Error("코드는 20자다.");
  const k = await derive(c);
  const cur = await (await fetch(URL_ + k.id, { cache: "no-store" })).json();
  if (!cur.data) throw new Error("이 코드의 기록이 없다. 글자를 다시 본다.");
  keys = k;
  try { await open(cur.data); } catch (e) { keys = null; throw new Error("코드가 맞지 않다."); }
  localStorage.setItem(LS(), c);
  return syncNow();
}

export function leave() { keys = null; clearTimeout(timer); localStorage.removeItem(LS()); localStorage.removeItem(LS() + ":st"); }
