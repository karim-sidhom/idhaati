// إذاعتي — LORD RADIO STATION · Service Worker
const CACHE_NAME = 'izaati-v1';
const STATIC_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './icon-192x192.png',
    './icon-512x512.png',
    './apple-touch-icon.png',
    'https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400&family=Tajawal:wght@300;400;500;700;800&family=DM+Mono:wght@400;500&display=swap',
    'https://cdn.jsdelivr.net/npm/toastify-js/src/toastify.min.css',
    'https://cdn.jsdelivr.net/npm/toastify-js'
];

// Installation — mise en cache des assets statiques
self.addEventListener('install', function(e) {
    e.waitUntil(
        caches.open(CACHE_NAME).then(function(cache) {
            return cache.addAll(STATIC_ASSETS);
        }).then(function() {
            return self.skipWaiting();
        })
    );
});

// Activation — suppression des anciens caches
self.addEventListener('activate', function(e) {
    e.waitUntil(
        caches.keys().then(function(keys) {
            return Promise.all(
                keys.filter(function(k) { return k !== CACHE_NAME; })
                    .map(function(k) { return caches.delete(k); })
            );
        }).then(function() {
            return self.clients.claim();
        })
    );
});

// Fetch — cache first pour assets, network first pour MP3
self.addEventListener('fetch', function(e) {
    var url = e.request.url;

    // MP3 depuis GitHub → réseau direct (pas de cache, fichiers trop lourds)
    if (url.includes('raw.githubusercontent.com') || url.endsWith('.mp3')) {
        e.respondWith(fetch(e.request).catch(function() {
            return new Response('', { status: 503 });
        }));
        return;
    }

    // Google Fonts & CDN → réseau puis cache
    if (url.includes('fonts.googleapis.com') || url.includes('cdn.jsdelivr.net')) {
        e.respondWith(
            caches.open(CACHE_NAME).then(function(cache) {
                return fetch(e.request).then(function(response) {
                    cache.put(e.request, response.clone());
                    return response;
                }).catch(function() {
                    return caches.match(e.request);
                });
            })
        );
        return;
    }

    // Tout le reste → cache first, réseau en fallback
    e.respondWith(
        caches.match(e.request).then(function(cached) {
            if (cached) return cached;
            return fetch(e.request).then(function(response) {
                if (response && response.status === 200) {
                    var clone = response.clone();
                    caches.open(CACHE_NAME).then(function(cache) {
                        cache.put(e.request, clone);
                    });
                }
                return response;
            }).catch(function() {
                // Fallback hors ligne → page principale
                return caches.match('./index.html');
            });
        })
    );
});
