// ABOUTME: Pure grouping of a ComplianceResult into the dashboard's unified top-level rows, in
// ABOUTME: REQUIREMENT_RULES order. Folds sub-minimum rules into their parent as `children`.
import type { Credit, ComplianceResult, RequirementProgress, RequirementRule } from '../domain/types'
import { creditsForRequirement } from '../domain/creditContribution'

export interface DashboardRow {
  key: RequirementRule['key']
  label: string
  met: boolean
  remaining: number
  earned: number
  required: number
  children: RequirementProgress[] // sub-minimums, for meta text
  credits: Credit[]               // contributing credits, for the accordion
}

// A top-level requirement is complete only if it AND all its child sub-minimums are met
// (M1 review carry-forward item 1a) — e.g. Competence 2/2 with Prevention & Detection 0/1
// stays unmet, surfacing the sub-gap. The headline "N requirements left" count is derived by
// the caller as `rows.filter(r => !r.met).length` — the same visible rows this returns
// (carry-forward item 1b), now rendered as a single unified list rather than a two-list split.
export function buildDashboardRows(result: ComplianceResult, credits: Credit[]): DashboardRow[] {
  return result.progress
    .filter(p => !p.parent)
    .map(p => {
      const children = result.progress.filter(c => c.parent === p.key)
      const met = p.met && children.every(c => c.met)
      const remaining = met ? 0 : Math.max(p.remaining, ...children.map(c => c.remaining), 0)
      return { key: p.key, label: p.label, met, remaining, earned: p.earned,
        required: p.required, children, credits: creditsForRequirement(p.key, credits) }
    })
}

export interface Shortfall {
  label: string
  remaining: number
}

// The failure mode this catches: an attorney logs 25+ hours, assumes they're compliant, and misses
// a small standalone or sub-requirement still outstanding. Given the dashboard rows, and only once
// the total-hours requirement is met, list every remaining gap — categories, sub-minimums by their
// own label (e.g. "Implicit Bias"), and participatory — so the UI can call them out specifically.
// Returns empty while the total is still short (the main requirements list already tells that
// story) or when nothing is outstanding.
export function shortfallsWithTotalMet(rows: DashboardRow[]): Shortfall[] {
  const total = rows.find(r => r.key === 'total')
  if (!total || !total.met) return []
  const shortfalls: Shortfall[] = []
  for (const row of rows) {
    if (row.key === 'total') continue
    const ownRemaining = Math.max(0, row.required - row.earned)
    if (ownRemaining > 0) shortfalls.push({ label: row.label, remaining: ownRemaining })
    for (const child of row.children) {
      if (!child.met) shortfalls.push({ label: child.label, remaining: child.remaining })
    }
  }
  return shortfalls
}
