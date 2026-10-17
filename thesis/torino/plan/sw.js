const CACHE="turin-editorial-4a4ecba9e167";
const BASE=self.registration.scope;
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll([BASE])).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>(k.startsWith('torino-field-')||k.startsWith('turin-editorial-'))&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||!e.request.url.startsWith(BASE))return;
if(e.request.mode==='navigate'){e.respondWith(fetch(e.request).then(r=>{if(r.ok){const copy=r.clone();e.waitUntil(caches.open(CACHE).then(c=>c.put(BASE,copy)))}return r}).catch(()=>caches.match(BASE)));return;}
if(new URL(e.request.url).pathname.includes('/images/'))e.respondWith(caches.match(e.request).then(saved=>saved||fetch(e.request).then(r=>{if(r.ok){const copy=r.clone();e.waitUntil(caches.open(CACHE).then(c=>c.put(e.request,copy)))}return r})));
});
