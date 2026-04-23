const CACHE_NAME = 'faculty-connect-v2'; // Version update kiya
const urlsToCache = [
  '/',
  '/index.html',
  '/login.html',
  '/role.html',
  '/signup.html',
  '/student-dashboard.html',
  '/dashboard.html',
  '/style.css',
  '/app.js',
  '/manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
  'https://www.chitkara.edu.in/wp-content/themes/chitkara/images/logo.png'
];

// Install Service Worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('PWA: Caching all assets');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch Strategy: Network First, falling back to Cache
self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request)
      .catch(() => {
        return caches.match(event.request);
      })
  );
});

// Update & Clean up old caches
self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheWhitelist.indexOf(cacheName) === -1) {
              console.log('PWA: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
    );
});