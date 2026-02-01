const CACHE_NAME = 'vizzu-v11';
const OFFLINE_URL = '/';

const STATIC_ASSETS = [
  '/logo.png',
  '/favicon.png',
  '/manifest.json',
  '/banner-product-studio.webp',
  '/banner-provador.webp',
  '/banner-look-composer.webp',
  '/banner-still-criativo.webp'
];

// Tempo máximo de cache para imagens do Supabase Storage (24h)
const SUPABASE_CACHE_MAX_AGE = 24 * 60 * 60 * 1000;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        STATIC_ASSETS.map(url =>
          fetch(url)
            .then(response => {
              if (response.ok) {
                return cache.put(url, response);
              }
            })
            .catch(() => {})
        )
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // Imagens do Supabase Storage — stale-while-revalidate
  // Serve do cache imediatamente, mas atualiza em background
  if (event.request.url.includes('supabase') && (event.request.url.includes('/storage/v1/object/') || event.request.url.includes('/storage/v1/render/image/'))) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          const fetchPromise = fetch(event.request).then((networkResponse) => {
            if (networkResponse.ok) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => cachedResponse);

          // Retorna cache se disponível, senão espera a rede
          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // Ignorar outras APIs externas (auth, database, etc)
  if (
    event.request.url.includes('supabase') ||
    event.request.url.includes('googleapis') ||
    event.request.url.includes('generativelanguage')
  ) {
    return;
  }

  const url = new URL(event.request.url);

  // HTML, CSS, JS — network-first
  if (
    event.request.mode === 'navigate' ||
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.js') ||
    url.pathname === '/'
  ) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request).then((cached) => {
            return cached || caches.match(OFFLINE_URL);
          });
        })
    );
    return;
  }

  // Outros assets (imagens locais, fontes) — cache-first
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request)
        .then((response) => {
          if (response.ok && event.request.url.startsWith(self.location.origin)) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          if (event.request.mode === 'navigate') {
            return caches.match(OFFLINE_URL);
          }
        });
    })
  );
});
