const CACHE="sicily-plan-20261125";
const BASE=self.registration.scope;
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll([BASE])).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('sicily-plan-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;
const url=e.request.url;
if(e.request.mode==='navigate'&&url.startsWith(BASE)){e.respondWith(fetch(e.request,{cache:'no-cache'}).then(r=>{if(r.ok){const copy=r.clone();e.waitUntil(caches.open(CACHE).then(c=>c.put(BASE,copy)))}return r}).catch(()=>caches.match(BASE)));return;}
if(url.includes('unpkg.com/leaflet')||url.includes('wikimedia.org/wikipedia/commons'))e.respondWith(caches.match(e.request).then(saved=>saved||fetch(e.request).then(r=>{if(r.ok||r.type==='opaque'){const copy=r.clone();e.waitUntil(caches.open(CACHE).then(c=>c.put(e.request,copy)))}return r})));
});
