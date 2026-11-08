import { useCallback, useEffect, useState } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import {
  getNotificationWorker,
  loadNotifications,
  pushSupport,
  transaction,
  updateNotifications,
  type AppNotification,
} from './notifications'

// Keep transitions ordered across shell remounts and Strict Mode effect replay.
let accountUpdates = Promise.resolve()

export function useNotifications() {
  const userId = useAuthStore((state) => state.auth.user?.id)
  const [inbox, setInbox] = useState<{ userId: string; items: AppNotification[] }>({
    userId: '',
    items: [],
  })
  const [error, setError] = useState('')
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const supportError = pushSupport()
  const refresh = useCallback(async () => {
    if (!userId) return
    const items = await loadNotifications(userId)
    setInbox({ userId, items })
  }, [userId])

  useEffect(() => {
    if (!('indexedDB' in window) || !('serviceWorker' in navigator)) return
    // Serialize account transitions so logout cannot leave the previous recipient active.
    const syncAccount = () => {
      const currentUser = useAuthStore.getState().auth.user?.id ?? null
      accountUpdates = accountUpdates
        .then(async () => {
          const previous = await transaction<string | null>('settings', 'readonly', (store) =>
            store.get('activeUser'),
          )
          await transaction('settings', 'readwrite', (store) =>
            store.put(currentUser, 'activeUser'),
          )
          if (previous && previous !== currentUser) {
            const worker = await getNotificationWorker()
            const subscription = await worker.pushManager?.getSubscription()
            await subscription?.unsubscribe()
            const visible = await worker.getNotifications()
            visible.forEach((notification) => notification.close())
          }
        })
        .catch((reason: unknown) =>
          setError(reason instanceof Error ? reason.message : 'Notification setup failed.'),
        )
    }
    syncAccount()
    const unsubscribe = useAuthStore.subscribe(syncAccount)
    if (!supportError)
      void getNotificationWorker().catch((reason: Error) => setError(reason.message))
    return unsubscribe
  }, [supportError])

  useEffect(() => {
    const update = () => {
      if ('Notification' in window) setPermission(Notification.permission)
      if ('indexedDB' in window)
        void refresh().catch(() =>
          setError('Unable to load notifications. Browser storage may be disabled.'),
        )
    }
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === 'RPM_NOTIFICATIONS_CHANGED') update()
    }
    update()
    navigator.serviceWorker?.addEventListener('message', onMessage)
    window.addEventListener('focus', update)
    document.addEventListener('visibilitychange', update)
    return () => {
      navigator.serviceWorker?.removeEventListener('message', onMessage)
      window.removeEventListener('focus', update)
      document.removeEventListener('visibilitychange', update)
    }
  }, [refresh])

  const mutate = async (action: 'read' | 'clear', key?: string) => {
    if (!userId) return
    await updateNotifications(userId, action, key)
    await refresh()
    const worker = await getNotificationWorker()
    if ('BroadcastChannel' in window) {
      const channel = new BroadcastChannel('rpm-notifications')
      channel.postMessage('changed')
      channel.close()
    }
    if (action === 'clear')
      (await worker.getNotifications()).forEach((notification) => notification.close())
  }
  useEffect(() => {
    if (!('BroadcastChannel' in window)) return
    const channel = new BroadcastChannel('rpm-notifications')
    channel.onmessage = () => {
      void refresh().catch(() => setError('Unable to refresh notifications.'))
    }
    return () => channel.close()
  }, [refresh])

  return {
    userId,
    items: inbox.userId === userId ? inbox.items : [],
    error,
    setError,
    permission,
    setPermission,
    supportError,
    refresh,
    mutate,
  }
}
