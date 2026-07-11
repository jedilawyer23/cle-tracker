// ABOUTME: Verifies parseCertificate maps the callable's error messages to typed errors —
// ABOUTME: NOT_A_CLE_CERTIFICATE and DAILY_LIMIT — and rethrows anything else unchanged.
import { describe, it, expect, vi } from 'vitest'

const { callable } = vi.hoisted(() => ({ callable: vi.fn() }))
vi.mock('firebase/functions', () => ({ httpsCallable: () => callable }))
vi.mock('../../firebase', () => ({ functions: {} }))

import { parseCertificate, NotACleCertificateError, DailyLimitReachedError } from '../parseCertificate'

const payload = { fileBase64: 'QUJD', mimeType: 'application/pdf' }

describe('parseCertificate', () => {
  it('resolves with the callable data on success', async () => {
    callable.mockResolvedValueOnce({ data: { provider: 'PLI' } })
    await expect(parseCertificate(payload)).resolves.toEqual({ provider: 'PLI' })
  })

  it('throws NotACleCertificateError for a NOT_A_CLE_CERTIFICATE message', async () => {
    callable.mockRejectedValueOnce(new Error('NOT_A_CLE_CERTIFICATE'))
    await expect(parseCertificate(payload)).rejects.toBeInstanceOf(NotACleCertificateError)
  })

  it('throws DailyLimitReachedError for a DAILY_LIMIT message', async () => {
    callable.mockRejectedValueOnce(new Error('DAILY_LIMIT'))
    await expect(parseCertificate(payload)).rejects.toBeInstanceOf(DailyLimitReachedError)
  })

  it('rethrows any other error unchanged', async () => {
    const err = new Error('boom')
    callable.mockRejectedValueOnce(err)
    await expect(parseCertificate(payload)).rejects.toBe(err)
  })
})
