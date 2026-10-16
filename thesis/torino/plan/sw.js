const CACHE="torino-field-0a6aa7a6440d";
const BASE=self.registration.scope;
self.addEventListener("install",event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll([BASE,BASE+"index.html"])).then(()=>self.skipWaiting())));
self.addEventListener("activate",event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith("torino-field-")&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",event=>{
 if(event.request.method!=="GET"||event.request.mode!=="navigate"||!event.request.url.startsWith(BASE))return;
 event.respondWith(fetch(event.request).then(response=>{
  if(response.ok){const copy=response.clone();event.waitUntil(caches.open(CACHE).then(c=>c.put(BASE,copy)))}
  return response;
 }).catch(()=>caches.match(BASE).then(r=>r||caches.match(BASE+"index.html"))));
});
