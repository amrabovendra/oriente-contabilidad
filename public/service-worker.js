// Service worker mínimo: solo para que se pueda "instalar" la app (ícono
// propio, pantalla completa). A propósito NO guarda en caché nada de los
// datos (/gastos, /creditos, /libro, etc.) - esos siempre se piden en vivo.

const CACHE_NAME = 'oriente-contable-shell-v1';
const ARCHIVOS_DE_LA_APP = [
  '/',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ARCHIVOS_DE_LA_APP))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((nombres) =>
      Promise.all(nombres.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  const esArchivoDeLaApp = event.request.method === 'GET' &&
    (url.pathname === '/' || ARCHIVOS_DE_LA_APP.includes(url.pathname));
  if (!esArchivoDeLaApp) return;

  event.respondWith(
    fetch(event.request)
      .then((respuesta) => {
        const copia = respuesta.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copia));
        return respuesta;
      })
      .catch(() => caches.match(event.request))
  );
});
