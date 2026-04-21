const CACHE_NAME = 'faculty-connect-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/role.html',
  '/login.html',
  '/signup.html',
  '/student-dashboard.html',
  '/teacher-dashboard.html',
  '/admin.html',
  '/style.css',
  '/app.js',
  '/manifest.json',
  'https://www.chitkara.edu.in/wp-content/themes/chitkara/images/logo.png',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css'
];

// 1. Install Event: Saare files ko memory (cache) mein save karna
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Caching essential assets...');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// 2. Activate Event: Purana cache delete karna (jab aap app update karo)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Clearing old cache...');
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

// 3. Fetch Event: Offline hone par cached files dikhana
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Agar cache mein file hai toh wahi dikhao, nahi toh network se lao
      return response || fetch(event.request).catch(() => {
        // Agar dono fail ho jayein (Offline + No Cache), toh index dikha sakte ho
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
      });
    })
  );
});