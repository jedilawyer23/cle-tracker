// ABOUTME: Minimal accessible toast for transient status messages (e.g. a failed write) —
// ABOUTME: announced via a polite live region and dismissed automatically after its duration.
import { useEffect, useRef } from 'react'

interface Props {
  message: string | null
  onDismiss: () => void
  duration?: number
}

export function ToastView({ message, onDismiss, duration = 4000 }: Props) {
  // Held in a ref so callers can pass an inline arrow without the effect (and its dismiss timer)
  // restarting on every unrelated parent re-render — the timer resets only when message/duration do.
  const onDismissRef = useRef(onDismiss)
  onDismissRef.current = onDismiss

  useEffect(() => {
    if (!message) return
    const timer = setTimeout(() => onDismissRef.current(), duration)
    return () => clearTimeout(timer)
  }, [message, duration])

  if (!message) return null

  return (
    <div className="toast" role="status" aria-live="polite">
      {message}
    </div>
  )
}
