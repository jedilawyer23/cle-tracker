// ABOUTME: Verifies first-run -> dashboard navigation, and adding a credit end to end.
import { render, screen, fireEvent } from '@testing-library/react'
import App from '../App'
import { createCreditStore } from '../store/creditStore'

it('goes from first run to the dashboard', () => {
  render(<App store={createCreditStore(fakeStorage())} />)
  fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Maya Hoffman' } })
  fireEvent.click(screen.getByRole('button', { name: /continue/i }))
  expect(screen.getByText(/Legal Ethics/)).toBeInTheDocument()
})

function fakeStorage(): Storage {
  const map = new Map<string, string>()
  return {
    get length() { return map.size }, clear: () => map.clear(),
    getItem: (k) => map.get(k) ?? null, key: (i) => [...map.keys()][i] ?? null,
    removeItem: (k) => { map.delete(k) }, setItem: (k, v) => { map.set(k, v) },
  }
}

it('adds a credit from the dashboard and reflects it', () => {
  render(<App store={createCreditStore(fakeStorage())} today="2026-07-10" />)
  fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Maya Hoffman' } })
  fireEvent.click(screen.getByRole('button', { name: /continue/i }))
  fireEvent.click(screen.getByRole('button', { name: /add a certificate/i }))
  fireEvent.change(screen.getByLabelText(/provider/i), { target: { value: 'CEB' } })
  fireEvent.change(screen.getByLabelText(/activity title/i), { target: { value: 'Conflicts of Interest' } })
  fireEvent.change(screen.getByLabelText(/completion date/i), { target: { value: '2026-01-22' } })
  fireEvent.change(screen.getByLabelText(/total hours/i), { target: { value: '4' } })
  fireEvent.change(screen.getByLabelText(/^legal ethics$/i), { target: { value: '4' } })
  fireEvent.click(screen.getByRole('button', { name: /save credit/i }))
  expect(screen.getByText('Complete')).toBeInTheDocument()
  expect(screen.getByText('Legal Ethics')).toBeInTheDocument()
})
