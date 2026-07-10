// ABOUTME: Pure helpers converting/validating the credit form's string fields <-> a Credit.
// ABOUTME: Shared by the Add screen and the credit-detail edit form (single source of validation).
import type { Credit, CategoryKey } from '../domain/types'

export const FORM_CATEGORIES: (CategoryKey | 'general')[] = [
  'general', 'ethics', 'competence', 'competencePrevention',
  'bias', 'biasImplicit', 'technology', 'civility',
]

export const CATEGORY_LABELS: Record<CategoryKey | 'general', string> = {
  general: 'General', ethics: 'Legal Ethics', competence: 'Competence',
  competencePrevention: 'Prevention & Detection', bias: 'Elimination of Bias',
  biasImplicit: 'Implicit Bias', technology: 'Technology', civility: 'Civility',
}

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
  const catSum = FORM_CATEGORIES.reduce((s, k) => s + (Number(f.categoryHours[k]) || 0), 0)
  if (total > 0 && catSum > total) errors.categoryHours = 'Category hours exceed the total'
  return errors
}
