import { translate as t } from '@/i18n'

export interface AppNotification {
  key: string
  id: string
  userId: string
  title: string
  body: string
  url: string
  createdAt: string
  read: boolean
  test: boolean
}

type NotificationDatabase = typeof globalThis.RpmNotifications

let database: Promise<NotificationDatabase> | undefined

function loadNotificationDatabase() {
  if (globalThis.RpmNotifications) return Promise.resolve(globalThis.RpmNotifications)
  database ??= new Promise<NotificationDatabase>((resolve, reject) => {
    // Public scripts must load as classic scripts, not through Vite's module loader.
    const script = document.createElement('script')
    script.src = '/notification-db.js'
    script.async = true
    script.onload = () => {
      if (globalThis.RpmNotifications) resolve(globalThis.RpmNotifications)
      else reject(new Error('Notification storage could not initialize. Reload and try again.'))
    }
    script.onerror = () => reject(new Error('Notification storage could not load. Try again.'))
    document.head.appendChild(script)
  }).catch((error) => {
    database = undefined
    document.querySelector('script[src="/notification-db.js"]')?.remove()
    throw error
  })
  return database
}

export async function transaction<T = unknown>(
  store: string,
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest | void,
): Promise<T> {
  const db = await loadNotificationDatabase()
  return db.notificationTransaction<T>(store, mode, action)
}
export const vapidPublicKey = import.meta.env.VITE_WEB_PUSH_PUBLIC_KEY?.trim() as string | undefined

export function pushSupport() {
  if (!window.isSecureContext) return 'Browser notifications require HTTPS or localhost.'
  if (
    !('serviceWorker' in navigator) ||
    !('Notification' in window) ||
    !('PushManager' in window)
  ) {
    return 'Web push is unavailable in this browser. On iPhone or iPad, add this app to your Home Screen and open it there.'
  }
  return null
}

let registration: Promise<ServiceWorkerRegistration> | undefined
export function getNotificationWorker() {
  registration ??= navigator.serviceWorker
    .register('/notification-sw.js', { scope: '/' })
    .then(async (worker) => {
      if (!worker.active) {
        await new Promise<void>((resolve, reject) => {
          const installing = worker.installing || worker.waiting
          if (!installing)
            return reject(new Error('Notification worker could not start. Reload and try again.'))
          const timeout = window.setTimeout(
            () => reject(new Error('Notification worker timed out. Reload and try again.')),
            15000,
          )
          installing.addEventListener('statechange', () => {
            if (installing.state === 'activated' || installing.state === 'redundant') {
              clearTimeout(timeout)
              if (installing.state === 'activated') resolve()
              else reject(new Error('Notification worker could not activate.'))
            }
          })
        })
      }
      return worker
    })
    .catch((error) => {
      registration = undefined
      throw error
    })
  return registration
}

export async function enablePush() {
  // Request directly from a user gesture (required by Safari).
  const permission = await Notification.requestPermission()
  if (permission !== 'granted')
    throw new Error(
      permission === 'denied'
        ? 'Notifications are blocked. Allow them in your browser’s site settings, then try again.'
        : 'Permission was not granted. You can try again when ready.',
    )
  const worker = await getNotificationWorker()
  if (!vapidPublicKey) return null
  const existing = await worker.pushManager.getSubscription()
  if (existing) return existing
  const raw = atob(vapidPublicKey.replace(/-/g, '+').replace(/_/g, '/'))
  const key = Uint8Array.from(raw, (character) => character.charCodeAt(0))
  return worker.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key })
}

export async function sendTestNotification(userId: string, system: boolean) {
  const worker = await getNotificationWorker()
  const channel = new MessageChannel()
  return new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      channel.port1.close()
      reject(new Error('Test timed out. Reload and try again.'))
    }, 10000)
    channel.port1.onmessage = (event) => {
      clearTimeout(timeout)
      channel.port1.close()
      if (event.data.error) reject(new Error(event.data.error))
      else resolve()
    }
    worker.active!.postMessage(
      {
        type: 'RPM_TEST_NOTIFICATION',
        showSystemNotification: system,
        payload: {
          id: crypto.randomUUID(),
          userId,
          title: t('Test notification'),
          body: t(
            'Your notification setup is working. This is a test; no patient data is included.',
          ),
          url: '/',
          test: true,
        },
      },
      [channel.port2],
    )
  })
}

export async function loadNotifications(userId: string) {
  const rows = await transaction<AppNotification[]>('notifications', 'readonly', (store) =>
    store.getAll(),
  )
  return rows
    .filter((item) => item.userId === userId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export async function updateNotifications(userId: string, action: 'read' | 'clear', key?: string) {
  await transaction('notifications', 'readwrite', (store) => {
    const request = store.getAll()
    request.onsuccess = () => {
      for (const item of request.result as AppNotification[]) {
        if (item.userId !== userId || (key && item.key !== key)) continue
        if (action === 'clear') store.delete(item.key)
        else store.put({ ...item, read: true })
      }
    }
  })
}
