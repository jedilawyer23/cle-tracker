// ABOUTME: Pure tests of buildReportDocDefinition — walks the plain pdfmake doc-definition object.
// ABOUTME: No pdfmake runtime involved; asserts structure/content coverage, not exact spacing.
import { describe, it, expect } from 'vitest'
import { buildReportDocDefinition } from '../reportDocDefinition'
import type { ReportContent } from '../buildReportContent'

// Recursively collect every string found under a `text` key, anywhere in the tree.
function collectTexts(node: unknown, out: string[] = []): string[] {
  if (Array.isArray(node)) {
    for (const item of node) collectTexts(item, out)
    return out
  }
  if (node && typeof node === 'object') {
    const obj = node as Record<string, unknown>
    if (typeof obj.text === 'string') out.push(obj.text)
    for (const value of Object.values(obj)) collectTexts(value, out)
  }
  return out
}

// Recursively collect every object that carries a `table` definition.
function collectTables(node: unknown, out: Array<{ table: { body: unknown[][] } }> = []): Array<{ table: { body: unknown[][] } }> {
  if (Array.isArray(node)) {
    for (const item of node) collectTables(item, out)
    return out
  }
  if (node && typeof node === 'object') {
    const obj = node as Record<string, unknown>
    if (obj.table && typeof obj.table === 'object') out.push(obj as { table: { body: unknown[][] } })
    for (const value of Object.values(obj)) collectTables(value, out)
  }
  return out
}

function cellText(cell: unknown): string | undefined {
  if (cell && typeof cell === 'object' && typeof (cell as Record<string, unknown>).text === 'string') {
    return (cell as Record<string, unknown>).text as string
  }
  return undefined
}

const baseContent: ReportContent = {
  name: 'Maya Hoffman',
  group: 2,
  period: { start: '2024-02-01', end: '2027-03-29', reportBy: '2027-03-30' },
  generatedOn: '2026-07-10',
  verdict: 'Not yet compliant — 4 requirement(s) remaining.',
  compliant: false,
  metCount: 1,
  totalCount: 8,
  requirements: [
    { label: 'Total hours', earned: 18, required: 25, met: false },
    { label: 'Legal Ethics', earned: 4, required: 4, met: true },
    { label: 'Competence', earned: 1, required: 2, met: false },
    { label: 'Prevention & Detection', earned: 0, required: 1, met: false, sub: true },
    { label: 'Implicit Bias', earned: 1, required: 1, met: true, sub: true },
  ],
  categories: [],
  credits: [],
  disclaimer: 'Not legal advice — verify your compliance with the State Bar of California.',
}

describe('buildReportDocDefinition', () => {
  it('returns a LETTER-sized doc definition with a content array', () => {
    const def = buildReportDocDefinition(baseContent)
    expect(def.pageSize).toBe('LETTER')
    expect(Array.isArray(def.content)).toBe(true)
  })

  it('surfaces the attorney name somewhere in the document', () => {
    const def = buildReportDocDefinition(baseContent)
    const texts = collectTexts(def)
    expect(texts).toContain('Maya Hoffman')
  })

  it('shows NOT YET COMPLIANT when the report is not compliant', () => {
    const def = buildReportDocDefinition(baseContent)
    const texts = collectTexts(def)
    expect(texts).toContain('NOT YET COMPLIANT')
    expect(texts).not.toContain('COMPLIANT')
  })

  it('shows COMPLIANT when the report is compliant', () => {
    const def = buildReportDocDefinition({ ...baseContent, compliant: true })
    const texts = collectTexts(def)
    expect(texts).toContain('COMPLIANT')
    expect(texts).not.toContain('NOT YET COMPLIANT')
  })

  it('renders a requirements table with a header row plus one row per requirement', () => {
    const def = buildReportDocDefinition(baseContent)
    const tables = collectTables(def)
    const requirementsTable = tables.find(t => cellText(t.table.body[0]?.[0]) === 'REQUIREMENT')
    expect(requirementsTable).toBeDefined()
    expect(requirementsTable!.table.body).toHaveLength(baseContent.requirements.length + 1)
    // Every requirement label shows up somewhere in the table body.
    const rowTexts = requirementsTable!.table.body.flat().map(cellText).filter(Boolean)
    for (const r of baseContent.requirements) {
      expect(rowTexts.some(t => t?.includes(r.label))).toBe(true)
    }
  })

  it('renders a credits table with a header row plus one row per credit when credits exist', () => {
    const withCredits: ReportContent = {
      ...baseContent,
      credits: [
        { title: 'Ethics in the Age of AI', provider: 'PLI', date: '2026-03-04', hours: 4, participatory: true },
        { title: 'Implicit Bias & Fair Housing', provider: 'BASF', date: '2025-12-03', hours: 1, participatory: true },
      ],
    }
    const def = buildReportDocDefinition(withCredits)
    const tables = collectTables(def)
    const creditsTable = tables.find(t => cellText(t.table.body[0]?.[0]) === 'DATE')
    expect(creditsTable).toBeDefined()
    expect(creditsTable!.table.body).toHaveLength(withCredits.credits.length + 1)
    const rowTexts = creditsTable!.table.body.flat().map(cellText).filter(Boolean)
    for (const c of withCredits.credits) {
      expect(rowTexts.some(t => t?.includes(c.title))).toBe(true)
    }
  })

  it('falls back to a "no credits" message when there are no credits', () => {
    const def = buildReportDocDefinition({ ...baseContent, credits: [] })
    const texts = collectTexts(def)
    expect(texts.some(t => /no credits logged/i.test(t))).toBe(true)
    const tables = collectTables(def)
    expect(tables.find(t => cellText(t.table.body[0]?.[0]) === 'DATE')).toBeUndefined()
  })
})
