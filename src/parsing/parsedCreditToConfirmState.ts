// ABOUTME: Maps a ParsedCredit into the M2 Confirm-screen initial state.
// ABOUTME: Pure — surfaces low-confidence fields so the Confirm screen can flag them.
import type { ParsedCredit } from '../domain/types'

export type ConfirmDraft = Omit<ParsedCredit, 'confidence'>

export interface ConfirmState {
  draft: ConfirmDraft
  lowConfidenceFields: (keyof ParsedCredit['confidence'])[]
}

export function parsedCreditToConfirmState(parsed: ParsedCredit): ConfirmState {
  const { confidence, ...draft } = parsed
  const lowConfidenceFields = (Object.keys(confidence) as (keyof ParsedCredit['confidence'])[])
    .filter((k) => confidence[k] === 'low')
  return { draft, lowConfidenceFields }
}
