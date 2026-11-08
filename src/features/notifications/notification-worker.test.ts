/// <reference types="node" />
// @vitest-environment node
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { createContext, runInContext } from 'node:vm'
import { describe, expect, it, vi } from 'vitest'

const databaseScript = readFileSync(
  new URL('../../../public/notification-db.js', import.meta.url),
  'utf8',
)
const workerScript = readFileSync(
  new URL('../../../public/notification-sw.js', import.meta.url),
  'utf8',
)

function worker() {
  const rows = new Map<string, Record<string, unknown>>()
  const settings = new Map<string, unknown>([['activeUser', 'user-1']])
  const listeners: Record<string, (event: unknown) => void> = {}
  const client = {
    url: 'https://rpm.example/patients',
    postMessage: vi.fn(),
    navigate: vi.fn(),
    focus: vi.fn(),
  }
  const showNotification = vi.fn().mockResolvedValue(undefined)
  const openWindow = vi.fn()
  const scope = {
    location: { origin: 'https://rpm.example' },
    registration: { showNotification },
    clients: { matchAll: vi.fn().mockResolvedValue([client]), openWindow, claim: vi.fn() },
    addEventListener: (name: string, handler: (event: unknown) => void) => {
      listeners[name] = handler
    },
    skipWaiting: vi.fn(),
    RpmNotifications: {} as {
      normalizeNotification: (
        payload: unknown,
        userId: string,
        origin: string,
      ) => Record<string, unknown> | null
    },
  }
  const context = createContext({
    self: scope,
    crypto: { randomUUID },
    URL,
    importScripts: () => {},
  })
  runInContext(databaseScript, context)
  const shared = context.RpmNotifications as typeof scope.RpmNotifications
  scope.RpmNotifications = {
    ...shared,
    // Small transactional adapter isolates worker behavior from the browser's IDB implementation.
    notificationTransaction: async (
      name: string,
      _mode: string,
      action: (store: unknown) => unknown,
    ) => {
      const values = name === 'settings' ? settings : rows
      const store = {
        get: (key: string) => {
          const request = { result: values.get(key), onsuccess: (() => {}) as () => void }
          queueMicrotask(() => request.onsuccess())
          return request
        },
        getAll: () => {
          const request = { result: [...values.values()], onsuccess: (() => {}) as () => void }
          queueMicrotask(() => request.onsuccess())
          return request
        },
        put: (item: Record<string, unknown>) => rows.set(item.key as string, item),
        delete: (key: string) => values.delete(key),
      }
      const request = action(store) as { result?: unknown } | undefined
      await Promise.resolve()
      return request?.result
    },
  } as typeof scope.RpmNotifications
  runInContext(workerScript, context)
  const dispatch = async (name: string, data: object) => {
    let pending: Promise<unknown> = Promise.resolve()
    listeners[name]!({
      ...data,
      waitUntil: (promise: Promise<unknown>) => {
        pending = promise
      },
    })
    await pending
  }
  const payload = {
    id: 'event-1',
    userId: 'user-1',
    title: 'Workspace update',
    body: 'Open for details.',
    url: '/patients',
  }
  return { rows, settings, scope, shared, dispatch, payload, client, showNotification, openWindow }
}

describe('notification service worker', () => {
  it('persists a received push before updating tabs and showing a native notification', async () => {
    const w = worker()
    await w.dispatch('push', { data: { json: () => w.payload } })
    expect([...w.rows.values()]).toMatchObject([
      { userId: 'user-1', read: false, title: 'Workspace update' },
    ])
    expect(w.client.postMessage).toHaveBeenCalledWith({ type: 'RPM_NOTIFICATIONS_CHANGED' })
    expect(w.showNotification).toHaveBeenCalledWith(
      'Workspace update',
      expect.objectContaining({
        body: 'Open for details.',
        data: expect.objectContaining({ url: '/patients' }),
      }),
    )
  })

  it('uses the same receiving path for inbox-only and browser tests and acknowledges completion', async () => {
    const w = worker()
    const postMessage = vi.fn()
    await w.dispatch('message', {
      data: {
        type: 'RPM_TEST_NOTIFICATION',
        payload: { ...w.payload, test: true },
        showSystemNotification: false,
      },
      ports: [{ postMessage }],
    })
    expect(w.rows.size).toBe(1)
    expect(w.showNotification).not.toHaveBeenCalled()
    expect(postMessage).toHaveBeenCalledWith({ ok: true })
    await w.dispatch('message', {
      data: { type: 'RPM_TEST_NOTIFICATION', payload: { ...w.payload, id: 'second' } },
      ports: [{ postMessage }],
    })
    expect(w.rows.size).toBe(2)
    expect(w.showNotification).toHaveBeenCalledTimes(1)
  })

  it('deduplicates inbox events while preserving read state and still displaying pushes', async () => {
    const w = worker()
    await w.dispatch('push', { data: { json: () => w.payload } })
    const entry = [...w.rows.values()][0]!
    entry.read = true
    await w.dispatch('push', { data: { json: () => w.payload } })
    expect(w.rows.size).toBe(1)
    expect([...w.rows.values()][0]!.read).toBe(true)
    expect(w.showNotification).toHaveBeenCalledTimes(2)
  })

  it.each([null, 'another-user'])(
    'does not store payloads for inactive account %s',
    async (account) => {
      const w = worker()
      w.settings.set('activeUser', account)
      await w.dispatch('push', { data: { json: () => w.payload } })
      expect(w.rows.size).toBe(0)
      expect(w.showNotification).toHaveBeenCalledWith(
        'Remote Patient Monitoring',
        expect.objectContaining({ body: 'Open your workspace to check for updates.' }),
      )
    },
  )

  it('handles malformed push JSON with a generic visible notification', async () => {
    const w = worker()
    await w.dispatch('push', {
      data: {
        json: () => {
          throw new Error('Invalid JSON')
        },
      },
    })
    expect(w.rows.size).toBe(0)
    expect(w.showNotification).toHaveBeenCalledTimes(1)
  })

  it('caps the current account inbox without deleting other accounts', async () => {
    const w = worker()
    for (let i = 0; i < 105; i++)
      w.rows.set(`old-${i}`, {
        key: `old-${i}`,
        userId: 'user-1',
        createdAt: new Date(i).toISOString(),
      })
    w.rows.set('other', { key: 'other', userId: 'other', createdAt: new Date(0).toISOString() })
    await w.dispatch('push', { data: { json: () => w.payload } })
    expect(w.rows.size).toBe(101)
    expect(w.rows.has('old-0')).toBe(false)
    expect(w.rows.has('other')).toBe(true)
  })

  it('marks a native notification read, navigates and focuses an existing tab', async () => {
    const w = worker()
    await w.dispatch('push', { data: { json: () => w.payload } })
    const entry = [...w.rows.values()][0]!
    const close = vi.fn()
    await w.dispatch('notificationclick', {
      notification: { close, data: { key: entry.key, userId: 'user-1', url: '/patients' } },
    })
    expect(close).toHaveBeenCalled()
    expect([...w.rows.values()][0]!.read).toBe(true)
    expect(w.client.navigate).toHaveBeenCalledWith('/patients')
    expect(w.client.focus).toHaveBeenCalled()
  })

  it('opens a new tab and ignores a previous account destination after logout', async () => {
    const w = worker()
    w.scope.clients.matchAll.mockResolvedValue([])
    w.settings.set('activeUser', null)
    await w.dispatch('notificationclick', {
      notification: { close: vi.fn(), data: { userId: 'user-1', url: '/patients' } },
    })
    expect(w.openWindow).toHaveBeenCalledWith('/')
  })

  it.each([
    'https://evil.example/patients',
    '//evil.example/',
    'javascript:alert(1)',
    '/login',
    '/unknown',
  ])('rejects unsafe destination %s', (url) => {
    const w = worker()
    expect(
      w.shared.normalizeNotification({ ...w.payload, url }, 'user-1', 'https://rpm.example')!.url,
    ).toBe('/')
  })
})
