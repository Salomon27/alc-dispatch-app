importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");

const CACHE_NAME = "alc-v1";

self.addEventListener('install', (e) => {
    self.skipWaiting();
    e.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll([
                './',
                './index.html',
                './style.css',
                './js/utils.js',
                './js/config.js'
            ]);
        })
    );
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            self.clients.claim();
        })
    );
});

self.addEventListener('fetch', (e) => {
    // Only cache GET requests originating from our domain or trusted CDNs
    if (e.request.method !== 'GET') return;
    
    // Bypass OneSignal internal API calls to prevent caching push issues
    if (e.request.url.includes('onesignal.com')) return;

    e.respondWith(
        caches.match(e.request).then(res => {
            return res || fetch(e.request).then(fetchRes => {
                return caches.open(CACHE_NAME).then(cache => {
                    // Only cache valid HTTP responses
                    if (fetchRes.status === 200) {
                        cache.put(e.request, fetchRes.clone());
                    }
                    return fetchRes;
                });
            });
        }).catch(err => {
            // Fallback for offline mode if something fails
            console.warn('Erreur réseau / Mode hors-ligne', err);
        })
    );
});
