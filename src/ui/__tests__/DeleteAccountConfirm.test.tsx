// ABOUTME: Component tests for the delete-account confirmation screen — the credit count in its
// ABOUTME: warning copy, Cancel/Delete firing their callbacks, and the busy/error states.
import { render, screen, fireEvent } from '@testing-library/react'
import { it, expect, vi } from 'vitest'
import { DeleteAccountConfirm } from '../DeleteAccountConfirm'

it('states how many credits will be permanently deleted', () => {
  render(<DeleteAccountConfirm creditsCount={7} onCancel={() => {}} onConfirm={() => {}} />)
  expect(screen.getByText(/permanently deletes your profile and all 7 logged credits/i)).toBeInTheDocument()
  expect(screen.getByText(/can.?t be undone/i)).toBeInTheDocument()
})

it('singularizes "credit" for exactly one', () => {
  render(<DeleteAccountConfirm creditsCount={1} onCancel={() => {}} onConfirm={() => {}} />)
  expect(screen.getByText(/all 1 logged credit\b/i)).toBeInTheDocument()
})

it('fires onCancel from the Cancel control', () => {
  const onCancel = vi.fn()
  render(<DeleteAccountConfirm creditsCount={0} onCancel={onCancel} onConfirm={() => {}} />)
  fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }))
  expect(onCancel).toHaveBeenCalledTimes(1)
})

it('fires onConfirm from the destructive Delete control', () => {
  const onConfirm = vi.fn()
  render(<DeleteAccountConfirm creditsCount={0} onCancel={() => {}} onConfirm={onConfirm} />)
  fireEvent.click(screen.getByRole('button', { name: /delete account/i }))
  expect(onConfirm).toHaveBeenCalledTimes(1)
})

it('disables Delete and shows a busy label while a delete is in flight', () => {
  render(<DeleteAccountConfirm creditsCount={0} busy onCancel={() => {}} onConfirm={() => {}} />)
  expect(screen.getByRole('button', { name: /deleting/i })).toBeDisabled()
})

it('surfaces a failure message instead of failing silently', () => {
  render(
    <DeleteAccountConfirm
      creditsCount={0}
      error="Something went wrong — please try again."
      onCancel={() => {}}
      onConfirm={() => {}}
    />,
  )
  expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
})
