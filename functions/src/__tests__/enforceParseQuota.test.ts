// ABOUTME: Tests the parseCertificate quota orchestration over injected deps with a fake counter.
// ABOUTME: No Firestore — deps are vi.fn() fakes; only the wiring and the HttpsError are asserted.
import { describe, it, expect, vi } from 'vitest'
import { HttpsError } from 'firebase-functions/v2/https'
import { enforceParseQuota, type ParseQuotaDeps } from '../parseQuota/enforceParseQuota'

function fakeDeps(allowed: boolean): { deps: ParseQuotaDeps; checkAndIncrement: ReturnType<typeof vi.fn> } {
  const checkAndIncrement = vi.fn(async () => allowed)
  return { deps: { checkAndIncrement }, checkAndIncrement }
}

describe('enforceParseQuota', () => {
  it('resolves without throwing when the deps report the call is allowed', async () => {
    const { deps } = fakeDeps(true)
    await expect(enforceParseQuota(deps, 'u1', '2027-03-10', 25)).resolves.toBeUndefined()
  })

  it('throws a resource-exhausted HttpsError when the deps report the daily limit is hit', async () => {
    const { deps } = fakeDeps(false)
    await expect(enforceParseQuota(deps, 'u1', '2027-03-10', 25)).rejects.toMatchObject({
      code: 'resource-exhausted',
      message: 'DAILY_LIMIT',
    } satisfies Partial<HttpsError>)
  })

  it('checks the per-uid per-day key and passes the limit through', async () => {
    const { deps, checkAndIncrement } = fakeDeps(true)
    await enforceParseQuota(deps, 'u1', '2027-03-10', 25)
    expect(checkAndIncrement).toHaveBeenCalledWith('u1_2027-03-10', 25)
  })
})
