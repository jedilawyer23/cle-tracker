// ABOUTME: Verifies useBulkParse wires the single-cert path into the bulk orchestrator, including the
// ABOUTME: size guard. parseCertificate/fileToBase64 are mocked — no real network.
import { describe, it, expect, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useBulkParse } from '../useBulkParse'

vi.mock('../parseCertificate', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../parseCertificate')>()),
  parseCertificate: vi.fn(), // keep the real error classes, mock only the call
}))
vi.mock('../fileToBase64', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../fileToBase64')>()), // keep the real size cap/check
  fileToBase64: vi.fn(async () => ({ fileBase64: 'QUJD', mimeType: 'application/pdf' })),
}))
import { parseCertificate, NotACleCertificateError } from '../parseCertificate'
import { fileToBase64, MAX_FILE_BYTES } from '../fileToBase64'

const parsed = {
  provider: 'PLI', activityTitle: 'AI Law', completionDate: '2026-06-18',
  totalHours: 1.5, participatory: true, categoryHours: { technology: 1 },
  confidence: { provider: 'high', activityTitle: 'high', completionDate: 'high', totalHours: 'high', participatory: 'low', categoryHours: 'high' },
}

function file() {
  return new File([new Uint8Array([65, 66, 67])], 'cert.pdf', { type: 'application/pdf' })
}

describe('useBulkParse', () => {
  it('parses a picked file and exposes it as parsed', async () => {
    ;(parseCertificate as ReturnType<typeof vi.fn>).mockResolvedValue(parsed)
    const { result } = renderHook(() => useBulkParse())
    await act(async () => { await result.current.run([file()]) })
    expect(result.current.items.map(i => i.status)).toEqual(['parsed'])
    expect(result.current.items[0].parsed).toEqual(parsed)
  })

  it('reports a friendly message for a generic parse failure, not the raw error', async () => {
    ;(parseCertificate as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('internal'))
    const { result } = renderHook(() => useBulkParse())
    await act(async () => { await result.current.run([file()]) })
    expect(result.current.items[0].status).toBe('error')
    expect(result.current.items[0].error).toMatch(/couldn.?t read|enter.*manually/i)
    expect(result.current.items[0].error).not.toMatch(/internal/)
  })

  it('still skips a non-certificate rather than treating it as an error', async () => {
    ;(parseCertificate as ReturnType<typeof vi.fn>).mockRejectedValue(new NotACleCertificateError())
    const { result } = renderHook(() => useBulkParse())
    await act(async () => { await result.current.run([file()]) })
    expect(result.current.items[0].status).toBe('skipped')
  })

  it('marks an oversized file as an error without calling the parse path', async () => {
    ;(fileToBase64 as ReturnType<typeof vi.fn>).mockClear()
    ;(parseCertificate as ReturnType<typeof vi.fn>).mockClear()
    const { result } = renderHook(() => useBulkParse())
    const huge = new File([new Uint8Array(MAX_FILE_BYTES + 1)], 'cert.pdf', { type: 'application/pdf' })
    await act(async () => { await result.current.run([huge]) })
    expect(result.current.items[0].status).toBe('error')
    expect(result.current.items[0].error).toMatch(/too large/i)
    expect(fileToBase64).not.toHaveBeenCalled()
    expect(parseCertificate).not.toHaveBeenCalled()
  })
})
