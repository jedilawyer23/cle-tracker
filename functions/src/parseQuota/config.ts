// ABOUTME: Per-uid daily call limit for parseCertificate — an interim spend cap ahead of App
// ABOUTME: Check (tracked follow-up). Split by sign-in provider; PARSE_DAILY_LIMIT overrides both.
export const ANONYMOUS_PARSE_DAILY_LIMIT = 10
export const AUTHENTICATED_PARSE_DAILY_LIMIT = 25

export function resolveParseDailyLimit(isAnonymous: boolean, env: NodeJS.ProcessEnv = process.env): number {
  const raw = env.PARSE_DAILY_LIMIT
  const parsed = raw ? Number(raw) : NaN
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed
  }
  return isAnonymous ? ANONYMOUS_PARSE_DAILY_LIMIT : AUTHENTICATED_PARSE_DAILY_LIMIT
}
