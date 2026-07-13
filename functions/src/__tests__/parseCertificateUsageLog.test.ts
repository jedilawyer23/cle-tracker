// ABOUTME: Proves parseCertificate reaches the success path and that a best-effort usage_logs
// ABOUTME: write failure is swallowed — a logging failure never fails the parse.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { CallableRequest } from 'firebase-functions/v2/https'

// A successful extract result the mocked extractParsedCredit hands back. Because the real
// extractor is mocked, this object only needs to be shaped like a ParsedCredit, not validated.
const parsed = {
  isCleCertificate: true,
  provider: 'CEB',
  activityTitle: 'Legal Ethics 101',
  completionDate: '2026-01-15',
  totalHours: 1,
  participatory: true,
  categoryHours: { ethics: 1 },
  confidence: {
    provider: 'high',
    activityTitle: 'high',
    completionDate: 'high',
    totalHours: 'high',
    participatory: 'high',
    categoryHours: 'high',
  },
}

// Reach the parse success path: quota check passes, extract returns a fixed result. addMock's
// behavior is set per test to simulate the usage_logs write succeeding or throwing.
vi.mock('../parseQuota/enforceParseQuota.js', () => ({
  enforceParseQuota: vi.fn(async () => {}),
  parseQuotaKey: (uid: string, date: string) => `${uid}_${date}`,
}))
vi.mock('../parseQuota/firestoreDeps.js', () => ({ parseQuotaDeps: () => ({}) }))

const extractParsedCredit = vi.fn(async () => ({
  parsed,
  usage: { inputTokens: 111, outputTokens: 22 },
}))
vi.mock('../extract.js', () => ({
  extractParsedCredit: (...args: unknown[]) => extractParsedCredit(...args),
  NotACleCertificateError: class NotACleCertificateError extends Error {},
  PARSE_MODEL: 'claude-sonnet-5',
}))

vi.mock('@anthropic-ai/sdk', () => ({
  default: class Anthropic {
    constructor(_config?: unknown) {}
  },
}))

const addMock = vi.fn()
vi.mock('firebase-admin/firestore', () => ({
  getFirestore: () => ({ collection: () => ({ add: addMock }) }),
  FieldValue: { serverTimestamp: () => 'ts' },
}))

// Capture the expected best-effort warning so the swallow-path test asserts on it rather than
// leaking warn noise into the suite output.
const warn = vi.fn()
vi.mock('firebase-functions/v2', () => ({ logger: { warn, info: vi.fn(), error: vi.fn() } }))

const { parseCertificate } = await import('../index')

const authenticatedRequest = (data: unknown, signInProvider?: string): CallableRequest =>
  ({
    data,
    auth: {
      uid: 'test-uid',
      token: (signInProvider === undefined
        ? {}
        : { firebase: { sign_in_provider: signInProvider } }) as never,
      rawToken: 'raw',
    },
  }) as CallableRequest

const validParse = { fileBase64: 'QUJD', mimeType: 'application/pdf' }

describe('parseCertificate usage log write', () => {
  beforeEach(() => {
    addMock.mockReset()
    warn.mockClear()
  })

  it('returns the parsed result even when the usage_logs write throws', async () => {
    addMock.mockRejectedValue(new Error('firestore down'))

    await expect(
      parseCertificate.run(authenticatedRequest(validParse, 'google.com')),
    ).resolves.toEqual(parsed)

    expect(addMock).toHaveBeenCalledTimes(1)
    // The failure is captured as a best-effort warning, not surfaced to the caller.
    expect(warn).toHaveBeenCalledWith('usage log write failed', expect.any(Error))
  })

  it('logs usage and returns the parsed result on the happy path', async () => {
    addMock.mockResolvedValue(undefined)

    await expect(
      parseCertificate.run(authenticatedRequest(validParse, 'google.com')),
    ).resolves.toEqual(parsed)

    expect(addMock).toHaveBeenCalledTimes(1)
    expect(addMock).toHaveBeenCalledWith(
      expect.objectContaining({
        uid: 'test-uid',
        model: 'claude-sonnet-5',
        inputTokens: 111,
        outputTokens: 22,
      }),
    )
    expect(warn).not.toHaveBeenCalled()
  })
})
