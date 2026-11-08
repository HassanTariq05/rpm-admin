import { afterEach, expect, it, vi } from 'vitest'

afterEach(() => {
  document
    .querySelectorAll('script[src="/notification-db.js"]')
    .forEach((script) => script.remove())
  vi.unstubAllGlobals()
  vi.resetModules()
})

it('loads the public database using a classic script and shares concurrent requests', async () => {
  vi.stubGlobal('RpmNotifications', undefined)
  const { transaction } = await import('./notifications')
  const first = transaction('settings', 'readonly', (store) => store.get('activeUser'))
  const second = transaction('notifications', 'readonly', (store) => store.getAll())
  const scripts = document.querySelectorAll<HTMLScriptElement>('script[src="/notification-db.js"]')
  expect(scripts).toHaveLength(1)
  expect(scripts[0]!.type).toBe('')
  const notificationTransaction = vi.fn().mockResolvedValue('stored value')
  vi.stubGlobal('RpmNotifications', { notificationTransaction })
  scripts[0]!.dispatchEvent(new Event('load'))
  await expect(first).resolves.toBe('stored value')
  await expect(second).resolves.toBe('stored value')
  expect(notificationTransaction).toHaveBeenCalledTimes(2)
})

it('reports a script loading failure and allows retrying', async () => {
  vi.stubGlobal('RpmNotifications', undefined)
  const { transaction } = await import('./notifications')
  const first = transaction('settings', 'readonly', (store) => store.get('activeUser'))
  const rejected = expect(first).rejects.toThrow('Notification storage could not load')
  document.querySelector('script[src="/notification-db.js"]')!.dispatchEvent(new Event('error'))
  await rejected
  expect(document.querySelector('script[src="/notification-db.js"]')).toBeNull()
  const retry = transaction('settings', 'readonly', (store) => store.get('activeUser'))
  vi.stubGlobal('RpmNotifications', {
    notificationTransaction: vi.fn().mockResolvedValue('user-1'),
  })
  document.querySelector('script[src="/notification-db.js"]')!.dispatchEvent(new Event('load'))
  await expect(retry).resolves.toBe('user-1')
})
