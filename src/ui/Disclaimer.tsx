// ABOUTME: Persistent "not legal advice" disclaimer shown wherever compliance status appears.
// ABOUTME: Presentational only — text comes from the shared DISCLAIMER_TEXT constant.
import { DISCLAIMER_TEXT } from '../domain/disclaimer'

export function Disclaimer() {
  return <div className="note">{DISCLAIMER_TEXT}</div>
}
