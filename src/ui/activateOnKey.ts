// ABOUTME: Keyboard handler for div-based tap targets — fires on Enter or Space, matching the
// ABOUTME: activation keys a native <button> already supports, so keyboard users can operate them too.
import type { KeyboardEvent } from 'react'

export function activateOnKey(handler: () => void) {
  return (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handler()
    }
  }
}
