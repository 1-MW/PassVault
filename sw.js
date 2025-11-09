// PassVault Service Worker - Static Assets Only
// Version 1.0.0

const CACHE_NAME = 'passvault-static-v1.0.0';
const urlsToCache = [
  './style.css',
  './assets/logo12.png',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Install event - cache only static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caching static assets');
        return cache.addAll(urlsToCache);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch event - serve static assets from cache, let everything else go through network
self.addEventListener('fetch', event => {
  // Only cache GET requests
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Parse the URL to determine what to cache
  const url = new URL(event.request.url);
  
  // Cache only static assets (CSS, images, fonts)
  const shouldCache = 
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.jpeg') ||
    url.pathname.endsWith('.gif') ||
    url.pathname.endsWith('.webp') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.woff') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.ttf') ||
    url.host.includes('cdnjs.cloudflare.com'); // Font Awesome CDN
  
  if (shouldCache) {
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          // Return cached version if available
          if (response) {
            return response;
          }
          
          // Clone the request because it's a stream that can only be consumed once
          const fetchRequest = event.request.clone();
          
          // Fetch from network
          return fetch(fetchRequest).then(response => {
            // Check if we received a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // Clone the response because it's a stream that can only be consumed once
            const responseToCache = response.clone();
            
            // Open cache and store the response
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
              
            return response;
          });
        })
    );
  }
  // For everything else (HTML, JS, dynamic content), let it go through network
});