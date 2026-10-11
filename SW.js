const CACHE = "moyenne-v1";
const FICHIERS = [
  "./", "./index.html", "./style.css", "./script.js",
  "./manifest.json", "./icon-192.png", "./icon-512.png"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FICHIERS)));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(noms =>
      Promise.all(noms.filter(n => n !== CACHE).map(n => caches.delete(n)))
    )
  );
});

self.addEventListener("fetch", e => {
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});
