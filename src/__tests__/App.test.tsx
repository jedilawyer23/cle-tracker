// ABOUTME: Verifies first-run -> dashboard navigation, and adding a credit end to end — both via
// ABOUTME: manual entry and via a (fake) parsed certificate. No real network/function call is made.
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import App from '../App'
import { createCreditStore } from '../store/creditStore'

vi.mock('../parsing/parseCertificate', () => ({ parseCertificate: vi.fn() }))
vi.mock('../parsing/fileToBase64', () => ({
  fileToBase64: vi.fn(async () => ({ fileBase64: 'QUJD', mimeType: 'application/pdf' })),
}))
import { parseCertificate } from '../parsing/parseCertificate'

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

it('adds a credit from the dashboard via manual entry and reflects it', () => {
  render(<App store={createCreditStore(fakeStorage())} today="2026-07-10" />)
  fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Maya Hoffman' } })
  fireEvent.click(screen.getByRole('button', { name: /continue/i }))
  fireEvent.click(screen.getByRole('button', { name: /add a certificate/i }))
  // The Add screen offers upload/capture first; "Enter manually instead" reaches the blank form.
  fireEvent.click(screen.getByRole('button', { name: /enter manually instead/i }))
  fireEvent.change(screen.getByLabelText(/provider/i), { target: { value: 'CEB' } })
  fireEvent.change(screen.getByLabelText(/activity title/i), { target: { value: 'Conflicts of Interest' } })
  fireEvent.change(screen.getByLabelText(/completion date/i), { target: { value: '2026-01-22' } })
  fireEvent.change(screen.getByLabelText(/total hours/i), { target: { value: '4' } })
  fireEvent.change(screen.getByLabelText(/^legal ethics$/i), { target: { value: '4' } })
  fireEvent.click(screen.getByRole('button', { name: /save credit/i }))
  expect(screen.getByText('Complete')).toBeInTheDocument()
  expect(screen.getByText('Legal Ethics')).toBeInTheDocument()
})

it('routes a parsed certificate into Confirm with low-confidence fields flagged, then saves it', async () => {
  ;(parseCertificate as ReturnType<typeof vi.fn>).mockResolvedValue({
    provider: 'Practising Law Institute', activityTitle: 'AI and the Practice of Law',
    completionDate: '2026-06-18', totalHours: 1.5, participatory: true,
    categoryHours: { technology: 1, general: 0.5 },
    confidence: {
      provider: 'high', activityTitle: 'high', completionDate: 'high',
      totalHours: 'high', participatory: 'low', categoryHours: 'high',
    },
  })
  render(<App store={createCreditStore(fakeStorage())} today="2026-07-10" />)
  fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Maya Hoffman' } })
  fireEvent.click(screen.getByRole('button', { name: /continue/i }))
  fireEvent.click(screen.getByRole('button', { name: /add a certificate/i }))

  const fileInput = screen.getByLabelText(/certificate/i) as HTMLInputElement
  const file = new File([new Uint8Array([65, 66, 67])], 'cert.pdf', { type: 'application/pdf' })
  fireEvent.change(fileInput, { target: { files: [file] } })

  await waitFor(() => expect(screen.getByLabelText(/^provider$/i)).toHaveValue('Practising Law Institute'))
  expect(screen.getByText(/couldn.?t read — please confirm/i)).toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', { name: /save credit/i }))
  expect(screen.getByText('Complete')).toBeInTheDocument()
  expect(screen.getByText('Technology')).toBeInTheDocument()
})

it('falls back to a blank Confirm screen with a message when parsing fails', async () => {
  ;(parseCertificate as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('unreadable'))
  render(<App store={createCreditStore(fakeStorage())} today="2026-07-10" />)
  fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Maya Hoffman' } })
  fireEvent.click(screen.getByRole('button', { name: /continue/i }))
  fireEvent.click(screen.getByRole('button', { name: /add a certificate/i }))

  const fileInput = screen.getByLabelText(/certificate/i) as HTMLInputElement
  const file = new File([new Uint8Array([65, 66, 67])], 'cert.pdf', { type: 'application/pdf' })
  fireEvent.change(fileInput, { target: { files: [file] } })

  await waitFor(() => expect(screen.getByText(/couldn.?t read that certificate/i)).toBeInTheDocument())
  expect(screen.getByLabelText(/^provider$/i)).toHaveValue('')
})
