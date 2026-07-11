// ABOUTME: Runtime validation of extracted JSON into a typed ParsedCredit.
// ABOUTME: Pure — throws on anything the model returned that doesn't match the schema.
import type { ParsedCredit, Confidence, CategoryKey } from './types.js'

const CONFIDENCES: Confidence[] = ['high', 'medium', 'low']
const CATEGORY_KEYS: (CategoryKey | 'general')[] = [
  'ethics', 'competence', 'competencePrevention', 'bias', 'biasImplicit', 'technology', 'civility', 'general',
]
const CONF_FIELDS = ['provider', 'activityTitle', 'completionDate', 'totalHours', 'participatory', 'categoryHours'] as const

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}
function isConf(v: unknown): v is Confidence {
  return typeof v === 'string' && (CONFIDENCES as string[]).includes(v)
}

export function validateParsedCredit(input: unknown): ParsedCredit {
  if (!isObj(input)) throw new Error('ParsedCredit: not an object')
  const { isCleCertificate, provider, activityTitle, completionDate, totalHours, participatory, categoryHours, confidence } = input

  if (typeof isCleCertificate !== 'boolean') throw new Error('ParsedCredit.isCleCertificate must be a boolean')
  if (typeof provider !== 'string') throw new Error('ParsedCredit.provider must be a string')
  if (typeof activityTitle !== 'string') throw new Error('ParsedCredit.activityTitle must be a string')
  if (typeof completionDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(completionDate))
    throw new Error('ParsedCredit.completionDate must be YYYY-MM-DD')
  if (typeof totalHours !== 'number' || !Number.isFinite(totalHours) || totalHours < 0)
    throw new Error('ParsedCredit.totalHours must be a non-negative number')
  if (typeof participatory !== 'boolean') throw new Error('ParsedCredit.participatory must be a boolean')

  if (!isObj(categoryHours)) throw new Error('ParsedCredit.categoryHours must be an object')
  for (const [k, v] of Object.entries(categoryHours)) {
    if (!(CATEGORY_KEYS as string[]).includes(k)) throw new Error(`ParsedCredit.categoryHours: unknown key ${k}`)
    if (typeof v !== 'number' || !Number.isFinite(v) || v < 0)
      throw new Error(`ParsedCredit.categoryHours.${k} must be a non-negative number`)
  }

  if (!isObj(confidence)) throw new Error('ParsedCredit.confidence must be an object')
  for (const f of CONF_FIELDS) {
    if (!isConf(confidence[f])) throw new Error(`ParsedCredit.confidence.${f} must be high|medium|low`)
  }

  return input as unknown as ParsedCredit
}
