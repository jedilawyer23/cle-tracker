// ABOUTME: Compliance report — a styled preview screen plus a "Save as PDF" that hands the reader
// ABOUTME: a real PDF file (native <a download>), the delivery iOS Safari actually supports.
import { useEffect, useRef, useState } from 'react'
import type { ReportContent } from './buildReportContent'
import { generateReportPdfBlob } from './generateReportPdf'
import { formatDate } from '../ui/formatDate'

function daysBetween(fromIso: string, toIso: string): number {
  const [ay, am, ad] = fromIso.split('-').map(Number)
  const [by, bm, bd] = toIso.split('-').map(Number)
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86_400_000)
}

interface Props {
  content: ReportContent
  onBack: () => void
  /** Injectable so tests skip the real pdfmake dynamic import. */
  generatePdf?: (content: ReportContent) => Promise<Blob>
}

export function ReportView({ content, onBack, generatePdf = generateReportPdfBlob }: Props) {
  const total = content.requirements.find(r => r.label === 'Total hours')
  const earned = total?.earned ?? 0
  const required = total?.required ?? 25
  const daysToReport = Math.max(0, daysBetween(content.generatedOn, content.period.reportBy))

  // Build the PDF in the background the moment the report opens, so it's ready by the time the
  // reader reaches "Save as PDF". The finished blob is handed to a native <a download> — on iOS
  // that opens the PDF for saving to Files, which window.print() fails to do.
  const [url, setUrl] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const urlRef = useRef<string | null>(null)
  const contentKey = JSON.stringify(content)
  useEffect(() => {
    let cancelled = false
    setUrl(null)
    setFailed(false)
    generatePdf(content).then(blob => {
      if (cancelled) return
      const fresh = URL.createObjectURL(blob)
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
      urlRef.current = fresh
      setUrl(fresh)
    }).catch(() => { if (!cancelled) setFailed(true) })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentKey, retryCount])
  useEffect(() => () => { if (urlRef.current) URL.revokeObjectURL(urlRef.current) }, [])

  return (
    <>
      <div className="report-actions">
        <button className="back" onClick={onBack}>‹ Back</button>
        <div className="sp" />
        {url
          ? <a className="navbtn" href={url} download={`MCLE-report-${content.generatedOn}.pdf`}>Save as PDF</a>
          : failed
            ? <button type="button" className="navbtn" onClick={() => setRetryCount(n => n + 1)}>Couldn't build the PDF — Retry</button>
            : <button type="button" className="navbtn" disabled>Preparing…</button>}
      </div>

      <div className="report">
        <div className="rep-head">
          <span className="rep-kicker">MCLE Compliance Report</span>
          <span className="rep-kicker rep-kicker-r">California State Bar</span>
        </div>
        <div className="rep-rule" />

        <h1 className="rep-name" tabIndex={-1}>{content.name}</h1>
        <div className="rep-sub">
          Group {content.group}&ensp;·&ensp;{formatDate(content.period.start)} – {formatDate(content.period.end)}
          &ensp;·&ensp;Report by {formatDate(content.period.reportBy)}
        </div>

        <div className={`rep-banner ${content.compliant ? 'ok' : 'warn'}`}>
          <div className="rep-verdict">{content.compliant ? 'Compliant' : 'Not yet compliant'}</div>
          <div className="rep-stats">
            {content.metCount} of {content.totalCount} requirements met&ensp;·&ensp;
            {earned} of {required} hours logged&ensp;·&ensp;{daysToReport} days to report
          </div>
        </div>

        <div className="rep-label">Requirements</div>
        <div className="rep-tablewrap">
        <table className="rep-table">
          <thead>
            <tr>
              <th>Requirement</th>
              <th className="r">Required</th>
              <th className="r">Earned</th>
              <th className="r">Remaining</th>
              <th className="r">Status</th>
            </tr>
          </thead>
          <tbody>
            {content.requirements.map(r => {
              const remaining = Math.max(0, r.required - r.earned)
              return (
                <tr key={r.label} className={r.sub ? 'sub' : undefined}>
                  <td>{r.label}</td>
                  <td className="r muted">{r.required}</td>
                  <td className="r">{r.earned}</td>
                  <td className={`r ${remaining ? 'warn-t' : 'muted'}`}>{remaining || '—'}</td>
                  <td className={`r status ${r.met ? 'met' : 'short'}`}>{r.met ? 'Met' : 'Short'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        </div>

        <div className="rep-label">Credits logged · current cycle</div>
        {content.credits.length === 0 ? (
          <div className="rep-empty">No credits logged in this cycle.</div>
        ) : (
          <div className="rep-tablewrap">
          <table className="rep-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Activity</th>
                <th>Provider</th>
                <th className="r">Hours</th>
                <th className="r">Type</th>
              </tr>
            </thead>
            <tbody>
              {content.credits.map((c, i) => (
                <tr key={`${c.title}-${c.date}-${i}`} className={i % 2 ? 'zebra' : undefined}>
                  <td>{formatDate(c.date)}</td>
                  <td>{c.title}</td>
                  <td className="muted">{c.provider}</td>
                  <td className="r">{c.hours.toFixed(1)}</td>
                  <td className="r muted">{c.participatory ? 'Participatory' : 'Self-study'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}

        <div className="rep-foot">{content.disclaimer}&ensp;·&ensp;Generated {formatDate(content.generatedOn)}</div>
      </div>
    </>
  )
}
