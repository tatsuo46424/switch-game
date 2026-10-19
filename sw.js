// スイッチ結線ゲーム オフライン用 Service Worker
const VERSION = '20261019092256';
const APP = 'switch-app-' + VERSION;
const FONTS = 'switch-fonts-v1';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  // HTTPキャッシュ(GitHub Pagesは10分)に残った古いファイルを取り込まないよう、必ずサーバーから取り直す
  e.waitUntil(caches.open(APP).then(c => c.addAll(FILES.map(f => new Request(f, {cache: 'reload'})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('switch-') && k !== APP && k !== FONTS).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Googleフォント: 一度読んだら端末に保存
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(caches.open(FONTS).then(c => c.match(req).then(hit => hit || fetch(req).then(res => { c.put(req, res.clone()); return res; }))));
    return;
  }
  if (url.origin !== location.origin) return;
  // アプリ本体: 保存版をすぐ表示し、裏で最新版を取りに行く
  e.respondWith(caches.open(APP).then(async c => {
    const key = req.mode === 'navigate' ? './index.html' : req;
    const hit = await c.match(key, {ignoreSearch: true});
    const net = fetch(req).then(res => { if (res.ok) c.put(key, res.clone()); return res; }).catch(() => null);
    if (hit) { e.waitUntil(net); return hit; }
    return (await net) || Response.error();
  }));
});
