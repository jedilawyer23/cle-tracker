// ABOUTME: Verifies the renderer hands buildReportDocDefinition's output to pdfmake and downloads it.
// ABOUTME: Mocks pdfmake's lazy-loaded modules — no real PDF is generated in this test.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ReportContent } from '../buildReportContent'

const download = vi.fn()
const createPdf = vi.fn((_def: Record<string, unknown>) => ({ download }))

vi.mock('pdfmake/build/pdfmake', () => ({
  default: { createPdf, vfs: undefined },
}))

vi.mock('pdfmake/build/vfs_fonts', () => ({
  default: { 'Roboto-Regular.ttf': 'stub-font-bytes' },
}))

const content: ReportContent = {
  name: 'Maya Hoffman',
  group: 2,
  period: { start: '2024-02-01', end: '2027-03-29', reportBy: '2027-03-30' },
  generatedOn: '2026-07-10',
  verdict: 'Not yet compliant — 4 requirement(s) remaining.',
  compliant: false,
  metCount: 1,
  totalCount: 8,
  requirements: [{ label: 'Total hours', earned: 18, required: 25, met: false }],
  categories: [{ key: 'ethics', label: 'Legal Ethics', credits: [{ provider: 'PLI', title: 'Ethics in the Age of AI', date: '2026-03-04', hours: 4 }] }],
  credits: [{ title: 'Ethics in the Age of AI', provider: 'PLI', date: '2026-03-04', hours: 4, participatory: true }],
  disclaimer: 'Not legal advice — verify your compliance with the State Bar of California.',
}

describe('renderReportPdf', () => {
  beforeEach(() => {
    createPdf.mockClear()
    download.mockClear()
  })

  it('builds the doc definition, hands it to pdfmake, and downloads the given file name', async () => {
    const { renderReportPdf } = await import('../renderReportPdf')
    await renderReportPdf(content, 'x.pdf')

    expect(createPdf).toHaveBeenCalledTimes(1)
    const def = createPdf.mock.calls[0][0]
    expect(Array.isArray(def.content)).toBe(true)

    expect(download).toHaveBeenCalledTimes(1)
    expect(download).toHaveBeenCalledWith('x.pdf')
  })
})
