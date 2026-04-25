// Service Worker for GymIQ PWA
// Version-based cache busting - increment to force update
const CACHE_VERSION = 'vv2026.04.141';
const CACHE_NAME = `gymiq-cache-${CACHE_VERSION}`;

// Files to cache for offline use (minimal - just shell)
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icons/icon.svg'
];

// Install event - cache static assets
// NOTE: Do NOT call skipWaiting() here! The new SW must wait until the app
// explicitly tells it to activate (via postMessage('skipWaiting')).
// Activating immediately can cause a white screen: the old page has old JS
// loaded, but the new SW deletes old caches, so lazy-loaded chunks fail.
self.addEventListener('install', (event) => {
  console.log('[SW] Installing version:', CACHE_VERSION);

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating version:', CACHE_VERSION);

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name.startsWith('gymiq-cache-') && name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => {
      // Take control of all clients immediately
      return self.clients.claim();
    })
  );
});

// Guard so we only fire one reload per SW session, even if many assets fail.
let staleReloadSent = false;

// Map file extensions to expected Content-Type substring.
// Returns null when we don't have a strong expectation (skip the check).
function getExpectedMimePrefix(pathname) {
  const m = pathname.match(/\.([a-z0-9]+)(?:\?.*)?$/i);
  if (!m) return null;
  switch (m[1].toLowerCase()) {
    case 'js':
    case 'mjs':
      return 'javascript';
    case 'css':
      return 'css';
    case 'json':
      return 'json';
    case 'svg':
      return 'svg';
    case 'woff':
    case 'woff2':
    case 'ttf':
    case 'otf':
      return 'font';
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'webp':
    case 'gif':
    case 'ico':
      return 'image';
    default:
      return null;
  }
}

function isMimeMismatch(response, pathname) {
  if (!response.ok) return false;
  const expected = getExpectedMimePrefix(pathname);
  if (!expected) return false;
  const contentType = (response.headers.get('content-type') || '').toLowerCase();
  if (!contentType) return false;
  return !contentType.includes(expected);
}

function triggerStaleDeployReload(reason) {
  if (staleReloadSent) return Promise.resolve();
  staleReloadSent = true;
  console.warn('[SW] Stale deploy detected:', reason, '— purging caches and reloading clients');
  return caches.keys()
    .then((names) => Promise.all(names.map((n) => caches.delete(n))))
    .then(() => self.clients.matchAll({ type: 'window' }))
    .then((clients) => {
      for (const client of clients) {
        client.postMessage({ type: 'STALE_DEPLOY_RELOAD' });
      }
    });
}

// Fetch event - Network First strategy for HTML, Cache First for assets
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip cross-origin requests (Firebase, Google Fonts, etc.)
  if (url.origin !== location.origin) return;

  // For navigation requests (HTML) - always go to network first
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone and cache the response
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // Fallback to cache if network fails
          return caches.match(request).then((cached) => {
            return cached || caches.match('/');
          });
        })
    );
    return;
  }

  // For JS/CSS assets with hash in filename - cache first (they're immutable)
  if (url.pathname.match(/\.[a-f0-9]{8}\.(js|css)$/)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;

        return fetch(request).then((response) => {
          // Stale-deploy recovery: if the server returns the wrong MIME type
          // for a hashed asset (e.g. HTML via SPA fallback, or text/plain),
          // the file was removed in a newer deploy and the client is stuck
          // with stale HTML referencing obsolete chunks. Force a reload.
          if (isMimeMismatch(response, url.pathname)) {
            event.waitUntil(triggerStaleDeployReload('hashed asset ' + url.pathname + ' has wrong MIME'));
            return response;
          }

          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        });
      })
    );
    return;
  }

  // For other assets - network first with cache fallback
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Same stale-deploy guard for non-hashed assets (e.g. /manifest.json,
        // /icons/*.svg). If MIME doesn't match the extension, don't cache it
        // and trigger a client reload.
        if (isMimeMismatch(response, url.pathname)) {
          event.waitUntil(triggerStaleDeployReload('asset ' + url.pathname + ' has wrong MIME'));
          return response;
        }
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseClone);
        });
        return response;
      })
      .catch(() => caches.match(request))
  );
});

// Listen for messages from the app
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
