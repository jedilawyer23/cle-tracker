// ABOUTME: Pure mappings between credits and the requirements they count toward.
// ABOUTME: Drives the dashboard accordion and the credit-detail "counts toward" list.
import type { Credit, RequirementRule } from './types'

export function hoursToward(key: RequirementRule['key'], c: Credit): number {
  if (key === 'total') return c.totalHours
  if (key === 'participatory') return c.participatory ? c.totalHours : 0
  return c.categoryHours[key] ?? 0
}

export function creditsForRequirement(key: RequirementRule['key'], credits: Credit[]): Credit[] {
  return credits.filter(c => hoursToward(key, c) > 0)
}

export function requirementsForCredit(rules: RequirementRule[], credit: Credit): RequirementRule[] {
  return rules.filter(r => hoursToward(r.key, credit) > 0)
}
