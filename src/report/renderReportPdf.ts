// ABOUTME: Renders the compliance report to a downloadable PDF via pdfmake.
// ABOUTME: Presentation only — the document definition comes from buildReportDocDefinition.
import type { ReportContent } from './buildReportContent'
import { buildReportDocDefinition } from './reportDocDefinition'

export async function renderReportPdf(content: ReportContent, fileName = 'mcle-compliance-report.pdf'): Promise<void> {
  const [pdfMakeMod, vfsMod] = await Promise.all([
    import('pdfmake/build/pdfmake'),
    import('pdfmake/build/vfs_fonts'),
  ])
  const pdfMake = (pdfMakeMod as unknown as { default?: any }).default ?? (pdfMakeMod as any)
  pdfMake.vfs = (vfsMod as unknown as { default?: any }).default ?? (vfsMod as any)
  pdfMake.createPdf(buildReportDocDefinition(content)).download(fileName)
}
