// Service worker: lưu sẵn vỏ app để mở nhanh và dùng được khi mất mạng
const CACHE = 'fitlife-v7';
const SHELL = ['./', 'index.html', 'style.css?v=7', 'data.js?v=6', 'food-db.js?v=6', 'app.js?v=7', 'manifest.json', 'icon-192.png', 'tung_chu_avatar.png'];

self.addEventListener('install', (e) => {
    e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
    e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
    const url = new URL(e.request.url);
    if (e.request.method !== 'GET') return;
    // Không đụng tới API (Gemini, Firebase)
    if (/googleapis\.com|firebaseio|firebasedatabase|firebasestorage/.test(url.host)) return;
    // File của app: lấy mạng trước để luôn có bản mới, mất mạng thì dùng bản lưu
    if (url.origin === location.origin) {
        e.respondWith(fetch(e.request).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(e.request, copy));
            return res;
        }).catch(() => caches.match(e.request).then((r) => r || caches.match('index.html'))));
        return;
    }
    // Thư viện CDN (đã cố định phiên bản): lấy bản lưu trước
    e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return res;
    })));
});
