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
