// ABOUTME: Per-uid daily call limit for parseCertificate — an interim spend cap ahead of App
// ABOUTME: Check (tracked follow-up). Overridable via PARSE_DAILY_LIMIT; defaults to 25/day.
export const DEFAULT_PARSE_DAILY_LIMIT = 25

export function resolveParseDailyLimit(env: NodeJS.ProcessEnv = process.env): number {
  const raw = env.PARSE_DAILY_LIMIT
  const parsed = raw ? Number(raw) : NaN
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_PARSE_DAILY_LIMIT
}
