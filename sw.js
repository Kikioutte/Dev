const CACHE_NAME = 'apprendre-le-code-v3';

// Ressources à mettre en cache dès l'installation
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json'
];

// ── Installation : précache les assets essentiels ─────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

// ── Activation : supprime les anciens caches ───────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch : Cache-first, fallback réseau, fallback HTML ────────────────────────
self.addEventListener('fetch', event => {
  // Ignorer les requêtes non-GET et les requêtes vers d'autres origines
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin && url.protocol !== 'file:') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      // Réponse en cache → on la retourne immédiatement (hors-ligne ✓)
      if (cached) return cached;

      // Pas en cache → tentative réseau + mise en cache de la réponse
      return fetch(event.request)
        .then(response => {
          if (
            response &&
            response.status === 200 &&
            response.type !== 'opaque'
          ) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => {
          // Hors-ligne et pas en cache → on sert l'app shell HTML
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
        });
    })
  );
});
