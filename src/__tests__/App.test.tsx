// ABOUTME: Verifies first-run -> dashboard navigation end to end.
import { render, screen, fireEvent } from '@testing-library/react'
import App from '../App'

it('goes from first run to the dashboard', () => {
  render(<App />)
  fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Maya Hoffman' } })
  fireEvent.click(screen.getByRole('button', { name: /continue/i }))
  expect(screen.getByText(/Legal Ethics/)).toBeInTheDocument()
})
