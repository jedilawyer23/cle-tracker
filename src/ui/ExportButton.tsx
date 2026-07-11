// ABOUTME: One-tap "Export report (PDF)" button — assembles content, renders, and downloads.
// ABOUTME: Client-side generation; injectable onExport seam keeps the render out of the unit test.
import { buildReportContent, type ReportContent, type ReportInput } from '../report/buildReportContent'
import { renderReportPdf } from '../report/renderReportPdf'

interface Props extends ReportInput {
  onExport?: (content: ReportContent) => void
}

export function ExportButton({ onExport, ...input }: Props) {
  const handleClick = () => {
    const content = buildReportContent(input)
    if (onExport) { onExport(content); return }
    void renderReportPdf(content, `MCLE-report-${content.generatedOn}.pdf`)
  }
  return (
    <button className="btn" onClick={handleClick}>Export report (PDF)</button>
  )
}
