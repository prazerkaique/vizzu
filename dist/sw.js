const CACHE_NAME = 'vizzu-v8';
const OFFLINE_URL = '/';

const STATIC_ASSETS = [
  '/logo.png',
  '/favicon.png',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Cachear cada arquivo individualmente, ignorando erros
      return Promise.allSettled(
        STATIC_ASSETS.map(url =>
          fetch(url)
            .then(response => {
              if (response.ok) {
                return cache.put(url, response);
              }
            })
            .catch(() => {
              // Ignorar erros silenciosamente
            })
        )
      );
    })
  );
  // Força ativação imediata
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
  // Assume controle de todas as páginas imediatamente
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // CACHEAR imagens do Supabase Storage (economiza egress!)
  if (event.request.url.includes('supabase') && event.request.url.includes('/storage/v1/object/')) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse; // Retorna do cache local (0 egress)
        }
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
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

  // Para HTML, CSS e JS - SEMPRE buscar da rede primeiro (network-first)
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
          // Atualiza o cache com a nova versão
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Se offline, usa o cache
          return caches.match(event.request).then((cached) => {
            return cached || caches.match(OFFLINE_URL);
          });
        })
    );
    return;
  }

  // Para outros assets (imagens, fontes) - cache-first
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
          // Fallback para navegação
          if (event.request.mode === 'navigate') {
            return caches.match(OFFLINE_URL);
          }
        });
    })
  );
});
