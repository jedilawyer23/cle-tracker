// ABOUTME: Reduces an HTML page to a stable text fingerprint — strips boilerplate that changes
// ABOUTME: independently of the rules (scripts, nav, header, footer), then hashes the visible text.
import { createHash } from 'node:crypto'

// Boilerplate regions change for reasons unrelated to the MCLE rules (a news banner, a footer
// year, analytics markup). Removing them cuts most false positives; the remaining false positives
// are acceptable for a change *detector* — a human verifies each alert. False negatives (missing a
// real rule change) are the only unacceptable outcome, and stripping only chrome doesn't risk that.
export function extractText(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|head|nav|header|footer|svg|noscript|form)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&(?:#\d+|[a-z]+);/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function fingerprint(text: string): string {
  return createHash('sha256').update(text).digest('hex')
}
