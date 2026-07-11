// ABOUTME: Pure helpers converting/validating the credit form's string fields <-> a Credit.
// ABOUTME: Shared by the Add screen and the credit-detail edit form (single source of validation).
import type { Credit, CategoryKey } from '../domain/types'
import { REQUIREMENT_RULES } from '../domain/requirements'

export const FORM_CATEGORIES: (CategoryKey | 'general')[] = [
  'general', 'ethics', 'competence', 'competencePrevention',
  'bias', 'biasImplicit', 'technology', 'civility',
]

export const CATEGORY_LABELS: Record<CategoryKey | 'general', string> = {
  general: 'General', ethics: 'Legal Ethics', competence: 'Competence',
  competencePrevention: 'Prevention & Detection', bias: 'Elimination of Bias',
  biasImplicit: 'Implicit Bias', technology: 'Technology', civility: 'Civility',
}

// Sub-minimum hours are a SUBSET of their parent's hours, not extra (e.g. Prevention &
// Detection is included within Competence's total). Maps a sub-minimum's key to its parent's.
export const SUB_MINIMUM_PARENT: Partial<Record<CategoryKey, CategoryKey>> = Object.fromEntries(
  REQUIREMENT_RULES.filter(r => r.parent).map(r => [r.key, r.parent]),
) as Partial<Record<CategoryKey, CategoryKey>>

export interface CreditFormValues {
  provider: string
  activityTitle: string
  completionDate: string
  totalHours: string
  participatory: boolean
  categoryHours: Record<CategoryKey | 'general', string>
}

const blankCategoryHours = (): Record<CategoryKey | 'general', string> =>
  Object.fromEntries(FORM_CATEGORIES.map(k => [k, ''])) as Record<CategoryKey | 'general', string>

export function emptyCreditForm(): CreditFormValues {
  return { provider: '', activityTitle: '', completionDate: '', totalHours: '',
    participatory: true, categoryHours: blankCategoryHours() }
}

export function creditToForm(c: Credit): CreditFormValues {
  const categoryHours = blankCategoryHours()
  for (const k of FORM_CATEGORIES) {
    const v = c.categoryHours[k]
    if (v !== undefined) categoryHours[k] = String(v)
  }
  return { provider: c.provider, activityTitle: c.activityTitle, completionDate: c.completionDate,
    totalHours: String(c.totalHours), participatory: c.participatory, categoryHours }
}

export function formToCredit(f: CreditFormValues): Omit<Credit, 'id'> {
  const categoryHours: Partial<Record<CategoryKey | 'general', number>> = {}
  for (const k of FORM_CATEGORIES) {
    const raw = f.categoryHours[k].trim()
    const n = Number(raw)
    if (raw !== '' && n > 0) categoryHours[k] = n
  }
  return { provider: f.provider.trim(), activityTitle: f.activityTitle.trim(),
    completionDate: f.completionDate, totalHours: Number(f.totalHours),
    participatory: f.participatory, categoryHours }
}

export function validateCreditForm(f: CreditFormValues): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!f.provider.trim()) errors.provider = 'Provider is required'
  if (!f.activityTitle.trim()) errors.activityTitle = 'Title is required'
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.completionDate)) errors.completionDate = 'Enter a completion date'
  const total = Number(f.totalHours)
  if (!(total > 0)) errors.totalHours = 'Enter hours greater than 0'

  // A sub-minimum's hours are already included in its parent's — only top-level categories
  // count toward the total, or a prevention-only course would wrongly appear to exceed it.
  const topLevelKeys = FORM_CATEGORIES.filter(k => !SUB_MINIMUM_PARENT[k as CategoryKey])
  const catSum = topLevelKeys.reduce((s, k) => s + (Number(f.categoryHours[k]) || 0), 0)
  if (total > 0 && catSum > total) errors.categoryHours = 'Category hours exceed the total'

  for (const [child, parent] of Object.entries(SUB_MINIMUM_PARENT) as [CategoryKey, CategoryKey][]) {
    const childHours = Number(f.categoryHours[child]) || 0
    const parentHours = Number(f.categoryHours[parent]) || 0
    if (childHours > parentHours) {
      errors.categoryHours = `${CATEGORY_LABELS[child]} hours can't exceed ${CATEGORY_LABELS[parent]} hours`
    }
  }
  return errors
}
