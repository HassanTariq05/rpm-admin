import { useEffect, useState } from 'react'
export function useScanExpiry(expiresAt?: string, active = true) {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    if (!expiresAt || !active || Date.parse(expiresAt) <= Date.now()) return
    const timer = setInterval(() => {
      const current = Date.now()
      setNow(current)
      if (current >= Date.parse(expiresAt)) clearInterval(timer)
    }, 1000)
    return () => clearInterval(timer)
  }, [expiresAt, active])
  const seconds = expiresAt
    ? Math.max(0, Math.ceil((Date.parse(expiresAt) - Math.max(now, Date.now())) / 1000))
    : 0
  return {
    expired: !!expiresAt && seconds === 0,
    remaining: `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`,
  }
}
