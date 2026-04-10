const CACHE_NAME = 'smart-alarm-v4';
const ASSETS = ['./', './index.html', './style.css', './script.js', './manifest.json', './assets/alarm.mp3'];

self.addEventListener('install', e => {
    e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
});

self.addEventListener('fetch', e => {
    e.respondWith(caches.match(e.request).then(res => res || fetch(e.request)));
});