// Service worker: keeps the app available offline and updates it when a new version is published.
const VERSION = '650022d1d7';
const APP_CACHE = 'app-' + VERSION;
const MEDIA_CACHE = 'media-v1';       // audio files: kept across app versions so they are downloaded only once
const FONT_CACHE = 'fonts-v1';
const CORE = ['./', 'index.html', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(APP_CACHE).then(c => c.addAll(CORE.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('app-') && k !== APP_CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function rangeFrom(resp, rangeHeader) {
  const buf = await resp.arrayBuffer();
  const m = /bytes=(\d*)-(\d*)/.exec(rangeHeader || '');
  if (!m) return resp;
  const size = buf.byteLength;
  const start = m[1] ? parseInt(m[1], 10) : 0;
  const end = m[2] ? Math.min(parseInt(m[2], 10), size - 1) : size - 1;
  return new Response(buf.slice(start, end + 1), {
    status: 206,
    headers: { 'Content-Type': resp.headers.get('Content-Type') || 'audio/mpeg', 'Content-Range': 'bytes ' + start + '-' + end + '/' + size, 'Content-Length': String(end - start + 1) }
  });
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Google Fonts: cache so the typography works offline
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(FONT_CACHE).then(async c => {
      const hit = await c.match(req);
      const net = fetch(req).then(r => { if (r && (r.ok || r.type === 'opaque')) c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    }));
    return;
  }

  if (url.origin !== location.origin) return;

  // audio: cache on first download, then serve from the cache (with range support)
  if (/\.(mp3|m4a|wav|ogg)$/i.test(url.pathname)) {
    e.respondWith((async () => {
      const c = await caches.open(MEDIA_CACHE);
      const key = url.origin + url.pathname;
      let hit = await c.match(key);
      if (!hit) {
        const net = await fetch(key);
        if (net.ok && net.status === 200) { c.put(key, net.clone()).catch(() => {}); hit = net; } else return net;
      }
      const rh = req.headers.get('range');
      return rh ? rangeFrom(hit.clone(), rh) : hit;
    })());
    return;
  }

  // the app itself: cache first (the cache is replaced when a new version is published)
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).then(r => {
      if (r.ok && r.status === 200) { const copy = r.clone(); caches.open(APP_CACHE).then(c => c.put(req, copy)); }
      return r;
    }).catch(() => req.mode === 'navigate' ? caches.match('index.html') : Response.error()))
  );
});
