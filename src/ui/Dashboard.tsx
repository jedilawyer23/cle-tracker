// ABOUTME: Renders the requirements engine's output — the "Your requirement" empty state and,
// ABOUTME: once credits exist, "Still needed" / "Complete" lists — porting mockups.html#s-empty / #s-dash.
import { List } from './List'
import { Row } from './Row'
import { CategoryRow } from './CategoryRow'
import { buildDashboardRows } from './dashboardRows'
import { formatDate } from './formatDate'
import type { ComplianceResult, Credit, Group, Period, RequirementProgress } from '../domain/types'

export interface DashboardProps {
  name: string
  group: Group
  period: Period
  result: ComplianceResult
  credits: Credit[]
  today?: string
  onAddCredit: () => void
  onOpenCredit: (id: string) => void
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

// Never pass a date-only ISO string to `new Date()` for a diff — build both dates from
// their parts so the day count never shifts a day in US timezones.
function daysUntil(iso: string, today: string): number {
  const [ty, tm, td] = today.split('-').map(Number)
  const [y, m, d] = iso.split('-').map(Number)
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(ty, tm - 1, td)) / 86_400_000)
}

export function Dashboard({ group, period, result, credits, today = new Date().toISOString().slice(0, 10), onAddCredit, onOpenCredit }: DashboardProps) {
  const topLevel = result.progress.filter(p => !p.parent)
  const totalRule = result.progress.find(p => p.key === 'total')

  if (credits.length === 0) {
    return (
      <div className="wrap">
        <div className="topline"><div className="sp" /></div>
        <h1 className="h1">Add your first credit</h1>
        <div className="sub">Group {group} · {totalRule?.required} hours due by {formatDate(period.reportBy)}</div>

        <div className="label">Your requirement</div>
        <List>
          {topLevel.map(row => (
            <RequirementRow key={row.key} row={row} all={result.progress} />
          ))}
        </List>

        <button className="btn" onClick={onAddCredit}>Add a certificate</button>
        <div className="note">Upload a certificate and we'll sort it into the right categories. Not legal advice — verify with the State Bar of California.</div>
      </div>
    )
  }

  // Carry-forward (M1 review, item 1): the headline count and the parent-complete gating
  // both come from buildDashboardRows — the same top-level, sub-minimum-folded rows that
  // are rendered, so "N requirements left" always equals the visible Still-needed rows.
  const { stillNeeded, complete } = buildDashboardRows(result, credits)
  const earned = result.progress.find(p => p.key === 'total')!.earned
  const total = result.progress.find(p => p.key === 'total')!.required

  return (
    <div className="wrap">
      <div className="topline"><div className="sp" /></div>
      <h1 className="h1">{stillNeeded.length === 0 ? "You're compliant" : `${stillNeeded.length} requirement${stillNeeded.length === 1 ? '' : 's'} left`}</h1>
      <div className="sub">Group {group} · {daysUntil(period.reportBy, today)} days left · {earned} of {total} hours logged</div>

      {stillNeeded.length > 0 && (
        <>
          <div className="label">Still needed</div>
          <div className="list">
            {stillNeeded.map(row => (
              <CategoryRow key={row.key} row={row} onOpenCredit={onOpenCredit} />
            ))}
          </div>
        </>
      )}

      {complete.length > 0 && (
        <>
          <div className="label">Complete</div>
          <div className="list">
            {complete.map(row => (
              <CategoryRow key={row.key} row={row} onOpenCredit={onOpenCredit} />
            ))}
          </div>
        </>
      )}

      <button className="btn" onClick={onAddCredit}>Add a certificate</button>
      <div className="note">Not legal advice — confirm your compliance with the State Bar of California.</div>
    </div>
  )
}
