// ABOUTME: Tests that the Add screen saves an entered credit via onSave.
import { it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AddCredit } from '../AddCredit'

it('saves an entered credit', () => {
  const onSave = vi.fn(); const onBack = vi.fn()
  render(<AddCredit onSave={onSave} onBack={onBack} />)
  fireEvent.change(screen.getByLabelText(/provider/i), { target: { value: 'CEB' } })
  fireEvent.change(screen.getByLabelText(/activity title/i), { target: { value: 'Ethics' } })
  fireEvent.change(screen.getByLabelText(/completion date/i), { target: { value: '2026-01-22' } })
  fireEvent.change(screen.getByLabelText(/total hours/i), { target: { value: '2' } })
  fireEvent.click(screen.getByRole('button', { name: /save credit/i }))
  expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ provider: 'CEB', totalHours: 2 }))
})
