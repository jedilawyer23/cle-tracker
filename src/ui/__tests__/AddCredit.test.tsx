// ABOUTME: Tests that the Add screen saves an entered credit via onSave, and that it can also be
// ABOUTME: seeded from a parsed certificate draft (with low-confidence flags) or a fallback message.
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

it('seeds the form from a parsed draft and flags low-confidence fields', () => {
  const onSave = vi.fn(); const onBack = vi.fn()
  render(
    <AddCredit
      onSave={onSave}
      onBack={onBack}
      initial={{
        provider: 'PLI', activityTitle: 'AI Law', completionDate: '2026-06-18',
        totalHours: 1.5, participatory: true, categoryHours: { technology: 1 },
      }}
      lowConfidenceFields={['participatory']}
    />
  )
  expect(screen.getByLabelText(/^provider$/i)).toHaveValue('PLI')
  expect(screen.getByText(/couldn.?t read — please confirm/i)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /save credit/i }))
  expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ provider: 'PLI', totalHours: 1.5 }))
})

it('shows the fallback message when a parse failed', () => {
  render(<AddCredit onSave={vi.fn()} onBack={vi.fn()} message="We couldn't read that certificate. Enter the details manually." />)
  expect(screen.getByText(/we couldn.?t read that certificate/i)).toBeInTheDocument()
})

it('shows the sign-in button to the right of the back control in the existing topline', () => {
  const onSignIn = vi.fn()
  const { container } = render(
    <AddCredit onSave={vi.fn()} onBack={vi.fn()} accountState="guest" onSignIn={onSignIn} />,
  )
  const topline = container.querySelector('.topline')!
  const backBtn = topline.querySelector('.back')!
  const navBtn = topline.querySelector('.navbtn')!
  expect(navBtn).toHaveTextContent(/sign in to save/i)
  // Back control comes before the sign-in button in DOM order (sp spacer pushes it right).
  expect(backBtn.compareDocumentPosition(navBtn) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  fireEvent.click(navBtn)
  expect(onSignIn).toHaveBeenCalled()
})

it('hides the sign-in button once linked', () => {
  const { container } = render(
    <AddCredit onSave={vi.fn()} onBack={vi.fn()} accountState="linked" onSignIn={vi.fn()} />,
  )
  expect(container.querySelector('.navbtn')).not.toBeInTheDocument()
})

it('renders the signInMessage note inside the wrap', () => {
  render(
    <AddCredit onSave={vi.fn()} onBack={vi.fn()} accountState="guest" onSignIn={vi.fn()}
      signInMessage="Saved to your Google account." />,
  )
  expect(screen.getByText('Saved to your Google account.')).toBeInTheDocument()
})

it('warns when the entered date falls outside the passed-through currentPeriod', () => {
  render(
    <AddCredit onSave={vi.fn()} onBack={vi.fn()}
      currentPeriod={{ start: '2024-02-01', end: '2027-03-29', reportBy: '2027-03-30' }} />,
  )
  fireEvent.change(screen.getByLabelText(/completion date/i), { target: { value: '2023-01-01' } })
  expect(screen.getByText(/different reporting cycle/i)).toBeInTheDocument()
})
