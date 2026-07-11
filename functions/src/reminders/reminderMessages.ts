// ABOUTME: Pure reminder email copy — maps a reminder key + context to subject/text.
// ABOUTME: No provider or I/O; the disclaimer is appended from the shared constant.
import { DISCLAIMER_TEXT } from '@domain/disclaimer'

export interface MessageContext {
  name: string
  reportBy: string        // ISO date
  daysLeft: number
  remainingCount: number  // requirements still unmet
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

export function buildMessage(key: string, ctx: MessageContext): { subject: string; text: string } {
  const deadline = formatDate(ctx.reportBy)
  const sign = `— ${DISCLAIMER_TEXT}`
  if (key.startsWith('noncompliant-')) {
    return {
      subject: 'MCLE requirements still outstanding',
      text:
        `Hi ${ctx.name}, you still have ${ctx.remainingCount} requirement(s) to complete ` +
        `before your California MCLE reporting deadline on ${deadline} (${ctx.daysLeft} days). ` +
        `Log the remaining credits soon.\n\n${sign}`,
    }
  }
  return {
    subject: 'Your MCLE reporting deadline is approaching',
    text:
      `Hi ${ctx.name}, your California MCLE reporting deadline is ${deadline} — ` +
      `${ctx.daysLeft} days away. Review your progress in CLE Tracker.\n\n${sign}`,
  }
}
