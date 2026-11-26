/* ==========================================================================
   품 꾸미기 PWA — 서비스 워커
   앱 셸(HTML/CSS/JS/아이콘/이미지)을 캐시해 오프라인에서도 열립니다.
   ========================================================================== */
const CACHE = 'pum-decorator-v12';
const ASSETS = [
  './',
  './index.html',
  './styles.css?v=20261126j',
  './manifest.webmanifest',
  './assets/vendor/qrcode.js?v=20261126j',
  './js/base.js?v=20261126j',
  './js/crop.js?v=20261126j',
  './js/admin.js?v=20261126j',
  './js/opsadmin.js?v=20261126j',
  './js/render.js?v=20261126j',
  './js/auth.js?v=20261126j',
  './js/account.js?v=20261126j',
  './js/editor.js?v=20261126j',
  './js/app.js?v=20261126j',
  './assets/fonts/Pretendard-Regular.woff2',
  './assets/fonts/Pretendard-SemiBold.woff2',
  './assets/fonts/Pretendard-Bold.woff2',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-512-maskable.png',
  './assets/icons/apple-touch-icon.png',
  './assets/sns/instagram.jpg',
  './assets/sns/youtube.jpg',
  './assets/sns/homepage.jpg',
  './assets/sns/phone.jpg',
  './assets/sns/email.jpg',
  './assets/sns/facebook.jpg',
  './assets/sns/x.jpg',
  './assets/sns/kakaostory.jpg',
  './assets/sns/band.jpg',
  './assets/sns/blog.jpg',
  './assets/sns/play.jpg',
  './assets/sns/tictoc.jpg',
  './assets/sns/suno.jpg',
  './assets/apptech/1.jpg',
  './assets/apptech/2.jpg',
  './assets/apptech/3.jpg',
  './assets/apptech/4.jpg',
  './assets/apptech/5.jpg',
  './assets/apptech/6.jpg',
  './assets/apptech/7.jpg',
  './assets/apptech/8.jpg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(ASSETS).catch(() => undefined))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // 카카오맵 SDK 등 외부 요청은 그대로 통과

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => undefined);
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit || caches.match('./index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => undefined);
          }
          return res;
        })
        .catch(() => hit);
    })
  );
});
