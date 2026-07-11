// ABOUTME: Pure assembly of the compliance report content (no PDF, no I/O).
// ABOUTME: Credits grouped by category, per-requirement progress, verdict, period, disclaimer.
import { REQUIREMENT_RULES } from '../domain/requirements'
import { DISCLAIMER_TEXT } from '../domain/disclaimer'
import type { Credit, ComplianceResult, Period, CategoryKey, Group } from '../domain/types'

export interface ReportCredit { provider: string; title: string; date: string; hours: number }
export interface ReportCategory { key: string; label: string; credits: ReportCredit[] }
export interface ReportRequirement { label: string; earned: number; required: number; met: boolean }

export interface ReportContent {
  name: string
  group: Group
  period: Period
  generatedOn: string
  verdict: string
  requirements: ReportRequirement[]
  categories: ReportCategory[]
  disclaimer: string
}

export interface ReportInput {
  name: string
  group: Group
  period: Period
  result: ComplianceResult
  credits: Credit[]
  today: string
}

// The category rules to group credits under (exclude the total/participatory roll-ups).
const CATEGORY_RULES = REQUIREMENT_RULES.filter(r => r.key !== 'total' && r.key !== 'participatory')

export function buildReportContent(input: ReportInput): ReportContent {
  const { result } = input
  const remaining = result.totalCount - result.metCount
  const verdict = result.compliant
    ? 'Compliant — all requirements met.'
    : `Not yet compliant — ${remaining} requirement(s) remaining.`

  const categories: ReportCategory[] = CATEGORY_RULES.map(rule => {
    const key = rule.key as CategoryKey
    const credits = input.credits
      .filter(c => (c.categoryHours[key] ?? 0) > 0)
      .map(c => ({ provider: c.provider, title: c.activityTitle, date: c.completionDate, hours: c.categoryHours[key]! }))
    return { key, label: rule.label, credits }
  })

  return {
    name: input.name,
    group: input.group,
    period: input.period,
    generatedOn: input.today,
    verdict,
    requirements: result.progress.map(p => ({ label: p.label, earned: p.earned, required: p.required, met: p.met })),
    categories,
    disclaimer: DISCLAIMER_TEXT,
  }
}
