// ABOUTME: Renders the compliance report to a PDF Blob via pdfmake (dynamically imported so the
// ABOUTME: ~PDF engine is only loaded when the report screen opens, never at app startup).
import type { ReportContent } from './buildReportContent'
import { buildReportDocDefinition } from './reportDocDefinition'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PdfMake = { vfs: unknown; createPdf: (def: unknown) => { getBlob: () => Promise<Blob> } }

export async function generateReportPdfBlob(content: ReportContent): Promise<Blob> {
  const [pdfMakeMod, vfsMod] = await Promise.all([
    import('pdfmake/build/pdfmake'),
    import('pdfmake/build/vfs_fonts'),
  ])
  const mod = pdfMakeMod as unknown as { default?: PdfMake } & PdfMake
  const pdfMake = mod.default ?? mod
  pdfMake.vfs = (vfsMod as unknown as { default?: unknown }).default ?? (vfsMod as unknown)
  return pdfMake.createPdf(buildReportDocDefinition(content)).getBlob()
}
