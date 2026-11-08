importScripts('/notification-db.js')
const {
  notificationTransaction: transaction,
  normalizeNotification,
  safeNotificationUrl,
} = self.RpmNotifications

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

async function broadcast() {
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
  clients.forEach((client) => client.postMessage({ type: 'RPM_NOTIFICATIONS_CHANGED' }))
}

async function receive(payload, showSystemNotification = true) {
  const userId = await transaction('settings', 'readonly', (store) => store.get('activeUser'))
  const notification = normalizeNotification(payload, userId, self.location.origin)
  // Ignore deliveries for signed-out or different accounts, including old subscriptions.
  if (!notification) throw new Error('Notification recipient does not match the signed-in account.')
  const existing = await transaction('notifications', 'readonly', (store) =>
    store.get(notification.key),
  )
  if (!existing)
    await transaction('notifications', 'readwrite', (store) => {
      store.put(notification)
      const request = store.getAll()
      request.onsuccess = () => {
        const rows = request.result
          .filter((item) => item.userId === userId)
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        rows.slice(100).forEach((item) => store.delete(item.key))
      }
    })
  await broadcast()
  if (showSystemNotification) {
    await self.registration.showNotification(notification.title, {
      body: notification.body,
      icon: '/icon-192.png',
      badge: '/favicon-32x32.png',
      tag: notification.key,
      data: { key: notification.key, userId, url: notification.url },
    })
  }
}

self.addEventListener('push', (event) => {
  event.waitUntil(
    (async () => {
      let payload
      try {
        payload = event.data?.json()
      } catch {
        payload = null
      }
      try {
        await receive(payload)
      } catch {
        // Web Push requires a visible notification even when the payload is invalid.
        await self.registration.showNotification('Remote Patient Monitoring', {
          body: 'Open your workspace to check for updates.',
          icon: '/icon-192.png',
          data: { url: '/' },
        })
      }
    })(),
  )
})

self.addEventListener('message', (event) => {
  if (event.data?.type !== 'RPM_TEST_NOTIFICATION') return
  event.waitUntil(
    receive(event.data.payload, event.data.showSystemNotification !== false)
      .then(() => event.ports[0]?.postMessage({ ok: true }))
      .catch((error) => event.ports[0]?.postMessage({ error: error.message })),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    (async () => {
      const data = event.notification.data || {}
      const userId = await transaction('settings', 'readonly', (store) => store.get('activeUser'))
      const url = safeNotificationUrl(data.userId === userId ? data.url : '/', self.location.origin)
      if (data.key && data.userId === userId) {
        await transaction('notifications', 'readwrite', (store) => {
          const request = store.get(data.key)
          request.onsuccess = () => {
            if (request.result) store.put({ ...request.result, read: true })
          }
        })
        await broadcast()
      }
      const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const client = clients.find((item) => new URL(item.url).origin === self.location.origin)
      if (client) {
        await client.navigate(url)
        await client.focus()
      } else await self.clients.openWindow(url)
    })(),
  )
})
