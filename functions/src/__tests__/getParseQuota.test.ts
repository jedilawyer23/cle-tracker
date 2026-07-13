// ABOUTME: Tests the read-only getParseQuota callable — auth gate, per-provider limit, and the
// ABOUTME: never-negative remaining, using an injected fake ParseQuotaDeps.getCount stub.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { HttpsError, type CallableRequest } from 'firebase-functions/v2/https'

// Feed today's count through the module-level parseQuotaDeps() seam without touching Firestore.
const getCount = vi.fn<(key: string) => Promise<number>>()
vi.mock('../parseQuota/firestoreDeps.js', () => ({ parseQuotaDeps: () => ({ getCount }) }))

const { getParseQuota } = await import('../index')

const authenticatedRequest = (signInProvider?: string): CallableRequest =>
  ({
    data: {},
    auth: {
      uid: 'test-uid',
      token: (signInProvider === undefined
        ? {}
        : { firebase: { sign_in_provider: signInProvider } }) as never,
      rawToken: 'raw',
    },
  }) as CallableRequest

const unauthenticatedRequest = (): CallableRequest => ({ data: {} }) as CallableRequest

describe('getParseQuota', () => {
  beforeEach(() => {
    getCount.mockReset()
  })

  it('rejects an unauthenticated caller', async () => {
    await expect(getParseQuota.run(unauthenticatedRequest())).rejects.toMatchObject({
      code: 'unauthenticated',
    } satisfies Partial<HttpsError>)
  })

  it('reports the anonymous limit and remaining for an anonymous caller', async () => {
    getCount.mockResolvedValue(3)

    const result = await getParseQuota.run(authenticatedRequest('anonymous'))

    expect(result).toEqual({ used: 3, limit: 10, remaining: 7 })
  })

  it('reports the authenticated limit and never-negative remaining for a google caller', async () => {
    getCount.mockResolvedValue(30)

    const result = await getParseQuota.run(authenticatedRequest('google.com'))

    expect(result).toEqual({ used: 30, limit: 25, remaining: 0 })
  })
})
