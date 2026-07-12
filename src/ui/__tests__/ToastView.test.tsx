// ABOUTME: Tests the minimal accessible toast — announced via aria-live, hidden when there's no
// ABOUTME: message, and auto-dismissing after its duration.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ToastView } from '../ToastView'

beforeEach(() => { vi.useFakeTimers() })
afterEach(() => { vi.useRealTimers() })

describe('ToastView', () => {
  it('renders nothing when there is no message', () => {
    const { container } = render(<ToastView message={null} onDismiss={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('announces the message via a status live region', () => {
    render(<ToastView message="Couldn't save this credit — please try again." onDismiss={vi.fn()} />)
    const status = screen.getByRole('status')
    expect(status).toHaveTextContent(/couldn.?t save this credit/i)
    expect(status).toHaveAttribute('aria-live', 'polite')
  })

  it('auto-dismisses after its duration', () => {
    const onDismiss = vi.fn()
    render(<ToastView message="Something went wrong." onDismiss={onDismiss} duration={4000} />)
    expect(onDismiss).not.toHaveBeenCalled()
    vi.advanceTimersByTime(3999)
    expect(onDismiss).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('resets its dismiss timer when the message changes', () => {
    const onDismiss = vi.fn()
    const { rerender } = render(<ToastView message="First." onDismiss={onDismiss} duration={4000} />)
    vi.advanceTimersByTime(3000)
    rerender(<ToastView message="Second." onDismiss={onDismiss} duration={4000} />)
    vi.advanceTimersByTime(3000)
    expect(onDismiss).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1000)
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  // Call sites pass an inline `onDismiss` arrow, so a fresh function identity arrives on every
  // parent re-render — the dismiss timer must not restart just because an unrelated parent state
  // change re-rendered while the toast is up, or it could linger well past its duration.
  it('does not reset its timer when the parent re-renders with a new onDismiss but the same message', () => {
    const onDismiss = vi.fn()
    const { rerender } = render(<ToastView message="Same." onDismiss={() => onDismiss()} duration={4000} />)
    vi.advanceTimersByTime(3000)
    rerender(<ToastView message="Same." onDismiss={() => onDismiss()} duration={4000} />)
    vi.advanceTimersByTime(1000)
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })
})
