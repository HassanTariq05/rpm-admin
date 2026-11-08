// A var declaration describes a property on globalThis.
// eslint-disable-next-line no-var
declare var RpmNotifications: {
  notificationTransaction<T = unknown>(
    store: string,
    mode: IDBTransactionMode,
    action: (store: IDBObjectStore) => IDBRequest | void,
  ): Promise<T>
  safeNotificationUrl(value: unknown, origin: string): string
  normalizeNotification(
    payload: unknown,
    userId: string,
    origin: string,
  ): import('./notifications').AppNotification | null
}
