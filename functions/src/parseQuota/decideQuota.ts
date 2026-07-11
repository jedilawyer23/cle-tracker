// ABOUTME: Pure per-uid daily quota decision for parseCertificate — no I/O. Given the count
// ABOUTME: already recorded today and the daily limit, decides whether to allow the call.
export interface QuotaDecision {
  allowed: boolean
  nextCount: number
}

export function decideQuota(currentCount: number, limit: number): QuotaDecision {
  if (currentCount >= limit) return { allowed: false, nextCount: currentCount }
  return { allowed: true, nextCount: currentCount + 1 }
}
