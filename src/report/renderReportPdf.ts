// ABOUTME: Renders assembled ReportContent to a jsPDF document (presentation only).
// ABOUTME: No data logic — every value comes from buildReportContent.
import { jsPDF } from 'jspdf'
import type { ReportContent } from './buildReportContent'

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function renderReportPdf(content: ReportContent): jsPDF {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' })
  const left = 48
  let y = 56
  const line = (text: string, size = 11, gap = 16) => {
    doc.setFontSize(size)
    doc.text(text, left, y)
    y += gap
  }

  line('California MCLE Compliance Report', 18, 26)
  line(`${content.name} · Group ${content.group}`, 12, 18)
  line(`Compliance period: ${formatDate(content.period.start)} – ${formatDate(content.period.end)} · report by ${formatDate(content.period.reportBy)}`, 10, 16)
  line(`Generated ${formatDate(content.generatedOn)}`, 10, 22)
  line(content.verdict, 12, 24)

  line('Requirements', 13, 18)
  for (const r of content.requirements) {
    // jsPDF's default Helvetica font only covers WinAnsiEncoding — '✓' (U+2713) falls outside
    // it and renders as a mangled glyph, unlike '•' (U+2022) which WinAnsi does include.
    // Use an ASCII-safe marker instead of chasing font coverage for one symbol.
    line(`${r.met ? '[x]' : '[ ]'} ${r.label}: ${r.earned} / ${r.required}`, 11, 15)
  }
  y += 8

  line('Credits by category', 13, 18)
  for (const cat of content.categories) {
    line(cat.label, 11, 15)
    if (cat.credits.length === 0) { line('  (none logged)', 10, 14); continue }
    for (const c of cat.credits) {
      line(`  ${c.title} — ${c.provider} · ${formatDate(c.date)} · ${c.hours} hr`, 10, 14)
    }
  }
  y += 10
  line(content.disclaimer, 9, 14)
  return doc
}
