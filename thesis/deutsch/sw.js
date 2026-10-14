// 서비스 워커: 앱 셸은 미리 받아 두고(보이면서 뒤에서 갱신), 콘텐츠는 네트워크 먼저·안 되면 저장본.
// 앱 파일을 고치면 VERSION 을 올린다.
const VERSION = "2026-10-14-2";
const SHELL = "shell-" + VERSION;
const CONTENT = "content-v1";
const SHELL_FILES = [
  "./",
  "index.html",
  "v1.html",
  "manifest.webmanifest",
  "fonts/pretendard-variable.woff2",
  "css/forma-web.css",
  "css/app.css",
  "js/theme.js",
  "js/app.js",
  "js/store.js",
  "js/content.js",
  "js/srs.js",
  "js/speech.js",
  "js/rec.js",
  "js/diag.js",
  "js/sync.js",
  "vendor/ts-fsrs.js",
  "icons/icon.svg",
  "icons/icon-180.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(SHELL_FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("shell-") && k !== SHELL).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const scopePath = new URL(self.registration.scope).pathname;
const isManifestProbe = (path) => path === scopePath + "content/manifest.json";

async function contentFirstNetwork(req, path) {
  const cache = await caches.open(CONTENT);
  try {
    const res = await fetch(req);
    if (res.ok) { cache.put(req, res.clone()); return res; }
    if (res.status === 404 && isManifestProbe(path)) {
      // 실제 콘텐츠 목록이 아직 없다: 오류 대신 null 을 주면 앱이 예시 콘텐츠로 간다.
      return new Response("null", { headers: { "content-type": "application/json" } });
    }
    return res;
  } catch (err) {
    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit) return hit;
    if (isManifestProbe(path)) return new Response("null", { headers: { "content-type": "application/json" } });
    return Response.error();
  }
}

async function shellStaleWhileRevalidate(req) {
  const cache = await caches.open(SHELL);
  const key = req.mode === "navigate" ? "index.html" : req;
  const hit = await cache.match(key, { ignoreSearch: true });
  const net = fetch(req).then((res) => {
    if (res.ok && req.mode !== "navigate") cache.put(req, res.clone());
    if (res.ok && req.mode === "navigate") cache.put("index.html", res.clone());
    return res;
  }).catch(() => null);
  if (hit) { net.catch(() => {}); return hit; }
  const res = await net;
  return res || Response.error();
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const path = url.pathname;
  if (path.startsWith(scopePath + "content/")) { e.respondWith(contentFirstNetwork(req, path)); return; }
  e.respondWith(shellStaleWhileRevalidate(req));
});
