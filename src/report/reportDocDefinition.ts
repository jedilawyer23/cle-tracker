// ABOUTME: Builds the pdfmake document definition for the MCLE compliance report.
// ABOUTME: Pure — returns a plain doc-definition object; imports no pdfmake runtime, no I/O.
import type { ReportContent } from './buildReportContent'

const INK = '#14171C'
const MUTED = '#6B7075'
const HAIR = '#E4E7EB'
const ACCENT = '#E31937'
const DARK = '#16181C'
const GOOD = '#2FA968'
const GOOD_ON_DARK = '#3CD188'
const WARN = '#B25E00'
const AMBER_ON_DARK = '#FFB020'
const ZEBRA = '#F7F8FA'
const ON_DARK_SUB = '#C7CBD1'

const CONTENT_WIDTH = 612 - 42 * 2 // LETTER width minus L/R margins

function fmt(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function daysBetween(fromIso: string, toIso: string): number {
  const [ay, am, ad] = fromIso.split('-').map(Number)
  const [by, bm, bd] = toIso.split('-').map(Number)
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000)
}

// A dark table-header cell.
function th(text: string, alignment: 'left' | 'right' = 'left') {
  return { text, alignment, bold: true, fontSize: 8, characterSpacing: 0.8, color: '#FFFFFF' }
}

// Horizontal-hairline table layout with a dark header row and no vertical rules.
const tableLayout = {
  hLineWidth: (i: number, node: { table: { body: unknown[] } }) =>
    i === 0 || i === 1 || i === node.table.body.length ? 0.8 : 0.5,
  vLineWidth: () => 0,
  hLineColor: (i: number) => (i <= 1 ? INK : HAIR),
  paddingLeft: () => 9,
  paddingRight: () => 9,
  paddingTop: () => 6,
  paddingBottom: () => 6,
  fillColor: (rowIndex: number) => (rowIndex === 0 ? DARK : null),
}

export function buildReportDocDefinition(content: ReportContent): Record<string, unknown> {
  const total = content.requirements.find(r => r.label === 'Total hours')
  const earned = total?.earned ?? 0
  const required = total?.required ?? 25

  const requirementBody = [
    [th('REQUIREMENT'), th('REQUIRED', 'right'), th('EARNED', 'right'), th('REMAINING', 'right'), th('STATUS', 'right')],
    ...content.requirements.map(r => {
      const remaining = Math.max(0, r.required - r.earned)
      const isTotal = r.label === 'Total hours'
      return [
        { text: (r.sub ? '      ' : '') + r.label, color: r.sub ? MUTED : INK, italics: !!r.sub, bold: isTotal, fontSize: r.sub ? 9 : 10 },
        { text: String(r.required), alignment: 'right', color: MUTED, fontSize: 10 },
        { text: String(r.earned), alignment: 'right', bold: isTotal, fontSize: 10 },
        { text: remaining ? String(remaining) : '—', alignment: 'right', color: remaining ? WARN : MUTED, fontSize: 10 },
        { text: r.met ? 'Met' : 'Short', alignment: 'right', bold: true, fontSize: 9, color: r.met ? GOOD : WARN },
      ]
    }),
  ]

  const creditsTable = content.credits.length
    ? {
        table: {
          headerRows: 1,
          widths: ['auto', '*', 'auto', 'auto', 'auto'],
          body: [
            [th('DATE'), th('ACTIVITY'), th('PROVIDER'), th('HOURS', 'right'), th('TYPE', 'right')],
            ...content.credits.map((c, i) => {
              const fill = i % 2 === 1 ? ZEBRA : null
              return [
                { text: fmt(c.date), fontSize: 9, fillColor: fill },
                { text: c.title, fontSize: 9, fillColor: fill },
                { text: c.provider, fontSize: 9, color: MUTED, fillColor: fill },
                { text: c.hours.toFixed(1), fontSize: 9, alignment: 'right', fillColor: fill },
                { text: c.participatory ? 'Participatory' : 'Self-study', fontSize: 9, alignment: 'right', color: MUTED, fillColor: fill },
              ]
            }),
          ],
        },
        layout: tableLayout,
      }
    : { text: 'No credits logged in this cycle.', color: MUTED, italics: true, margin: [0, 2, 0, 0] }

  return {
    pageSize: 'LETTER',
    pageMargins: [42, 76, 42, 52],
    defaultStyle: { font: 'Roboto', fontSize: 10, color: INK, lineHeight: 1.15 },

    header: () => ({
      margin: [42, 26, 42, 0],
      stack: [
        {
          columns: [
            { text: 'MCLE COMPLIANCE REPORT', characterSpacing: 2, bold: true, fontSize: 10.5, color: INK },
            { text: 'CALIFORNIA STATE BAR', characterSpacing: 1.5, bold: true, fontSize: 8, color: MUTED, alignment: 'right', margin: [0, 2, 0, 0] },
          ],
        },
        { canvas: [{ type: 'line', x1: 0, y1: 7, x2: CONTENT_WIDTH, y2: 7, lineWidth: 1.5, lineColor: ACCENT }] },
      ],
    }),

    footer: (currentPage: number, pageCount: number) => ({
      margin: [42, 6, 42, 0],
      columns: [
        { text: content.disclaimer, fontSize: 7.5, color: MUTED, width: '*' },
        { text: `Generated ${fmt(content.generatedOn)}   ·   ${currentPage} / ${pageCount}`, fontSize: 7.5, color: MUTED, alignment: 'right', width: 'auto' },
      ],
    }),

    content: [
      { text: content.name, fontSize: 22, bold: true, margin: [0, 4, 0, 2] },
      {
        text: `Group ${content.group}      ·      ${fmt(content.period.start)} – ${fmt(content.period.end)}      ·      Report by ${fmt(content.period.reportBy)}`,
        color: MUTED, fontSize: 10, margin: [0, 0, 0, 14],
      },

      // Status banner — dark instrument panel, one accent-colored status word.
      {
        table: {
          widths: ['*'],
          body: [[{
            fillColor: DARK,
            margin: [16, 13, 16, 13],
            stack: [
              { text: content.compliant ? 'COMPLIANT' : 'NOT YET COMPLIANT', bold: true, fontSize: 16, characterSpacing: 1, color: content.compliant ? GOOD_ON_DARK : AMBER_ON_DARK },
              { text: `${content.metCount} of ${content.totalCount} requirements met      ·      ${earned} of ${required} hours logged      ·      ${Math.max(0, daysBetween(content.generatedOn, content.period.reportBy))} days to report`, fontSize: 10, color: ON_DARK_SUB, margin: [0, 4, 0, 0] },
            ],
          }]],
        },
        layout: 'noBorders',
        margin: [0, 0, 0, 20],
      },

      { text: 'REQUIREMENTS', characterSpacing: 1.5, bold: true, fontSize: 9, color: MUTED, margin: [0, 0, 0, 7] },
      { table: { headerRows: 1, widths: ['*', 52, 46, 66, 60], body: requirementBody }, layout: tableLayout, margin: [0, 0, 0, 20] },

      { text: 'CREDITS LOGGED · CURRENT CYCLE', characterSpacing: 1.5, bold: true, fontSize: 9, color: MUTED, margin: [0, 0, 0, 7] },
      creditsTable,
    ],
  }
}
