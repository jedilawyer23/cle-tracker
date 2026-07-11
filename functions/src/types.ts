// ABOUTME: Structured certificate-extraction types returned by parseCertificate.
// ABOUTME: Plain data — mirrors src/domain/types.ts ParsedCredit; keep in sync.

export type Confidence = 'high' | 'medium' | 'low'

export type CategoryKey =
  | 'ethics' | 'competence' | 'competencePrevention'
  | 'bias' | 'biasImplicit' | 'technology' | 'civility'

export type CategoryHours = Partial<Record<CategoryKey | 'general', number>>

// One extracted credit. Field shape matches M1 Credit (no id) plus per-field confidence.
export interface ParsedCredit {
  // The model's judgment of whether the uploaded document is actually a CLE/MCLE certificate of
  // completion at all. When false, the other fields are meaningless and the caller rejects the
  // upload with a "this doesn't look like a CLE certificate" message instead of a parse error.
  isCleCertificate: boolean
  provider: string
  activityTitle: string
  completionDate: string   // ISO date, YYYY-MM-DD
  totalHours: number
  participatory: boolean
  categoryHours: CategoryHours
  confidence: {
    provider: Confidence
    activityTitle: Confidence
    completionDate: Confidence
    totalHours: Confidence
    participatory: Confidence
    categoryHours: Confidence
  }
}
