const CACHE_NAME = "alc-v4";

// Fichiers essentiels à pré-cacher pour le mode offline
const PRECACHE_URLS = [
    './index.html',
    './style.css',
    './js/utils.js',
    './js/config.js',
    './js/menu.js'
];

self.addEventListener('install', (e) => {
    self.skipWaiting(); // Prend le contrôle immédiatement
    e.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS))
    );
});

self.addEventListener('activate', (e) => {
    // Supprime TOUS les vieux caches au démarrage
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (e) => {
    if (e.request.method !== 'GET') return;

    // STRATÉGIE NETWORK-FIRST :
    // 1. On essaie toujours d'aller chercher la dernière version sur internet
    // 2. Si internet échoue (hors-ligne), on sert la version en cache
    // Cela garantit que tous les appareils reçoivent les mises à jour immédiatement
    e.respondWith(
        fetch(e.request)
            .then(networkResponse => {
                // Mise à jour du cache avec la version fraîche du serveur
                if (networkResponse && networkResponse.status === 200 && networkResponse.type !== 'opaque') {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(e.request, responseToCache));
                }
                return networkResponse;
            })
            .catch(() => {
                // Pas de connexion -> on sert le cache
                return caches.match(e.request).then(cached => {
                    if (cached) return cached;
                    // Fallback ultime sur index.html pour la navigation
                    if (e.request.mode === 'navigate') return caches.match('./index.html');
                });
            })
    );
});
