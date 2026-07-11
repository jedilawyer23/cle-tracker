// ABOUTME: Orchestrates the per-uid daily parse quota over injected deps (fully unit-testable).
// ABOUTME: Throws HttpsError('resource-exhausted', 'DAILY_LIMIT') once today's count hits the limit.
import { HttpsError } from 'firebase-functions/v2/https'

export interface ParseQuotaDeps {
  // Atomically reads today's count for `key` and, if under `limit`, increments it. Returns
  // whether the call is allowed. Implementations MUST do this as a single transaction so
  // concurrent calls can't both read the same under-limit count and both proceed.
  checkAndIncrement(key: string, limit: number): Promise<boolean>
}

export async function enforceParseQuota(
  deps: ParseQuotaDeps,
  uid: string,
  today: string,
  limit: number,
): Promise<void> {
  const allowed = await deps.checkAndIncrement(`${uid}_${today}`, limit)
  if (!allowed) {
    throw new HttpsError('resource-exhausted', 'DAILY_LIMIT')
  }
}
