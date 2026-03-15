// ── SCAN&GO PRO · Service Worker ──────────────────────────────
// Versión de caché — incrementar para forzar actualización
const CACHE_VERSION = 'scango-v2';

// Archivos esenciales para funcionamiento offline
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
];

// Fuentes externas a cachear
const FONT_ASSETS = [
  'https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=DM+Sans:wght@400;500;700&display=swap',
];

// ── INSTALL: pre-cachear assets core ──────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => {
      // Cachear assets core (sin fallar si alguno falla)
      return Promise.allSettled(
        CORE_ASSETS.map(url =>
          cache.add(url).catch(err => console.warn('Cache miss:', url, err))
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// ── ACTIVATE: limpiar cachés antiguas ─────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter(key => key !== CACHE_VERSION)
          .map(key => {
            console.log('[SW] Eliminando caché antigua:', key);
            return caches.delete(key);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// ── FETCH: estrategia Network-first con fallback a caché ───────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Solo manejar GET
  if (request.method !== 'GET') return;

  // Fuentes de Google: Cache-first (cambian poco)
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Assets propios: Network-first con fallback offline
  if (url.origin === self.location.origin) {
    event.respondWith(networkFirstWithCache(request));
    return;
  }

  // Resto: intentar red, sin cachear
  event.respondWith(
    fetch(request).catch(() => {
      return new Response('Offline', { status: 503, statusText: 'Offline' });
    })
  );
});

// ── Estrategia: Network-first ──────────────────────────────────
async function networkFirstWithCache(request) {
  const cache = await caches.open(CACHE_VERSION);
  try {
    const networkResponse = await fetch(request);
    // Solo cachear respuestas válidas
    if (networkResponse && networkResponse.status === 200) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (err) {
    // Sin red → servir desde caché
    const cached = await cache.match(request);
    if (cached) return cached;
    // Si es navegación, devolver index.html
    if (request.mode === 'navigate') {
      const indexCache = await cache.match('./index.html');
      if (indexCache) return indexCache;
    }
    return new Response(offlinePage(), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
}

// ── Estrategia: Cache-first ────────────────────────────────────
async function cacheFirst(request) {
  const cache = await caches.open(CACHE_VERSION);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const networkResponse = await fetch(request);
    if (networkResponse && networkResponse.status === 200) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (err) {
    return new Response('', { status: 503 });
  }
}

// ── Página offline de emergencia ──────────────────────────────
function offlinePage() {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
  <title>Scan&Go · Sin conexión</title>
  <style>
    body { background:#0a0a0a; color:#e5e5e5; font-family:monospace;
           display:flex; flex-direction:column; align-items:center;
           justify-content:center; height:100vh; gap:16px; margin:0; }
    h1 { font-size:20px; color:#f59e0b; }
    p { font-size:13px; color:#555; text-align:center; max-width:260px; line-height:1.6; }
    button { padding:12px 24px; background:#f59e0b; border:none; border-radius:8px;
             color:#000; font-family:monospace; font-size:11px; font-weight:700;
             letter-spacing:0.1em; cursor:pointer; }
  </style>
</head>
<body>
  <div style="font-size:40px;">📦</div>
  <h1>SCAN&GO</h1>
  <p>Sin conexión a internet.<br>Los datos guardados siguen disponibles.</p>
  <button onclick="location.reload()">REINTENTAR</button>
</body>
</html>`;
}

// ── Sincronización en segundo plano (futuro) ──────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-inventory') {
    event.waitUntil(syncInventory());
  }
});

async function syncInventory() {
  // Placeholder para futura sync con backend
  console.log('[SW] Sync de inventario pendiente...');
}
