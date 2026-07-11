// ABOUTME: Extracts the surname from a full name — "Last, First", generational suffixes
// ABOUTME: (Jr/Sr/II/III/IV/V/Esq), and plain "First Last" are all recognized.
// Shared by FirstRun (to derive the group) and App (to derive UserProfile.lastName).
const GENERATIONAL_SUFFIXES = new Set(['JR', 'SR', 'II', 'III', 'IV', 'V', 'ESQ'])

function isGenerationalSuffix(token: string): boolean {
  return GENERATIONAL_SUFFIXES.has(token.replace(/\.$/, '').toUpperCase())
}

export function lastToken(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return ''

  // "Last, First" — the surname is the whole segment before the first comma, so a multi-word
  // surname (e.g. "Van Der Berg, John") stays intact rather than losing everything but its
  // own last word.
  const commaIndex = trimmed.indexOf(',')
  if (commaIndex !== -1) return trimmed.slice(0, commaIndex).trim()

  const tokens = trimmed.split(/\s+/).filter(Boolean)
  while (tokens.length > 1 && isGenerationalSuffix(tokens[tokens.length - 1])) {
    tokens.pop()
  }
  return tokens[tokens.length - 1] ?? ''
}
