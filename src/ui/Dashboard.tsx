// ABOUTME: Renders the requirements engine's output — the "Your requirement" empty state and,
// ABOUTME: once credits exist, "Still needed" / "Complete" lists — porting mockups.html#s-empty / #s-dash.
import { List } from './List'
import { Row } from './Row'
import { CategoryRow } from './CategoryRow'
import { SignInToSave } from './SignInToSave'
import { Disclaimer } from './Disclaimer'
import { ExportButton } from './ExportButton'
import { buildDashboardRows, type DashboardRow } from './dashboardRows'
import { formatDate } from './formatDate'
import type { ComplianceResult, Credit, Group, Period, RequirementProgress } from '../domain/types'
import type { UserProfile } from '../store/types'

export interface DashboardProps {
  name: string
  group: Group
  period: Period
  result: ComplianceResult
  credits: Credit[]
  today?: string
  accountState: UserProfile['accountState']
  onSignIn: () => void
  signInMessage?: string | null
  notice?: string | null
  onAddCredit: () => void
  onOpenCredit: (id: string) => void
  hasPastCycles?: boolean
  onOpenPastCycles?: () => void
}

function PastCyclesLink({ hasPastCycles, onOpenPastCycles }: { hasPastCycles?: boolean; onOpenPastCycles?: () => void }) {
  if (!hasPastCycles) return null
  return <button className="link" onClick={onOpenPastCycles}>Past cycles ›</button>
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

// Total hours and Participatory are plain, non-expandable rows in mockups.html#s-dash — no
// chevron, no credit panel. Only the subject-matter category rows use the CategoryRow accordion.
function isFlatRow(key: DashboardRow['key']): boolean {
  return key === 'total' || key === 'participatory'
}

function flatRowMeta(row: DashboardRow): string | undefined {
  if (row.met) return undefined
  const base = `${row.earned} of ${row.required}`
  return row.key === 'participatory' ? `live hours, not self-study · ${base}` : base
}

function FlatRequirementRow({ row }: { row: DashboardRow }) {
  const meta = flatRowMeta(row)
  return (
    <div className="item">
      <div className="row">
        <div className="t">
          <div className="n">{row.label}</div>
          {meta ? <div className="m q">{meta}</div> : null}
        </div>
        {row.met
          ? <><div className="val">{row.earned}/{row.required}</div><div className="ck">✓</div></>
          : <div className="need">+{hoursLabel(row.remaining)}</div>}
      </div>
    </div>
  )
}

// Never pass a date-only ISO string to `new Date()` for a diff — build both dates from
// their parts so the day count never shifts a day in US timezones.
function daysUntil(iso: string, today: string): number {
  const [ty, tm, td] = today.split('-').map(Number)
  const [y, m, d] = iso.split('-').map(Number)
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(ty, tm - 1, td)) / 86_400_000)
}

export function Dashboard({ name, group, period, result, credits, today = new Date().toISOString().slice(0, 10), accountState, onSignIn, signInMessage, notice, onAddCredit, onOpenCredit, hasPastCycles, onOpenPastCycles }: DashboardProps) {
  const topLevel = result.progress.filter(p => !p.parent)
  const totalRule = result.progress.find(p => p.key === 'total')

  if (credits.length === 0) {
    return (
      <div className="wrap">
        <SignInToSave accountState={accountState} onSignIn={onSignIn} />
        {signInMessage && <div className="note">{signInMessage}</div>}
        {notice && <div className="note">{notice}</div>}
        <h1 className="h1">Add your first credit</h1>
        <div className="sub">Reporting cycle: {formatDate(period.start)} – {formatDate(period.end)}</div>
        <div className="sub">{totalRule?.required} hours required · report by {formatDate(period.reportBy)}</div>

        <div className="label">Your requirement</div>
        <List>
          {topLevel.map(row => (
            <RequirementRow key={row.key} row={row} all={result.progress} />
          ))}
        </List>

        <button className="btn" onClick={onAddCredit}>Add a certificate</button>
        <PastCyclesLink hasPastCycles={hasPastCycles} onOpenPastCycles={onOpenPastCycles} />
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
      <SignInToSave accountState={accountState} onSignIn={onSignIn} />
      {signInMessage && <div className="note">{signInMessage}</div>}
      {notice && <div className="note">{notice}</div>}
      <h1 className="h1">{stillNeeded.length === 0 ? "You're compliant" : `${stillNeeded.length} requirement${stillNeeded.length === 1 ? '' : 's'} left`}</h1>
      <div className="sub">Reporting cycle: {formatDate(period.start)} – {formatDate(period.end)}</div>
      <div className="sub">Report by {formatDate(period.reportBy)} · {daysUntil(period.reportBy, today)} days left · {earned} of {total} hours logged</div>

      {stillNeeded.length > 0 && (
        <>
          <div className="label">Still needed</div>
          <div className="list">
            {stillNeeded.map(row => (
              isFlatRow(row.key)
                ? <FlatRequirementRow key={row.key} row={row} />
                : <CategoryRow key={row.key} row={row} onOpenCredit={onOpenCredit} />
            ))}
          </div>
        </>
      )}

      {complete.length > 0 && (
        <>
          <div className="label">Complete</div>
          <div className="list">
            {complete.map(row => (
              isFlatRow(row.key)
                ? <FlatRequirementRow key={row.key} row={row} />
                : <CategoryRow key={row.key} row={row} onOpenCredit={onOpenCredit} />
            ))}
          </div>
        </>
      )}

      <button className="btn" onClick={onAddCredit}>Add a certificate</button>
      <ExportButton name={name} group={group} period={period} result={result} credits={credits} today={today} />
      <PastCyclesLink hasPastCycles={hasPastCycles} onOpenPastCycles={onOpenPastCycles} />
      <Disclaimer />
    </div>
  )
}
