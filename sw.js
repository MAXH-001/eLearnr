// eLearnr Service Worker
// Caches core files for offline use

const CACHE_NAME = 'eLearnr-v1';

const CORE_FILES = [
  '/',
  '/index.html',
  '/practice.html',
  '/notes.html',
  '/leaderboard.html',
  '/challenges.html',
  '/moreapps.html',
  '/history.html',
  '/profile.html',
  '/notification.html',
  '/videos.html',
  '/quiz.html',
  '/logo.png',
  '/QDB/index.json',
  '/Notes/index.json',
  '/Videos/index.json',
  '/more_apps/index.json',
];

// ── INSTALL: Cache core files ─────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(CORE_FILES.map(url => new Request(url, { cache: 'reload' })));
    }).catch(err => {
      console.log('[SW] Install error:', err);
    })
  );
  self.skipWaiting();
});

// ── ACTIVATE: Clean old caches ────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ── FETCH: Network first, fallback to cache ───────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip Google Apps Script API calls — always need network
  if (url.hostname === 'script.google.com') return;

  // Skip YouTube — always need network for thumbnails and embeds
  if (url.hostname.includes('youtube') || url.hostname.includes('ytimg')) return;

  // Skip Google Fonts
  if (url.hostname.includes('fonts.googleapis') || url.hostname.includes('fonts.gstatic')) return;

  // For HTML pages — Network first, fallback to cache
  if (event.request.destination === 'document' || url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Cache fresh copy
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // For QDB JSON files — Network first, fallback to cache
  if (url.pathname.includes('/QDB/') || url.pathname.includes('/Notes/') || url.pathname.includes('/Videos/') || url.pathname.includes('/more_apps/')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // For everything else — Cache first, fallback to network
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      });
    })
  );
});
