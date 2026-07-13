// ABOUTME: Tests the parseCertificate callable's auth gate — unauthenticated calls are rejected
// ABOUTME: before any secret/API work happens; authenticated calls proceed past the auth check.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { HttpsError, type CallableRequest } from 'firebase-functions/v2/https'

// Short-circuit the quota check so we can assert the limit it was handed without touching
// Firestore or the Anthropic client. Throwing here mirrors a caller already over quota.
const enforceParseQuota = vi.fn(() => {
  throw new HttpsError('resource-exhausted', 'DAILY_LIMIT')
})
vi.mock('../parseQuota/enforceParseQuota.js', () => ({
  enforceParseQuota: (...args: unknown[]) => enforceParseQuota(...args),
}))
vi.mock('../parseQuota/firestoreDeps.js', () => ({ parseQuotaDeps: () => ({}) }))

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

const unauthenticatedRequest = (data: unknown): CallableRequest => ({ data }) as CallableRequest

const validParse = { fileBase64: 'QUJD', mimeType: 'application/pdf' }

describe('parseCertificate auth gate', () => {
  beforeEach(() => {
    enforceParseQuota.mockClear()
  })

  it('rejects an unauthenticated caller before touching the secret or the API', async () => {
    await expect(
      parseCertificate.run(unauthenticatedRequest({ fileBase64: 'QUJD', mimeType: 'application/pdf' })),
    ).rejects.toMatchObject({ code: 'unauthenticated' } satisfies Partial<HttpsError>)
  })

  it('lets an authenticated caller past the auth gate (fails later on missing fields, not auth)', async () => {
    await expect(
      parseCertificate.run(authenticatedRequest({})),
    ).rejects.toMatchObject({ code: 'invalid-argument' } satisfies Partial<HttpsError>)
  })

  it('rejects an oversized fileBase64 before the quota check or the API', async () => {
    const oversized = 'a'.repeat(9_000_001)
    await expect(
      parseCertificate.run(authenticatedRequest({ fileBase64: oversized, mimeType: 'application/pdf' })),
    ).rejects.toMatchObject({ code: 'invalid-argument', message: 'FILE_TOO_LARGE' } satisfies Partial<HttpsError>)
  })

  it('enforces the anonymous limit for an anonymous sign-in provider', async () => {
    await expect(parseCertificate.run(authenticatedRequest(validParse, 'anonymous'))).rejects.toMatchObject({
      code: 'resource-exhausted',
    } satisfies Partial<HttpsError>)
    expect(enforceParseQuota.mock.calls[0][3]).toBe(10)
  })

  it('enforces the authenticated limit for a google.com sign-in provider', async () => {
    await expect(parseCertificate.run(authenticatedRequest(validParse, 'google.com'))).rejects.toMatchObject({
      code: 'resource-exhausted',
    } satisfies Partial<HttpsError>)
    expect(enforceParseQuota.mock.calls[0][3]).toBe(25)
  })

  it('treats a token with no sign-in provider as anonymous', async () => {
    await expect(parseCertificate.run(authenticatedRequest(validParse))).rejects.toMatchObject({
      code: 'resource-exhausted',
    } satisfies Partial<HttpsError>)
    expect(enforceParseQuota.mock.calls[0][3]).toBe(10)
  })
})
