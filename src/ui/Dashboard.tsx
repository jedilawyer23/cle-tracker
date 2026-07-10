// ABOUTME: Renders the requirements engine's output — the "Your requirement" empty state and,
// ABOUTME: once credits exist, "Still needed" / "Complete" lists — porting mockups.html#s-empty / #s-dash.
import { List } from './List'
import { Row } from './Row'
import type { ComplianceResult, Group, Period, RequirementProgress } from '../domain/types'

export interface DashboardProps {
  name: string
  group: Group
  period: Period
  result: ComplianceResult
}

// Never pass a date-only ISO string to `new Date()` — it parses as UTC midnight and
// renders a day early in every US timezone. Build the date from its parts instead.
function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function hoursLabel(hours: number): string {
  return `${hours} hr${hours === 1 ? '' : 's'}`
}

function metaFor(row: RequirementProgress, all: RequirementProgress[]): string | undefined {
  if (row.key === 'participatory') return 'live hours, not self-study'
  const child = all.find(p => p.parent === row.key)
  if (!child) return undefined
  return `incl. ${hoursLabel(child.required)} ${child.label}`
}

function RequirementRow({ row, all }: { row: RequirementProgress; all: RequirementProgress[] }) {
  return (
    <Row
      label={row.label}
      meta={metaFor(row, all)}
      trailing={<div className="need">{row.earned} / {row.required}</div>}
    />
  )
}

export function Dashboard({ group, period, result }: DashboardProps) {
  const topLevel = result.progress.filter(p => !p.parent)
  const totalRule = result.progress.find(p => p.key === 'total')
  const hasCredits = result.progress.some(p => p.earned > 0)

  return (
    <div className="wrap">
      <div className="topline"><div className="sp" /></div>
      <h1 className="h1">{hasCredits ? `${result.totalCount - result.metCount} requirements left` : 'Add your first credit'}</h1>
      <div className="sub">Group {group} · {totalRule?.required} hours due by {formatDate(period.reportBy)}</div>

      {hasCredits ? (
        <>
          <div className="label">Still needed</div>
          <List>
            {topLevel.filter(p => !p.met).map(row => (
              <RequirementRow key={row.key} row={row} all={result.progress} />
            ))}
          </List>

          <div className="label">Complete</div>
          <List>
            {topLevel.filter(p => p.met).map(row => (
              <RequirementRow key={row.key} row={row} all={result.progress} />
            ))}
          </List>
        </>
      ) : (
        <>
          <div className="label">Your requirement</div>
          <List>
            {topLevel.map(row => (
              <RequirementRow key={row.key} row={row} all={result.progress} />
            ))}
          </List>
        </>
      )}

      <button className="btn">Add a certificate</button>
      <div className="note">Upload a certificate and we'll sort it into the right categories. Not legal advice — verify with the State Bar of California.</div>
    </div>
  )
}
