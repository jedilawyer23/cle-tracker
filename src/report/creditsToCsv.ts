// ABOUTME: Renders logged credits as CSV — one column per requirement category (0 when a credit
// ABOUTME: doesn't touch it) — for the Settings "Export my credits" download. Pure, no I/O.
import { REQUIREMENT_RULES } from '../domain/requirements'
import type { Credit, RequirementRule, CategoryKey } from '../domain/types'

function isCategoryRule(r: RequirementRule): r is RequirementRule & { key: CategoryKey } {
  return r.key !== 'total' && r.key !== 'participatory'
}

const CATEGORY_RULES = REQUIREMENT_RULES.filter(isCategoryRule)

function escapeField(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

export function creditsToCsv(credits: Credit[]): string {
  const header = [
    'Provider', 'Activity', 'Completion Date', 'Total Hours', 'Participatory',
    ...CATEGORY_RULES.map(r => r.label),
  ]
  const rows = credits.map(c => [
    c.provider,
    c.activityTitle,
    c.completionDate,
    String(c.totalHours),
    c.participatory ? 'Yes' : 'No',
    ...CATEGORY_RULES.map(r => String(c.categoryHours[r.key] ?? 0)),
  ])
  return [header, ...rows].map(row => row.map(escapeField).join(',')).join('\r\n')
}
