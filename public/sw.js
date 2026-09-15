// Service Worker ZakatKu
// Cache sederhana untuk halaman utama

const CACHE_NAME = 'zakatku-v1'
const URLS_TO_CACHE = [
  '/',
  '/zakatku-logo.png',
]

// Install — cache file dasar
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(URLS_TO_CACHE).catch((err) => {
        console.warn('Cache gagal:', err)
      })
    })
  )
  self.skipWaiting()
})

// Activate — hapus cache lama
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    })
  )
  self.clients.claim()
})

// Fetch — network first, fallback ke cache
self.addEventListener('fetch', (event) => {
  // Skip request non-GET
  if (event.request.method !== 'GET') return

  // Skip request ke Supabase (biar selalu online)
  if (event.request.url.includes('supabase.co')) return

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache response sukses
        if (response && response.status === 200) {
          const responseClone = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone)
          })
        }
        return response
      })
      .catch(() => {
        // Offline — pakai cache
        return caches.match(event.request)
      })
  )
})