// ABOUTME: Pure grouping of a ComplianceResult into Still-needed / Complete dashboard rows.
// ABOUTME: Folds sub-minimum rules into their parent; attaches each row's contributing credits.
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
// stays Still needed, surfacing the sub-gap. The headline "N requirements left" count is
// `stillNeeded.length`, the same visible top-level rows this returns (carry-forward item 1b).
export function buildDashboardRows(result: ComplianceResult, credits: Credit[]): {
  stillNeeded: DashboardRow[]
  complete: DashboardRow[]
} {
  const rows: DashboardRow[] = result.progress
    .filter(p => !p.parent)
    .map(p => {
      const children = result.progress.filter(c => c.parent === p.key)
      const met = p.met && children.every(c => c.met)
      const remaining = met ? 0 : Math.max(p.remaining, ...children.map(c => c.remaining), 0)
      return { key: p.key, label: p.label, met, remaining, earned: p.earned,
        required: p.required, children, credits: creditsForRequirement(p.key, credits) }
    })
  return { stillNeeded: rows.filter(r => !r.met), complete: rows.filter(r => r.met) }
}
