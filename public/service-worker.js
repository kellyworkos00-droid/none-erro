// Service Worker for Elegante PWA
// Handles offline support, caching, and background sync

const CACHE_NAME = 'elegante-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/globals.css',
  '/offline.html',
];

const API_CACHE_NAME = 'elegante-api-v1';
const STALE_WHILE_REVALIDATE_APIS = [
  '/api/analytics/dashboard',
  '/api/analytics/aging-report',
  '/api/analytics/cash-flow',
  '/api/customers',
  '/api/invoices',
  '/api/payments',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Caching static assets');
      return cache.addAll(STATIC_ASSETS).catch((error) => {
        console.warn('Failed to cache some static assets:', error);
      });
    }),
  );

  // Skip waiting - immediately activate new SW
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        }),
      );
    }),
  );

  // Take control of all clients
  self.clients.claim();
});

// Fetch event - network first with fallback to cache
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET requests and external requests
  if (request.method !== 'GET' || !request.url.startsWith(self.location.origin)) {
    return;
  }

  const url = new URL(request.url);

  // API requests - stale while revalidate
  if (url.pathname.startsWith('/api/')) {
    if (STALE_WHILE_REVALIDATE_APIS.some((api) => url.pathname.includes(api))) {
      return event.respondWith(staleWhileRevalidate(request));
    }

    // Other API requests - network first
    return event.respondWith(networkFirst(request));
  }

  // Static assets - cache first
  return event.respondWith(cacheFirst(request));
});

// Cache first strategy (for static assets)
async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);

    if (response.ok) {
      cache.put(request, response.clone());
    }

    return response;
  } catch {
    return new Response('Offline - Resource not found', { status: 503 });
  }
}

// Network first strategy (for API requests)
async function networkFirst(request) {
  try {
    const response = await fetch(request);

    if (response.ok) {
      const cache = await caches.open(API_CACHE_NAME);
      cache.put(request, response.clone());
    }

    return response;
  } catch {
    const cache = await caches.open(API_CACHE_NAME);
    const cached = await cache.match(request);

    if (cached) {
      return cached;
    }

    return new Response(
      JSON.stringify({
        error: 'Offline - Unable to fetch data. Please check your connection.',
        offline: true,
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
}

// Stale while revalidate strategy
async function staleWhileRevalidate(request) {
  const cache = await caches.open(API_CACHE_NAME);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  });

  return cached || fetchPromise;
}

// Handle push notifications
self.addEventListener('push', (event) => {
  console.log('Push notification received:', event);

  const data = event.data?.json() || {
    title: 'Elegante',
    body: 'You have a new notification',
  };

  const options = {
    badge: '/images/icon-192.png',
    icon: '/images/icon-192.png',
    tag: 'elegante-notification',
    requireInteraction: data.requireInteraction || false,
    data: data.data || {},
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event.notification);

  event.notification.close();

  const urlToOpen = event.notification.data.url || '/';

  event.waitUntil(
    self.clients
      .matchAll({
        type: 'window',
        includeUncontrolled: true,
      })
      .then((clients) => {
        // Look for an existing client with the target URL
        for (const client of clients) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }

        // If no client found, open new window
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen);
        }
      }),
  );
});

// Handle background sync
self.addEventListener('sync', (event) => {
  console.log('Background sync event:', event.tag);

  if (event.tag === 'sync-reports') {
    event.waitUntil(syncReports());
  } else if (event.tag === 'sync-payments') {
    event.waitUntil(syncPayments());
  }
});

async function syncReports() {
  try {
    // Sync reports when back online
    const response = await fetch('/api/reports/sync', { method: 'POST' });
    return response.ok;
  } catch (error) {
    console.error('Failed to sync reports:', error);
    throw error;
  }
}

async function syncPayments() {
  try {
    // Sync payments when back online
    const response = await fetch('/api/payments/sync', { method: 'POST' });
    return response.ok;
  } catch (error) {
    console.error('Failed to sync payments:', error);
    throw error;
  }
}
