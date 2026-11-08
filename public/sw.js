/* Modo sin conexión: guarda la app y los datos ya consultados. */
const VERSION = 'liturgia-ocd-v0.7';
const BASE = [
  './', 'index.html', 'css/app.css', 'js/liturgia.js', 'js/app.js', 'manifest.webmanifest',
  'img/escudo.svg', 'img/icono.svg', 'img/icono-192.png', 'data/calendario-propio-ocd.json', 'data/calendario-general.json', 'data/regiones.json', 'data/santos.json', 'i18n/es.json', 'data/salterio/es/complementaria.json', 'data/salterio/es/laudes-domingo-1.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(BASE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Red primero (para recibir correcciones) y, si no hay conexión, lo guardado.
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  // Siempre pregunta al servidor si hay versión nueva (sin usar la caché del navegador).
  const pedido = e.request.mode === 'navigate'
    ? new Request(e.request.url, { cache: 'no-cache', credentials: 'same-origin' })
    : new Request(e.request, { cache: 'no-cache' });
  e.respondWith(
    fetch(pedido).then((r) => {
      if (r.ok) { const copia = r.clone(); caches.open(VERSION).then((c) => c.put(e.request, copia)); }
      return r;
    }).catch(() => caches.match(e.request).then((r) => r || caches.match('index.html')))
  );
});
