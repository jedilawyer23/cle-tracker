// ABOUTME: Normalized fingerprint of a credit's identifying fields, so the same certificate
// ABOUTME: logged twice (any casing/whitespace) is recognized as a duplicate before it's saved.
import type { Credit } from './types'

type SignatureFields = Pick<Credit, 'provider' | 'activityTitle' | 'completionDate' | 'totalHours' | 'participatory' | 'categoryHours'>

const DELIMITER = '␟' // ␟ — unit separator, unlikely to appear in real provider/title text.

const norm = (s: string) => s.trim().replace(/\s+/g, ' ').toLowerCase()

export function creditSignature(c: SignatureFields): string {
  const categoryPart = Object.entries(c.categoryHours)
    .filter(([, hours]) => (hours ?? 0) > 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, hours]) => `${key}:${hours}`)
    .join(',')

  return [
    norm(c.provider),
    norm(c.activityTitle),
    c.completionDate,
    c.totalHours,
    c.participatory ? 'p' : 's',
    categoryPart,
  ].join(DELIMITER)
}

export function isDuplicateCredit(candidate: SignatureFields, existing: Credit[]): boolean {
  const candidateSignature = creditSignature(candidate)
  return existing.some(e => creditSignature(e) === candidateSignature)
}
