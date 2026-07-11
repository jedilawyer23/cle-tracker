// ABOUTME: Smoke-tests that the report renderer produces a valid PDF document.
// ABOUTME: Deliberately does not assert on PDF bytes — buildReportContent owns content coverage.
import { describe, it, expect } from 'vitest'
import { renderReportPdf } from '../renderReportPdf'
import type { ReportContent } from '../buildReportContent'

const content: ReportContent = {
  name: 'Maya Hoffman', group: 2,
  period: { start: '2024-02-01', end: '2027-03-29', reportBy: '2027-03-30' },
  generatedOn: '2026-07-10',
  verdict: 'Not yet compliant — 4 requirement(s) remaining.',
  requirements: [{ label: 'Total hours', earned: 18, required: 25, met: false }],
  categories: [{ key: 'ethics', label: 'Legal Ethics', credits: [{ provider: 'PLI', title: 'Ethics in the Age of AI', date: '2026-03-04', hours: 4 }] }],
  disclaimer: 'Not legal advice — verify your compliance with the State Bar of California.',
}

describe('renderReportPdf', () => {
  it('produces a PDF document with at least one page', () => {
    const doc = renderReportPdf(content)
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1)
    expect(doc.output('blob').size).toBeGreaterThan(0)
  })
})
