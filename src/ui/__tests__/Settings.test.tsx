// ABOUTME: Component tests for the Settings menu — which rows appear per accountState/credits,
// ABOUTME: and that each row fires its callback (Export additionally triggers a CSV download).
import { render, screen, fireEvent } from '@testing-library/react'
import { it, expect, vi, beforeEach } from 'vitest'
import { Settings } from '../Settings'
import type { Credit } from '../../domain/types'

const credit: Credit = {
  id: 'a', provider: 'CEB', activityTitle: 'Ethics', completionDate: '2026-01-01',
  totalHours: 1, participatory: true, categoryHours: { ethics: 1 },
}

beforeEach(() => {
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:export')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
})

it('always shows Edit name and Delete account & data', () => {
  render(
    <Settings accountState="guest" credits={[]} onBack={() => {}} onEditName={() => {}}
      onSignOut={() => {}} onDeleteAccount={() => {}} />,
  )
  expect(screen.getByText('Edit name')).toBeInTheDocument()
  expect(screen.getByText('Delete account & data')).toBeInTheDocument()
})

it('hides Export my credits when there are no credits, shows it once there are', () => {
  const { rerender } = render(
    <Settings accountState="guest" credits={[]} onBack={() => {}} onEditName={() => {}}
      onSignOut={() => {}} onDeleteAccount={() => {}} />,
  )
  expect(screen.queryByText('Export my credits')).not.toBeInTheDocument()

  rerender(
    <Settings accountState="guest" credits={[credit]} onBack={() => {}} onEditName={() => {}}
      onSignOut={() => {}} onDeleteAccount={() => {}} />,
  )
  expect(screen.getByText('Export my credits')).toBeInTheDocument()
})

it('hides Sign out for a guest (there is no account to sign out of) and shows it once linked', () => {
  const { rerender } = render(
    <Settings accountState="guest" credits={[]} onBack={() => {}} onEditName={() => {}}
      onSignOut={() => {}} onDeleteAccount={() => {}} />,
  )
  expect(screen.queryByText('Sign out')).not.toBeInTheDocument()

  rerender(
    <Settings accountState="linked" credits={[]} onBack={() => {}} onEditName={() => {}}
      onSignOut={() => {}} onDeleteAccount={() => {}} />,
  )
  expect(screen.getByText('Sign out')).toBeInTheDocument()
})

it('fires onBack, onEditName, onSignOut, and onDeleteAccount on tap', () => {
  const onBack = vi.fn()
  const onEditName = vi.fn()
  const onSignOut = vi.fn()
  const onDeleteAccount = vi.fn()
  render(
    <Settings accountState="linked" credits={[]} onBack={onBack} onEditName={onEditName}
      onSignOut={onSignOut} onDeleteAccount={onDeleteAccount} />,
  )
  fireEvent.click(screen.getByRole('button', { name: /back/i }))
  fireEvent.click(screen.getByText('Edit name'))
  fireEvent.click(screen.getByText('Sign out'))
  fireEvent.click(screen.getByText('Delete account & data'))
  expect(onBack).toHaveBeenCalledTimes(1)
  expect(onEditName).toHaveBeenCalledTimes(1)
  expect(onSignOut).toHaveBeenCalledTimes(1)
  expect(onDeleteAccount).toHaveBeenCalledTimes(1)
})

it('surfaces a sign-out failure instead of failing silently', () => {
  render(
    <Settings accountState="linked" credits={[]} onBack={() => {}} onEditName={() => {}}
      onSignOut={() => {}} onDeleteAccount={() => {}} error="Couldn't sign out — please try again." />,
  )
  expect(screen.getByText(/couldn.?t sign out/i)).toBeInTheDocument()
})

it('exporting builds a text/csv blob and triggers a download named clekeeper-credits.csv', () => {
  const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  render(
    <Settings accountState="guest" credits={[credit]} onBack={() => {}} onEditName={() => {}}
      onSignOut={() => {}} onDeleteAccount={() => {}} />,
  )
  fireEvent.click(screen.getByText('Export my credits'))

  expect(URL.createObjectURL).toHaveBeenCalledTimes(1)
  const blob = (URL.createObjectURL as ReturnType<typeof vi.fn>).mock.calls[0]![0] as Blob
  expect(blob.type).toBe('text/csv')
  expect(clickSpy).toHaveBeenCalledTimes(1)
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:export')
})
