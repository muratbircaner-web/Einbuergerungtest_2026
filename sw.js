/* Çevrimdışı çalışma. Strateji: önbellekten hemen ver, arka planda
   güncelle (stale-while-revalidate). Böylece internet yokken açılır,
   varken de bir sonraki açılışta yeni sürüme geçer. */
const CACHE = "ebt-v1";
const DOSYALAR = ["./", "./index.html", "./manifest.webmanifest",
                  "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.allSettled(DOSYALAR.map((d) => c.add(d))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;      // dış kaynaklara karışma

  e.respondWith(
    caches.match(e.request).then((treffer) => {
      const netz = fetch(e.request)
        .then((antwort) => {
          if (antwort && antwort.status === 200) {
            const kopie = antwort.clone();
            caches.open(CACHE).then((c) => c.put(e.request, kopie));
          }
          return antwort;
        })
        .catch(() => treffer);                           // internet yok → önbellek
      return treffer || netz;
    })
  );
});
