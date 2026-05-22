// ─── Finanças App – Service Worker v1 ───────────────────────
const CACHE_VERSION = 'financas-v1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const API_CACHE = `${CACHE_VERSION}-api`;
const OFFLINE_QUEUE = 'financas-offline-queue';

// Arquivos do App Shell que são cacheados no install
const APP_SHELL = [
  '/',
  '/index.html',
];

// ─── Install ────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  console.log('[SW] Install');
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

// ─── Activate ───────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate');
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== STATIC_CACHE && key !== API_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ─── Fetch Strategy ─────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (!url.protocol.startsWith('http')) return;

  // Skip non-GET requests → handle offline queue
  if (request.method !== 'GET') {
    event.respondWith(handleMutation(request));
    return;
  }

  // API requests → Stale-While-Revalidate
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(staleWhileRevalidate(request, API_CACHE));
    return;
  }

  // Static assets → Cache First
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // HTML pages → Network First (fallback to cached shell)
  event.respondWith(networkFirst(request, STATIC_CACHE));
});

// ─── Cache Strategies ───────────────────────────────────────

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) cache.put(request, networkResponse.clone());
    return networkResponse;
  }).catch(() => cachedResponse);
  return cachedResponse || fetchPromise;
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const res = await fetch(request);
    if (res.ok) cache.put(request, res.clone());
    return res;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

async function networkFirst(request, cacheName) {
  try {
    const res = await fetch(request);
    if (res.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, res.clone());
    }
    return res;
  } catch {
    const cache = await caches.open(cacheName);
    return (await cache.match(request)) || (await cache.match('/index.html'));
  }
}

// ─── Offline Mutation Queue ─────────────────────────────────

async function handleMutation(request) {
  try {
    return await fetch(request.clone());
  } catch {
    const body = await request.clone().text();
    await saveToOfflineQueue({
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      body,
      timestamp: Date.now(),
    });
    return new Response(
      JSON.stringify({ message: 'Salvo offline. Será enviado quando a conexão voltar.', offline: true }),
      { status: 202, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// ─── IndexedDB ──────────────────────────────────────────────

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('financas-sw', 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(OFFLINE_QUEUE))
        req.result.createObjectStore(OFFLINE_QUEUE, { autoIncrement: true });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveToOfflineQueue(item) {
  const db = await openDB();
  const tx = db.transaction(OFFLINE_QUEUE, 'readwrite');
  tx.objectStore(OFFLINE_QUEUE).add(item);
}

async function getOfflineQueue() {
  const db = await openDB();
  return new Promise((resolve) => {
    const req = db.transaction(OFFLINE_QUEUE, 'readonly').objectStore(OFFLINE_QUEUE).getAll();
    req.onsuccess = () => resolve(req.result);
  });
}

async function clearOfflineQueue() {
  const db = await openDB();
  db.transaction(OFFLINE_QUEUE, 'readwrite').objectStore(OFFLINE_QUEUE).clear();
}

// ─── Background Sync ────────────────────────────────────────

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-mutations') event.waitUntil(replayOfflineQueue());
});

self.addEventListener('message', (event) => {
  if (event.data === 'REPLAY_QUEUE') replayOfflineQueue();
});

async function replayOfflineQueue() {
  const queue = await getOfflineQueue();
  if (!queue.length) return;
  for (const item of queue) {
    try {
      await fetch(item.url, { method: item.method, headers: item.headers, body: item.body });
    } catch { return; }
  }
  await clearOfflineQueue();
  const clients = await self.clients.matchAll();
  clients.forEach((c) => c.postMessage({ type: 'SYNC_COMPLETE', count: queue.length }));
}

function isStaticAsset(p) {
  return /\.(js|css|woff2?|ttf|otf|svg|png|jpg|jpeg|webp|gif|ico|json)$/i.test(p);
}
