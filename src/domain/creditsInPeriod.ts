// ABOUTME: Filters credits down to those whose completionDate falls within a compliance period.
// ABOUTME: Pure — ISO YYYY-MM-DD strings compare lexically, so plain string comparison is valid.
import type { Credit, Period } from './types'

export function creditsInPeriod(credits: Credit[], period: Period): Credit[] {
  return credits.filter(c => c.completionDate >= period.start && c.completionDate <= period.end)
}
