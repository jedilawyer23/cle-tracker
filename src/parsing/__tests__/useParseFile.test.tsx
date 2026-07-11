// ABOUTME: Verifies useParseFile reads a picked file, parses it, and reports a Confirm-screen
// ABOUTME: seed or a fallback message. parseCertificate/fileToBase64 are mocked — no real network.
import { describe, it, expect, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { useParseFile } from '../useParseFile'

vi.mock('../parseCertificate', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../parseCertificate')>()),
  parseCertificate: vi.fn(), // keep the real NotACleCertificateError class, mock only the call
}))
vi.mock('../fileToBase64', () => ({
  fileToBase64: vi.fn(async () => ({ fileBase64: 'QUJD', mimeType: 'application/pdf' })),
}))
import { parseCertificate, NotACleCertificateError } from '../parseCertificate'

const parsed = {
  provider: 'PLI', activityTitle: 'AI Law', completionDate: '2026-06-18',
  totalHours: 1.5, participatory: true, categoryHours: { technology: 1 },
  confidence: { provider: 'high', activityTitle: 'high', completionDate: 'high', totalHours: 'high', participatory: 'low', categoryHours: 'high' },
}

function file() {
  return new File([new Uint8Array([65, 66, 67])], 'cert.pdf', { type: 'application/pdf' })
}

describe('useParseFile', () => {
  it('is not busy before a file is parsed', () => {
    const { result } = renderHook(() => useParseFile(vi.fn(), vi.fn()))
    expect(result.current.busy).toBe(false)
  })

  it('reports the parsed Confirm state and clears busy on success', async () => {
    ;(parseCertificate as ReturnType<typeof vi.fn>).mockResolvedValue(parsed)
    const onParsed = vi.fn()
    const { result } = renderHook(() => useParseFile(onParsed, vi.fn()))
    await act(async () => { await result.current.parseFile(file()) })
    expect(onParsed).toHaveBeenCalledWith(expect.objectContaining({ lowConfidenceFields: ['participatory'] }))
    expect(result.current.busy).toBe(false)
  })

  it('reports a fallback message and clears busy on failure', async () => {
    ;(parseCertificate as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('unreadable'))
    const onError = vi.fn()
    const { result } = renderHook(() => useParseFile(vi.fn(), onError))
    await act(async () => { await result.current.parseFile(file()) })
    expect(onError).toHaveBeenCalledWith(expect.stringMatching(/couldn.?t read|enter.*manually/i))
    expect(result.current.busy).toBe(false)
  })

  it('reports a "not a CLE certificate" message when the upload is rejected as such', async () => {
    ;(parseCertificate as ReturnType<typeof vi.fn>).mockRejectedValue(new NotACleCertificateError())
    const onError = vi.fn()
    const { result } = renderHook(() => useParseFile(vi.fn(), onError))
    await act(async () => { await result.current.parseFile(file()) })
    expect(onError).toHaveBeenCalledWith(expect.stringMatching(/doesn.?t look like a CLE certificate/i))
    expect(result.current.busy).toBe(false)
  })

  it('is busy while a parse is in flight', async () => {
    let resolveParse: (v: unknown) => void = () => {}
    ;(parseCertificate as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(resolve => { resolveParse = resolve }))
    const { result } = renderHook(() => useParseFile(vi.fn(), vi.fn()))
    let inFlight: Promise<void> = Promise.resolve()
    act(() => { inFlight = result.current.parseFile(file()) })
    await waitFor(() => expect(result.current.busy).toBe(true))
    await act(async () => { resolveParse(parsed); await inFlight })
    expect(result.current.busy).toBe(false)
  })
})
