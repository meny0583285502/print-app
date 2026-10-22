// Service worker: מקבל קבצים מתפריט "שיתוף" ומאפשר התקנה כאפליקציה
const SHELL = "pm-shell-v1";

self.addEventListener("install", e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(["./", "index.html", "manifest.webmanifest", "icon-192.png"])));
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(k => k.startsWith("pm-shell-") && k !== SHELL).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);

  // קובץ ששותף מאפליקציה אחרת
  if (e.request.method === "POST" && url.pathname.endsWith("/share")) {
    e.respondWith((async () => {
      try {
        const form = await e.request.formData();
        const file = form.get("file");
        if (file && file.size) {
          const cache = await caches.open("pm-share");
          await cache.put("shared-file", new Response(file, {
            headers: { "Content-Type": file.type || "application/octet-stream",
                       "X-Name": encodeURIComponent(file.name || "file") }
          }));
        }
      } catch (err) {}
      return Response.redirect("./?share=1", 303);
    })());
    return;
  }

  // דפי האפליקציה: קודם רשת (כדי לקבל עדכונים), ואם אין - מהמטמון
  if (e.request.method === "GET" && url.origin === location.origin) {
    e.respondWith(fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(SHELL).then(c => c.put(e.request, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match(e.request).then(r => r || caches.match("./"))));
  }
});
