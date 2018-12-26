importScripts('files/js/cache-polyfill.js');

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open('speedometer2').then(function (cache) {
      return cache.addAll([
        '',
        'index.html',
        'index.html?homescreen=1',
        '?homescreen=1',
        'files/css/styles.css',
        'files/css/digital-7_mono_italic-webfont.woff',
        'files/css/digital-7_mono_italic-webfont.woff2',
        'files/css/digital-7_mono-webfont.woff',
        'files/css/digital-7_mono-webfont.woff2',
        'files/js/jquery.min.js',
        'files/js/app.js',
        'files/js/nosleep.js',
        'files/img/icons-192.png',
        'files/img/icons-512.png',

      ]);
    })
  );
});


self.addEventListener('fetch', function (event) {
  console.log(event.request.url);

  event.respondWith(
    caches.match(event.request).then(function (response) {
      return response || fetch(event.request);
    })
  );
});