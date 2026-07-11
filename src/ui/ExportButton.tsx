// ABOUTME: One-tap "Export report (PDF)" — pre-generates the PDF blob URL so the eventual click
// ABOUTME: is a native <a download>, keeping the download tied to the click gesture even in Safari.
import { useEffect, useRef, useState } from 'react'
import { buildReportContent, type ReportContent, type ReportInput } from '../report/buildReportContent'
import { generateReportBlobUrl } from '../report/renderReportPdf'

interface Props extends ReportInput {
  onExport?: (content: ReportContent) => void
}

export function ExportButton({ onExport, ...input }: Props) {
  const content = buildReportContent(input)
  const contentKey = JSON.stringify(content)
  const [url, setUrl] = useState<string | null>(null)
  const urlRef = useRef<string | null>(null)

  // Regenerate whenever the report input actually changes (contentKey, not the input object
  // identity, which would churn every render). A stale resolution — one superseded by a newer
  // report input before it settles — is revoked immediately instead of replacing the live URL.
  useEffect(() => {
    if (onExport) return
    let cancelled = false
    setUrl(null)
    generateReportBlobUrl(content).then(freshUrl => {
      if (cancelled) {
        URL.revokeObjectURL(freshUrl)
        return
      }
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
      urlRef.current = freshUrl
      setUrl(freshUrl)
    }).catch(() => {
      // Generation failed (e.g. offline chunk load) — stay in the "Preparing…" state rather
      // than crash; the effect will retry automatically if the report input changes again.
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentKey, onExport])

  // Final cleanup on unmount only — mid-life revocation happens above, as each URL is replaced.
  useEffect(() => () => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current)
  }, [])

  if (onExport) {
    return (
      <button className="btn" onClick={() => onExport(content)}>Export report (PDF)</button>
    )
  }

  if (!url) {
    return (
      <button className="btn" disabled>Preparing report…</button>
    )
  }

  return (
    <a className="btn" href={url} download={`MCLE-report-${content.generatedOn}.pdf`}>Export report (PDF)</a>
  )
}
