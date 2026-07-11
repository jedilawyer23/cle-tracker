// ABOUTME: Turns the compliance report content into a downloadable PDF blob URL via pdfmake.
// ABOUTME: Presentation only — the document definition comes from buildReportDocDefinition.
import type { ReportContent } from './buildReportContent'
import { buildReportDocDefinition } from './reportDocDefinition'

// Returns an object URL for the rendered PDF. Callers should URL.revokeObjectURL it once the
// download is no longer needed. Uses pdfmake's promise-based getBlob() (0.3+) rather than
// download() — download() triggers its own anchor click after async work completes, which
// Safari treats as no longer tied to the user's gesture and silently blocks. Pre-generating the
// blob and handing its object URL to a real <a download> anchor keeps the click gesture-driven.
export async function generateReportBlobUrl(content: ReportContent): Promise<string> {
  const [pdfMakeMod, vfsMod] = await Promise.all([
    import('pdfmake/build/pdfmake'),
    import('pdfmake/build/vfs_fonts'),
  ])
  const pdfMake = (pdfMakeMod as unknown as { default?: any }).default ?? (pdfMakeMod as any)
  pdfMake.vfs = (vfsMod as unknown as { default?: any }).default ?? (vfsMod as any)
  const def = buildReportDocDefinition(content)
  const blob: Blob = await pdfMake.createPdf(def).getBlob()
  return URL.createObjectURL(blob)
}
