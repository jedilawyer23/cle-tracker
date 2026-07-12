// ABOUTME: Minimal accessible toast for transient status messages (e.g. a failed write) —
// ABOUTME: announced via a polite live region and dismissed automatically after its duration.
import { useEffect } from 'react'

interface Props {
  message: string | null
  onDismiss: () => void
  duration?: number
}

export function ToastView({ message, onDismiss, duration = 4000 }: Props) {
  useEffect(() => {
    if (!message) return
    const timer = setTimeout(onDismiss, duration)
    return () => clearTimeout(timer)
  }, [message, duration, onDismiss])

  if (!message) return null

  return (
    <div className="toast" role="status" aria-live="polite">
      {message}
    </div>
  )
}
