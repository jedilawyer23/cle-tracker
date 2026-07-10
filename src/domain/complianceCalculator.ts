// ABOUTME: Computes per-requirement progress and overall compliance from logged credits.
// ABOUTME: Pure — no I/O; the single source of truth for "what's still needed".
import type { RequirementRule, Credit, RequirementProgress, ComplianceResult } from './types'

function earnedFor(rule: RequirementRule, credits: Credit[]): number {
  if (rule.key === 'total') return credits.reduce((s, c) => s + c.totalHours, 0)
  if (rule.key === 'participatory')
    return credits.reduce((s, c) => s + (c.participatory ? c.totalHours : 0), 0)
  return credits.reduce((s, c) => s + (c.categoryHours[rule.key] ?? 0), 0)
}

export function calculateCompliance(rules: RequirementRule[], credits: Credit[]): ComplianceResult {
  const progress: RequirementProgress[] = rules.map(rule => {
    const earned = earnedFor(rule, credits)
    const met = earned >= rule.minimumHours
    return {
      key: rule.key, label: rule.label, required: rule.minimumHours,
      earned, remaining: Math.max(0, rule.minimumHours - earned), met, parent: rule.parent,
    }
  })
  const metCount = progress.filter(p => p.met).length
  return { progress, metCount, totalCount: progress.length, compliant: metCount === progress.length }
}
