;(() => {
  // Shared by the page and service worker. No patient data belongs in push payloads.
  function openNotificationDb() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('rpm-notifications-v1', 1)
      request.onupgradeneeded = () => {
        request.result.createObjectStore('notifications', { keyPath: 'key' })
        request.result.createObjectStore('settings')
      }
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async function notificationTransaction(store, mode, action) {
    const db = await openNotificationDb()
    try {
      return await new Promise((resolve, reject) => {
        const transaction = db.transaction(store, mode)
        const result = action(transaction.objectStore(store))
        transaction.oncomplete = () => resolve(result?.result)
        transaction.onerror = () => reject(transaction.error)
        transaction.onabort = () =>
          reject(transaction.error || new Error('Notification storage unavailable'))
      })
    } finally {
      db.close()
    }
  }

  function safeNotificationUrl(value, origin) {
    try {
      const url = new URL(typeof value === 'string' ? value : '/', origin)
      const allowed = [
        '/',
        '/patients',
        '/devices',
        '/device-readings',
        '/reports',
        '/users',
        '/organizations',
        '/roles',
        '/manage-roles',
      ]
      return url.origin === origin && allowed.includes(url.pathname)
        ? url.pathname + url.search
        : '/'
    } catch {
      return '/'
    }
  }

  function normalizeNotification(payload, userId, origin) {
    if (!payload || typeof payload !== 'object' || payload.userId !== userId || !userId) return null
    const id =
      typeof payload.id === 'string' && payload.id ? payload.id.slice(0, 200) : crypto.randomUUID()
    return {
      key: JSON.stringify([userId, id]),
      id,
      userId,
      title:
        typeof payload.title === 'string' && payload.title.trim()
          ? payload.title.slice(0, 120)
          : 'New notification',
      body:
        typeof payload.body === 'string'
          ? payload.body.slice(0, 500)
          : 'Open your workspace for details.',
      url: safeNotificationUrl(payload.url, origin),
      createdAt: new Date().toISOString(),
      read: false,
      test: payload.test === true,
    }
  }

  globalThis.RpmNotifications = {
    notificationTransaction,
    safeNotificationUrl,
    normalizeNotification,
  }
})()
