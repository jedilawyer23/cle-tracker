// ABOUTME: Selects the compliance period covering a given date from a group's calendar.
// ABOUTME: Pure — compares ISO date strings lexicographically (valid for YYYY-MM-DD).
import type { Period } from './types'

export function resolvePeriod(calendar: Period[], asOf: string): Period {
  if (calendar.length === 0) throw new Error('resolvePeriod: empty calendar')
  const sorted = [...calendar].sort((a, b) => a.start.localeCompare(b.start))
  const containing = sorted.find(p => asOf >= p.start && asOf <= p.reportBy)
  if (containing) return containing
  if (asOf < sorted[0].start) return sorted[0]
  return sorted[sorted.length - 1]
}
