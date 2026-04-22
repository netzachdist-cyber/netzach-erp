// Service Worker para Netzach ERP PWA
const CACHE_NAME = 'netzach-erp-v13.1.0.2';
const urlsToCache = [
  './Netzach_ERP_PWA.html',
  'https://accounts.google.com/gsi/client',
  'https://cdn.jsdelivr.net/npm/jwt-decode@3.1.2/build/jwt-decode.min.js'
];

// Instalação - cacheia arquivos principais
self.addEventListener('install', event => {
  console.log('[SW] Instalando Service Worker...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Cache aberto');
        return cache.addAll(urlsToCache);
      })
      .catch(err => {
        console.log('[SW] Erro ao cachear:', err);
      })
  );
  self.skipWaiting();
});

// Ativação - limpa caches antigos
self.addEventListener('activate', event => {
  console.log('[SW] Service Worker ativado');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deletando cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// Fetch - estratégia Network First, fallback para Cache
self.addEventListener('fetch', event => {
  // Ignorar requisições não-GET
  if (event.request.method !== 'GET') return;
  
  // Ignorar chrome-extension e outras URLs especiais
  if (!event.request.url.startsWith('http')) return;
  
  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Se a resposta é válida, clona e cacheia
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Se falhar (offline), busca no cache
        return caches.match(event.request).then(cachedResponse => {
          if (cachedResponse) {
            console.log('[SW] Servindo do cache:', event.request.url);
            return cachedResponse;
          }
          
          // Se não está no cache e é HTML, retorna página offline
          if (event.request.headers.get('accept').includes('text/html')) {
            return new Response(
              '<html><body style="font-family:sans-serif;text-align:center;padding:50px"><h1>📱 Netzach ERP</h1><p>Você está offline. Alguns recursos podem não funcionar.</p><p><button onclick="location.reload()">Tentar Novamente</button></p></body></html>',
              { headers: { 'Content-Type': 'text/html' } }
            );
          }
        });
      })
  );
});

// Mensagens do cliente
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
