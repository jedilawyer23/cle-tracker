// ABOUTME: Groups credits by the calendar period each one resolves into (via resolvePeriod),
// ABOUTME: newest period first — the basis for the Past Cycles view of prior reporting cycles.
import type { Credit, Period } from './types'
import { resolvePeriod } from './resolvePeriod'

export interface PeriodCreditGroup {
  period: Period
  credits: Credit[]
}

export function groupCreditsByPeriod(credits: Credit[], calendar: Period[]): PeriodCreditGroup[] {
  const groups = new Map<string, PeriodCreditGroup>()

  for (const credit of credits) {
    const period = resolvePeriod(calendar, credit.completionDate)
    const key = period.reportBy
    const existing = groups.get(key)
    if (existing) {
      existing.credits.push(credit)
    } else {
      groups.set(key, { period, credits: [credit] })
    }
  }

  return [...groups.values()]
    .sort((a, b) => b.period.start.localeCompare(a.period.start))
    .map(group => ({
      period: group.period,
      credits: [...group.credits].sort((a, b) => b.completionDate.localeCompare(a.completionDate)),
    }))
}
