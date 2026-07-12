// ABOUTME: Verifies FirstRun derives and shows the requirement, and continues.
import { render, screen, fireEvent } from '@testing-library/react'
import { FirstRun } from '../FirstRun'

it('derives group from the entered name and continues', () => {
  const onContinue = vi.fn()
  render(<FirstRun onContinue={onContinue} />)
  fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Maya Hoffman' } })
  expect(screen.getByText(/Group 2/)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /continue/i }))
  expect(onContinue).toHaveBeenCalledWith(expect.objectContaining({ group: 2, name: 'Maya Hoffman' }))
})

it('disables Continue when the name has no letters', () => {
  render(<FirstRun onContinue={vi.fn()} />)
  fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: '123' } })
  expect(screen.getByRole('button', { name: /continue/i })).toBeDisabled()
})

// Carry-forward (M1 review, item 3): onboarding must show the "not legal advice" disclaimer.
it('shows the not-legal-advice disclaimer', () => {
  render(<FirstRun onContinue={vi.fn()} />)
  expect(screen.getByText(/not legal advice/i)).toBeInTheDocument()
})

it('setup mode (default): shows the value headline, the instruction, Continue, the note, and the wordmark not a back control', () => {
  render(<FirstRun onContinue={vi.fn()} />)
  expect(screen.getByText(/your california mcle, tracked/i)).toBeInTheDocument()
  expect(screen.getByText(/enter your name and we'll look up your/i)).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument()
  expect(screen.getByText(/sign in with Google later/i)).toBeInTheDocument()
  expect(document.querySelector('.brand')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /back/i })).not.toBeInTheDocument()
})

it('edit mode: prefills the name, shows "Edit name"/Save/Back, and hides the sign-in note', () => {
  const onContinue = vi.fn()
  const onBack = vi.fn()
  render(<FirstRun mode="edit" initialName="Jane Roe" onBack={onBack} onContinue={onContinue} />)

  expect(screen.getByText('Edit name')).toBeInTheDocument()
  expect(screen.getByLabelText(/full name/i)).toHaveValue('Jane Roe')
  expect(screen.getByRole('button', { name: /^save$/i })).toBeInTheDocument()
  expect(screen.queryByText(/sign in with Google later/i)).not.toBeInTheDocument()

  const backBtn = screen.getByRole('button', { name: /back/i })
  fireEvent.click(backBtn)
  expect(onBack).toHaveBeenCalled()

  fireEvent.click(screen.getByRole('button', { name: /^save$/i }))
  expect(onContinue).toHaveBeenCalledWith(expect.objectContaining({ group: 3, name: 'Jane Roe' }))
})

// Surname derivation can be wrong (unusual name formats, uncommon particles) — a manual
// override lets the user correct it, and the correction flows through exactly like a derived group.
it('lets the user override a wrongly-derived group, updating the requirement preview and onContinue', () => {
  const onContinue = vi.fn()
  const { container } = render(<FirstRun onContinue={onContinue} today="2026-07-10" />)
  fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Maya Hoffman' } })
  const requirementList = () => { const lists = container.querySelectorAll('.list'); return lists[lists.length - 1] }
  expect(requirementList()).toHaveTextContent(/Group 2/)

  fireEvent.click(screen.getByRole('button', { name: /not group 2\? change/i }))
  fireEvent.click(screen.getByRole('button', { name: /^group 1/i }))

  expect(requirementList()).toHaveTextContent(/Group 1/)
  expect(requirementList()).not.toHaveTextContent(/Group 2/)

  fireEvent.click(screen.getByRole('button', { name: /continue/i }))
  expect(onContinue).toHaveBeenCalledWith(expect.objectContaining({
    group: 1, name: 'Maya Hoffman',
    period: { start: '2025-02-01', end: '2028-03-29', reportBy: '2028-03-30' },
  }))
})
