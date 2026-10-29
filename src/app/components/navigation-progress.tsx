import { useEffect, useState } from 'react'
import { router } from '@/router'

export function NavigationProgress() {
  const [visible, setVisible] = useState(false)
  const [complete, setComplete] = useState(false)

  useEffect(() => {
    let hideTimer: ReturnType<typeof setTimeout> | undefined

    const unsubscribeBeforeNavigate = router.subscribe('onBeforeNavigate', () => {
      if (hideTimer) clearTimeout(hideTimer)

      setComplete(false)
      setVisible(true)
    })

    const unsubscribeResolved = router.subscribe('onResolved', () => {
      setComplete(true)

      hideTimer = setTimeout(() => {
        setVisible(false)
        setComplete(false)
      }, 180)
    })

    return () => {
      unsubscribeBeforeNavigate()
      unsubscribeResolved()

      if (hideTimer) clearTimeout(hideTimer)
    }
  }, [])

  if (!visible) return null

  return (
    <div className="navigation-progress-track" aria-hidden="true">
      <div
        className={`navigation-progress-bar ${complete ? 'navigation-progress-bar-complete' : ''}`}
      />
    </div>
  )
}
