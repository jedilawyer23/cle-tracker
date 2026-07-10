// ABOUTME: Verifies AddCertificate uploads, routes to Confirm, and falls back on failure.
// ABOUTME: parseCertificate and fileToBase64 are mocked — no real network/function call happens.
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { AddCertificate } from '../AddCertificate'

vi.mock('../../parsing/parseCertificate', () => ({ parseCertificate: vi.fn() }))
vi.mock('../../parsing/fileToBase64', () => ({
  fileToBase64: vi.fn(async () => ({ fileBase64: 'QUJD', mimeType: 'application/pdf' })),
}))
import { parseCertificate } from '../../parsing/parseCertificate'

const parsed = {
  provider: 'PLI', activityTitle: 'AI Law', completionDate: '2026-06-18',
  totalHours: 1.5, participatory: true, categoryHours: { technology: 1 },
  confidence: { provider: 'high', activityTitle: 'high', completionDate: 'high', totalHours: 'high', participatory: 'low', categoryHours: 'high' },
}

function pickFile() {
  const input = screen.getByLabelText(/certificate/i) as HTMLInputElement
  const file = new File([new Uint8Array([65, 66, 67])], 'cert.pdf', { type: 'application/pdf' })
  fireEvent.change(input, { target: { files: [file] } })
}

it('accepts pdf and images and offers device capture', () => {
  render(<AddCertificate onParsed={vi.fn()} onManual={vi.fn()} />)
  const input = screen.getByLabelText(/certificate/i) as HTMLInputElement
  expect(input.accept).toBe('application/pdf,image/*')
  expect(input.hasAttribute('capture')).toBe(true)
})

it('routes a successful parse into Confirm state with low-confidence flags', async () => {
  ;(parseCertificate as ReturnType<typeof vi.fn>).mockResolvedValue(parsed)
  const onParsed = vi.fn()
  render(<AddCertificate onParsed={onParsed} onManual={vi.fn()} />)
  pickFile()
  await waitFor(() => expect(onParsed).toHaveBeenCalled())
  expect(onParsed.mock.calls[0][0].lowConfidenceFields).toEqual(['participatory'])
})

it('falls back to manual entry with a message on parse failure', async () => {
  ;(parseCertificate as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('unreadable'))
  const onManual = vi.fn()
  render(<AddCertificate onParsed={vi.fn()} onManual={onManual} />)
  pickFile()
  await waitFor(() => expect(onManual).toHaveBeenCalled())
  expect(onManual.mock.calls[0][0]).toMatch(/couldn.?t read|enter.*manually/i)
})
