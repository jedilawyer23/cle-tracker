// ABOUTME: Pure decision — which reminder keys are due for a user on a given day.
// ABOUTME: Idempotent by filtering alreadySent; no email, Firestore, or clock access.
import type { ReminderConfig } from './config'

export interface ReminderState {
  hasEmail: boolean
  requiredToReport: boolean
  compliant: boolean
  reportBy: string        // ISO date (YYYY-MM-DD)
  alreadySent: string[]   // reminder keys already delivered
}

function toUTC(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

export function daysUntil(today: string, target: string): number {
  return Math.round((toUTC(target) - toUTC(today)) / 86_400_000)
}

// Smallest threshold T with days <= T, or null if past the widest window.
function currentBucket(days: number, thresholds: number[]): number | null {
  const active = [...thresholds].sort((a, b) => a - b).find(t => days <= t)
  return active ?? null
}

export function dueReminders(
  state: ReminderState,
  today: string,
  cfg: ReminderConfig,
): string[] {
  if (!state.hasEmail || !state.requiredToReport) return []
  const days = daysUntil(today, state.reportBy)
  if (days < 0) return []
  const bucket = currentBucket(days, cfg.thresholds)
  if (bucket === null) return []

  const keys = [`deadline-${bucket}`]
  if (!state.compliant && bucket <= cfg.nearDeadlineDays) keys.push(`noncompliant-${bucket}`)
  return keys.filter(k => !state.alreadySent.includes(k))
}
