// Service worker for the Hörspiel app: the page is served from the cache and refreshed in the background; the recording is downloaded once and kept.
const APP_CACHE = 'johannes-app-v1';
const MEDIA_CACHE = 'media-v1';
const CORE = ['./', 'index.html', 'manifest.webmanifest', '../icons/icon-192.png', '../icons/icon-512.png', '../icons/apple-touch-icon.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(APP_CACHE).then(c => c.addAll(CORE.map(u => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('johannes-app-') && k !== APP_CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
async function rangeFrom(resp, rangeHeader) {
  const buf = await resp.arrayBuffer();
  const m = /bytes=(\d*)-(\d*)/.exec(rangeHeader || '');
  if (!m) return resp;
  const size = buf.byteLength, start = m[1] ? parseInt(m[1], 10) : 0, end = m[2] ? Math.min(parseInt(m[2], 10), size - 1) : size - 1;
  return new Response(buf.slice(start, end + 1), { status: 206, headers: { 'Content-Type': resp.headers.get('Content-Type') || 'audio/mpeg', 'Content-Range': 'bytes ' + start + '-' + end + '/' + size, 'Content-Length': String(end - start + 1) } });
}
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (/\.(mp3|m4a|wav|ogg)$/i.test(url.pathname)) {
    e.respondWith((async () => {
      const c = await caches.open(MEDIA_CACHE), key = url.origin + url.pathname;
      let hit = await c.match(key);
      if (!hit) { const net = await fetch(key); if (net.ok && net.status === 200) { c.put(key, net.clone()).catch(() => {}); hit = net; } else return net; }
      const rh = req.headers.get('range');
      return rh ? rangeFrom(hit.clone(), rh) : hit;
    })());
    return;
  }
  // the app itself: show the cached copy right away, update it in the background
  e.respondWith(caches.open(APP_CACHE).then(async c => {
    const hit = await c.match(req, { ignoreSearch: true });
    const net = fetch(req).then(r => { if (r.ok && r.status === 200) c.put(req, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  }));
});
