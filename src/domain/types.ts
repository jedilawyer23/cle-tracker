// ABOUTME: Shared domain types for the MCLE requirements engine.
// ABOUTME: Plain data only — no React, Firebase, or I/O dependencies.

export type Group = 1 | 2 | 3

export type CategoryKey =
  | 'ethics' | 'competence' | 'competencePrevention'
  | 'bias' | 'biasImplicit' | 'technology' | 'civility'

// A single required minimum, in hours, for the compliance period.
export interface RequirementRule {
  key: 'total' | 'participatory' | CategoryKey
  label: string
  minimumHours: number
  // Optional parent for sub-minimums (e.g. competencePrevention -> competence).
  parent?: CategoryKey
}

export interface Period {
  start: string      // ISO date, inclusive
  end: string        // ISO date, compliance deadline
  reportBy: string   // ISO date, reporting deadline
}

// Hours a single logged credit contributes to each category (+ total/participatory).
export interface Credit {
  id: string
  provider: string
  activityTitle: string
  completionDate: string      // ISO date
  totalHours: number
  participatory: boolean
  categoryHours: Partial<Record<CategoryKey | 'general', number>>
}

export interface RequirementProgress {
  key: RequirementRule['key']
  label: string
  required: number
  earned: number
  remaining: number
  met: boolean
  parent?: CategoryKey
}

export interface ComplianceResult {
  progress: RequirementProgress[]   // one per rule, in config order
  metCount: number
  totalCount: number
  compliant: boolean
}

export type Confidence = 'high' | 'medium' | 'low'

export interface ParsedCredit {
  provider: string
  activityTitle: string
  completionDate: string
  totalHours: number
  participatory: boolean
  categoryHours: Partial<Record<CategoryKey | 'general', number>>
  confidence: {
    provider: Confidence
    activityTitle: Confidence
    completionDate: Confidence
    totalHours: Confidence
    participatory: Confidence
    categoryHours: Confidence
  }
}
