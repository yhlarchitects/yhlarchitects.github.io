// Moved to /via/torino/plan/. This worker clears the old offline copy and removes itself.
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('torino-field-')||k.startsWith('turin-editorial-')).map(k=>caches.delete(k)))).then(()=>self.registration.unregister()).then(()=>self.clients.matchAll({type:'window'})).then(list=>list.forEach(c=>c.navigate(c.url).catch(()=>{})))));
