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

it('setup mode (default): shows "Get started", Continue, the note, and the wordmark not a back control', () => {
  render(<FirstRun onContinue={vi.fn()} />)
  expect(screen.getByText('Get started')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /continue/i })).toBeInTheDocument()
  expect(screen.getByText(/no sign-in needed/i)).toBeInTheDocument()
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
  expect(screen.queryByText(/no sign-in needed/i)).not.toBeInTheDocument()

  const backBtn = screen.getByRole('button', { name: /back/i })
  fireEvent.click(backBtn)
  expect(onBack).toHaveBeenCalled()

  fireEvent.click(screen.getByRole('button', { name: /^save$/i }))
  expect(onContinue).toHaveBeenCalledWith(expect.objectContaining({ group: 3, name: 'Jane Roe' }))
})
