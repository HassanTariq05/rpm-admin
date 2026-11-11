import { useEffect } from 'react'
import { useAuthStore } from '@/stores/auth-store'

export const inactivityTimeoutMs = 120_000

export function useIdleLogout(enabled: boolean) {
  const token = useAuthStore((state) => state.auth.accessToken)
  useEffect(() => {
    if (!enabled || !token) return
    let lastActivity = Date.now()
    let timer: ReturnType<typeof setTimeout>
    const expire = () => {
      if (useAuthStore.getState().auth.accessToken === token)
        useAuthStore.getState().auth.expireSession('inactivity')
    }
    const check = () => {
      const remaining = inactivityTimeoutMs - (Date.now() - lastActivity)
      if (remaining <= 0) expire()
      else timer = setTimeout(check, remaining)
    }
    const activity = () => {
      // Do not revive an expired session when a throttled/background tab wakes.
      if (Date.now() - lastActivity >= inactivityTimeoutMs) expire()
      else lastActivity = Date.now()
    }
    const visibility = () => {
      if (
        document.visibilityState === 'visible' &&
        Date.now() - lastActivity >= inactivityTimeoutMs
      )
        expire()
    }
    const events = ['pointerdown', 'pointermove', 'keydown', 'scroll', 'touchstart'] as const
    for (const event of events)
      window.addEventListener(event, activity, { passive: true, capture: true })
    window.addEventListener('focus', visibility)
    document.addEventListener('visibilitychange', visibility)
    timer = setTimeout(check, inactivityTimeoutMs)
    return () => {
      clearTimeout(timer)
      for (const event of events) window.removeEventListener(event, activity, true)
      window.removeEventListener('focus', visibility)
      document.removeEventListener('visibilitychange', visibility)
    }
  }, [enabled, token])
}
