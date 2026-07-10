// ABOUTME: Tests the parseCertificate callable's auth gate — unauthenticated calls are rejected
// ABOUTME: before any secret/API work happens; authenticated calls proceed past the auth check.
import { describe, it, expect } from 'vitest'
import { HttpsError, type CallableRequest } from 'firebase-functions/v2/https'
import { parseCertificate } from '../index'

const authenticatedRequest = (data: unknown): CallableRequest =>
  ({
    data,
    auth: { uid: 'test-uid', token: {} as never, rawToken: 'raw' },
  }) as CallableRequest

const unauthenticatedRequest = (data: unknown): CallableRequest => ({ data }) as CallableRequest

describe('parseCertificate auth gate', () => {
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
})
