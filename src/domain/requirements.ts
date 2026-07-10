// ABOUTME: Effective-dated California MCLE rule set and per-group cycle calendar.
// ABOUTME: Data only. Re-verify dates and minimums against calbar.ca.gov before release.
import type { RequirementRule, Group, Period } from './types'

// Order here is the display order in the UI.
export const REQUIREMENT_RULES: RequirementRule[] = [
  { key: 'total', label: 'Total hours', minimumHours: 25 },
  { key: 'ethics', label: 'Legal Ethics', minimumHours: 4 },
  { key: 'competence', label: 'Competence', minimumHours: 2 },
  { key: 'competencePrevention', label: 'Prevention & Detection', minimumHours: 1, parent: 'competence' },
  { key: 'bias', label: 'Elimination of Bias', minimumHours: 2 },
  { key: 'biasImplicit', label: 'Implicit Bias', minimumHours: 1, parent: 'bias' },
  { key: 'technology', label: 'Technology', minimumHours: 1 },
  { key: 'civility', label: 'Civility', minimumHours: 1 },
  { key: 'participatory', label: 'Participatory', minimumHours: 12.5 },
]

// Explicit period rows per group. Extend as cycles roll. Verify against calbar.ca.gov.
export const GROUP_CALENDAR: Record<Group, Period[]> = {
  1: [
    { start: '2022-02-01', end: '2025-03-29', reportBy: '2025-03-30' },
    { start: '2025-02-01', end: '2028-03-29', reportBy: '2028-03-30' },
  ],
  2: [
    { start: '2024-02-01', end: '2027-03-29', reportBy: '2027-03-30' },
    { start: '2027-02-01', end: '2030-03-29', reportBy: '2030-03-30' },
  ],
  3: [
    { start: '2023-02-01', end: '2026-03-29', reportBy: '2026-03-30' },
    { start: '2026-02-01', end: '2029-03-29', reportBy: '2029-03-30' },
  ],
}
