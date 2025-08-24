// DreflowPro Service Worker for Performance Optimization
const CACHE_NAME = 'dreflowpro-v1.0.0';
const STATIC_CACHE = 'dreflowpro-static-v1.0.0';
const DYNAMIC_CACHE = 'dreflowpro-dynamic-v1.0.0';

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/manifest.json',
  // Add critical CSS and JS files here
];

// Assets to cache on first request
const CACHE_STRATEGIES = {
  // Static assets - Cache First
  static: /\.(css|js|png|jpg|jpeg|gif|webp|avif|ico|svg|woff|woff2|ttf|otf)$/,
  
  // API calls - Network First with fallback
  api: /^\/api\//,
  
  // Pages - Stale While Revalidate
  pages: /^\/(?!api)/,
};

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('Service Worker: Installed successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker: Installation failed', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker: Activated successfully');
        return self.clients.claim();
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip cross-origin requests (unless they're for assets)
  if (url.origin !== location.origin && !CACHE_STRATEGIES.static.test(url.pathname)) {
    return;
  }
  
  event.respondWith(handleRequest(request));
});

async function handleRequest(request) {
  const url = new URL(request.url);
  
  try {
    // Static assets - Cache First strategy
    if (CACHE_STRATEGIES.static.test(url.pathname)) {
      return await cacheFirst(request, STATIC_CACHE);
    }
    
    // API calls - Network First strategy
    if (CACHE_STRATEGIES.api.test(url.pathname)) {
      return await networkFirst(request, DYNAMIC_CACHE);
    }
    
    // Pages - Stale While Revalidate strategy
    if (CACHE_STRATEGIES.pages.test(url.pathname)) {
      return await staleWhileRevalidate(request, DYNAMIC_CACHE);
    }
    
    // Default - Network only
    return await fetch(request);
    
  } catch (error) {
    console.error('Service Worker: Request failed', error);
    
    // Return offline fallback if available
    return await getOfflineFallback(request);
  }
}

// Cache First strategy - for static assets
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  const networkResponse = await fetch(request);
  
  if (networkResponse.ok) {
    cache.put(request, networkResponse.clone());
  }
  
  return networkResponse;
}

// Network First strategy - for API calls
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

// Stale While Revalidate strategy - for pages
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  // Fetch in background to update cache
  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  });
  
  // Return cached version immediately if available
  if (cachedResponse) {
    return cachedResponse;
  }
  
  // Otherwise wait for network
  return await fetchPromise;
}

// Offline fallback
async function getOfflineFallback(request) {
  const url = new URL(request.url);
  
  // For pages, return cached index page
  if (request.destination === 'document') {
    const cache = await caches.open(STATIC_CACHE);
    return await cache.match('/') || new Response('Offline', { status: 503 });
  }
  
  // For images, return placeholder
  if (request.destination === 'image') {
    return new Response(
      '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="#f0f0f0"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#999">Offline</text></svg>',
      { headers: { 'Content-Type': 'image/svg+xml' } }
    );
  }
  
  return new Response('Offline', { status: 503 });
}

// Background sync for failed requests
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  // Implement background sync logic here
  console.log('Service Worker: Background sync triggered');
}

// Push notifications
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    
    const options = {
      body: data.body,
      icon: '/icon-192x192.png',
      badge: '/badge-72x72.png',
      tag: data.tag || 'default',
      data: data.data || {},
      actions: data.actions || [],
      requireInteraction: data.requireInteraction || false,
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action) {
    // Handle action clicks
    console.log('Notification action clicked:', event.action);
  } else {
    // Handle notification click
    event.waitUntil(
      clients.openWindow(event.notification.data.url || '/')
    );
  }
});

// Performance monitoring
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'PERFORMANCE_MEASURE') {
    // Log performance metrics
    console.log('Performance measure:', event.data.metrics);
  }
});

// Cache management utilities
async function cleanupOldCaches() {
  const cacheNames = await caches.keys();
  const oldCaches = cacheNames.filter(name => 
    name.startsWith('dreflowpro-') && 
    name !== STATIC_CACHE && 
    name !== DYNAMIC_CACHE
  );
  
  return Promise.all(oldCaches.map(name => caches.delete(name)));
}

// Periodic cache cleanup
setInterval(cleanupOldCaches, 24 * 60 * 60 * 1000); // Daily cleanup
