const CACHE_NAME = 'sistema-os-v2';
const STATIC_CACHE = 'static-cache-v2';
const DYNAMIC_CACHE = 'dynamic-cache-v2';
const DATA_CACHE = 'data-cache-v2';

const urlsToCache = [
  '/',
  '/manifest.json',
  '/images/icon.jpg',
  '/images/logo.jpg',
  '/images/SERMAG.jpg',
  '/images/SERMAGLogo.jpg'
];

// Install event
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Service Worker: Caching static files');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Service Worker: Skip waiting');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.log('Service Worker: Cache install failed:', error);
      })
  );
});

// Fetch event with advanced caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle API requests (Firebase, etc.)
  if (url.pathname.includes('/api/') || url.hostname.includes('firebase')) {
    event.respondWith(networkFirstStrategy(request));
    return;
  }

  // Handle static assets
  if (request.destination === 'image' || request.destination === 'script' || request.destination === 'style') {
    event.respondWith(cacheFirstStrategy(request));
    return;
  }

  // Handle navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstStrategy(request));
    return;
  }

  // Default strategy
  event.respondWith(cacheFirstStrategy(request));
});

// Cache first strategy for static assets
async function cacheFirstStrategy(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('Cache first strategy failed:', error);
    return new Response('Offline - Resource not available', { status: 503 });
  }
}

// Network first strategy for API calls
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(DATA_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('Network first strategy failed, trying cache:', error);
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    return new Response('Offline - No cached data available', { status: 503 });
  }
}

// Activate event
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (![STATIC_CACHE, DYNAMIC_CACHE, DATA_CACHE].includes(cacheName)) {
              console.log('Service Worker: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control of all clients
      self.clients.claim()
    ])
  );
});

// Background sync for offline data
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  try {
    console.log('Service Worker: Starting background sync...');
    const offlineData = await getOfflineData();
    if (offlineData && offlineData.length > 0) {
      console.log('Service Worker: Found offline data to sync:', offlineData.length, 'items');
      await syncDataToFirebase(offlineData);
      await clearOfflineData();
    } else {
      console.log('Service Worker: No offline data to sync');
    }
  } catch (error) {
    console.log('Service Worker: Background sync failed:', error);
  }
}

async function getOfflineData() {
  try {
    // Get data from IndexedDB
    const db = await openDB();
    const transaction = db.transaction(['offline_data'], 'readonly');
    const store = transaction.objectStore('offline_data');
    const data = await store.getAll();
    return data;
  } catch (error) {
    console.log('Service Worker: Error getting offline data:', error);
    return [];
  }
}

async function syncDataToFirebase(data) {
  try {
    console.log('Service Worker: Syncing data to Firebase:', data);
    // Send data to main thread for Firebase sync
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_OFFLINE_DATA',
        data: data
      });
    });
  } catch (error) {
    console.log('Service Worker: Error syncing to Firebase:', error);
  }
}

async function clearOfflineData() {
  try {
    const db = await openDB();
    const transaction = db.transaction(['offline_data'], 'readwrite');
    const store = transaction.objectStore('offline_data');
    await store.clear();
    console.log('Service Worker: Offline data cleared');
  } catch (error) {
    console.log('Service Worker: Error clearing offline data:', error);
  }
}

async function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('OfflineDB', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('offline_data')) {
        const store = db.createObjectStore('offline_data', { keyPath: 'id', autoIncrement: true });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('type', 'type', { unique: false });
      }
    };
  });
}