import { useState } from 'react'
import { Button, Dialog, DialogTrigger, Heading, Popover } from 'react-aria-components'
import { Bell, CheckCheck, ChevronRight, Inbox, Loader2, Send, Settings2, X } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { translate as t, useAppTranslation, locale } from '@/i18n'
import {
  enablePush,
  getNotificationWorker,
  sendTestNotification,
  vapidPublicKey,
} from './notifications'
import { useNotifications } from './use-notifications'
import './notifications.css'

export function NotificationPanel() {
  useAppTranslation()
  const {
    userId,
    items,
    error,
    setError,
    permission,
    setPermission,
    supportError,
    refresh,
    mutate,
  } = useNotifications()
  const navigate = useNavigate()
  const [tab, setTab] = useState<'all' | 'unread'>('all')
  const [settings, setSettings] = useState(false)
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState('')
  const unread = items.filter((item) => !item.read).length
  const visible = tab === 'unread' ? items.filter((item) => !item.read) : items

  const run = async (action: () => Promise<void>) => {
    setBusy(true)
    setError('')
    setFeedback('')
    try {
      await action()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('Unable to complete this action.'))
    } finally {
      setBusy(false)
      if ('Notification' in window) setPermission(Notification.permission)
    }
  }

  return (
    <DialogTrigger>
      <Button
        className="notification-trigger"
        aria-label={t('Notifications') + (unread ? ` (${unread} ${t('unread')})` : '')}
      >
        <Bell size={18} aria-hidden="true" />
        {unread > 0 ? (
          <span className="notification-count">{unread > 99 ? '99+' : unread}</span>
        ) : null}
      </Button>
      <Popover placement="bottom end" offset={10} className="notification-popover">
        <Dialog className="notification-dialog">
          {({ close }) => (
            <>
              <div className="notification-heading">
                <div>
                  <Heading slot="title">{t('Notifications')}</Heading>
                  <p>
                    {unread} {t('unread updates')}
                  </p>
                </div>
                <Button
                  aria-label={t('Notification settings and testing')}
                  className="notification-icon"
                  onPress={() => setSettings(!settings)}
                >
                  <Settings2 size={17} />
                </Button>
                <Button
                  aria-label={t('Close notifications')}
                  className="notification-icon"
                  onPress={close}
                >
                  <X size={18} />
                </Button>
              </div>
              <div className="notification-tabs">
                <div role="group" aria-label={t('Filter notifications')}>
                  <Button aria-pressed={tab === 'all'} onPress={() => setTab('all')}>
                    {t('All')}
                  </Button>
                  <Button aria-pressed={tab === 'unread'} onPress={() => setTab('unread')}>
                    {t('Unread')} {unread > 0 ? `(${unread})` : ''}
                  </Button>
                </div>
                <Button
                  className="notification-text-action"
                  isDisabled={unread === 0 || busy}
                  onPress={() => void run(() => mutate('read'))}
                >
                  <CheckCheck size={14} />
                  {t('Mark all read')}
                </Button>
              </div>
              {settings ? (
                <div className="notification-settings">
                  <strong>{t('Browser notifications')}</strong>
                  <p>
                    {supportError
                      ? t(supportError)
                      : permission === 'granted'
                        ? t('Permission granted. You can test browser notifications.')
                        : permission === 'denied'
                          ? t(
                              'Notifications are blocked. Allow them in your browser’s site settings, then try again.',
                            )
                          : t('Allow notifications to receive updates outside this app.')}
                  </p>
                  {!supportError ? (
                    <Button
                      className="notification-primary"
                      isDisabled={busy || !userId}
                      onPress={() =>
                        void run(async () => {
                          const subscription = await enablePush()
                          setFeedback(
                            subscription
                              ? t(
                                  'Browser subscribed. Copy the subscription for backend integration.',
                                )
                              : t(
                                  'Permission enabled. Local tests are ready; remote delivery needs backend setup.',
                                ),
                          )
                        })
                      }
                    >
                      {busy ? <Loader2 size={14} className="animate-spin" /> : <Bell size={14} />}
                      {t(
                        permission === 'granted' && vapidPublicKey
                          ? 'Set up push subscription'
                          : 'Enable browser notifications',
                      )}
                    </Button>
                  ) : null}
                  <div className="notification-test-actions">
                    <Button
                      isDisabled={busy || !!supportError || !userId || permission !== 'granted'}
                      onPress={() =>
                        void run(async () => {
                          await sendTestNotification(userId!, true)
                          await refresh()
                          setFeedback(
                            t(
                              'Test sent to your browser and inbox. Check your system notification center.',
                            ),
                          )
                        })
                      }
                    >
                      <Send size={14} />
                      {t('Test browser push')}
                    </Button>
                    <Button
                      isDisabled={busy || !!supportError || !userId}
                      onPress={() =>
                        void run(async () => {
                          await sendTestNotification(userId!, false)
                          await refresh()
                          setFeedback(t('Test added to your inbox.'))
                        })
                      }
                    >
                      {t('Test inbox')}
                    </Button>
                  </div>
                  <p>
                    {t(
                      'Tests run locally through the service worker. Remote push delivery requires a backend.',
                    )}
                  </p>
                  {vapidPublicKey && !supportError ? (
                    <Button
                      className="notification-text-action"
                      isDisabled={busy}
                      onPress={() =>
                        void run(async () => {
                          const subscription = await (
                            await getNotificationWorker()
                          ).pushManager.getSubscription()
                          if (!subscription) throw new Error(t('Set up a push subscription first.'))
                          await navigator.clipboard.writeText(
                            JSON.stringify(
                              { userId, subscription: subscription.toJSON() },
                              null,
                              2,
                            ),
                          )
                          setFeedback(t('Subscription copied.'))
                        })
                      }
                    >
                      {t('Copy push subscription')}
                    </Button>
                  ) : null}
                </div>
              ) : null}
              {error ? (
                <p className="notification-message notification-error" role="alert">
                  {t(error)}
                </p>
              ) : null}
              {feedback ? (
                <p className="notification-message" role="status">
                  {t(feedback)}
                </p>
              ) : null}
              <div className="notification-list">
                {visible.length === 0 ? (
                  <div className="notification-empty">
                    <span>
                      <Inbox size={25} />
                    </span>
                    <strong>
                      {t(tab === 'unread' ? 'You’re all caught up' : 'No notifications yet')}
                    </strong>
                    <p>{t('Updates will appear here when they arrive.')}</p>
                    <Button className="notification-text-action" onPress={() => setSettings(true)}>
                      {t('Set up & test notifications')}
                      <ChevronRight size={14} />
                    </Button>
                  </div>
                ) : (
                  <ul>
                    {visible.map((item) => (
                      <li key={item.key} data-unread={!item.read}>
                        <Button
                          className="notification-item"
                          isDisabled={busy}
                          onPress={() =>
                            void run(async () => {
                              await mutate('read', item.key)
                              close()
                              void navigate({ href: item.url })
                            })
                          }
                        >
                          <span className="notification-item-icon">
                            <Bell size={16} />
                          </span>
                          <span className="notification-item-copy">
                            <strong>{item.test ? t(item.title) : item.title}</strong>
                            <span>{item.test ? t(item.body) : item.body}</span>
                            <small>
                              {item.test ? `${t('Test')} · ` : ''}
                              {new Intl.DateTimeFormat(locale(), {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              }).format(new Date(item.createdAt))}
                            </small>
                          </span>
                          {!item.read ? (
                            <span className="notification-unread-dot" aria-label={t('Unread')} />
                          ) : null}
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="notification-footer">
                <span>
                  {t('Recent updates')} · {items.length}/100
                </span>
                <Button
                  className="notification-text-action"
                  isDisabled={!items.length || busy}
                  onPress={() => void run(() => mutate('clear'))}
                >
                  {t('Clear all')}
                </Button>
              </div>
            </>
          )}
        </Dialog>
      </Popover>
    </DialogTrigger>
  )
}
