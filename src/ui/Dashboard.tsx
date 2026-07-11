// ABOUTME: Renders the requirements engine's output as a single unified bar-row list (earned/
// ABOUTME: required/check per requirement), populated or empty — ports table-mocks.html Option A.
import { BarRow } from './BarRow'
import { SignInToSave } from './SignInToSave'
import { Disclaimer } from './Disclaimer'
import { buildDashboardRows, type DashboardRow } from './dashboardRows'
import { formatDate } from './formatDate'
import type { ComplianceResult, Credit, Period } from '../domain/types'
import type { UserProfile } from '../store/types'

export interface DashboardProps {
  name: string
  photoURL?: string | null
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
  onSettings?: () => void
  onOpenReport?: () => void
}

function PastCyclesLink({ hasPastCycles, onOpenPastCycles }: { hasPastCycles?: boolean; onOpenPastCycles?: () => void }) {
  if (!hasPastCycles) return null
  return <button className="link" onClick={onOpenPastCycles}>Past cycles ›</button>
}

// Total hours and Participatory are plain, non-expandable rows in the mockup — no chevron, no
// credit panel. Only the subject-matter category rows are accordions.
function isExpandable(key: DashboardRow['key']): boolean {
  return key !== 'total' && key !== 'participatory'
}

// Never pass a date-only ISO string to `new Date()` for a diff — build both dates from
// their parts so the day count never shifts a day in US timezones. Clamped at 0 (like
// ReportView's daysBetween) — once the deadline passes, the overdue state below takes over.
function daysUntil(iso: string, today: string): number {
  const [ty, tm, td] = today.split('-').map(Number)
  const [y, m, d] = iso.split('-').map(Number)
  return Math.max(0, Math.round((Date.UTC(y, m - 1, d) - Date.UTC(ty, tm - 1, td)) / 86_400_000))
}

function RequirementsList({ rows, onOpenCredit }: { rows: DashboardRow[]; onOpenCredit: (id: string) => void }) {
  return (
    <div className="list">
      {rows.map(row => (
        <BarRow key={row.key} row={row} expandable={isExpandable(row.key)} onOpenCredit={onOpenCredit} />
      ))}
    </div>
  )
}

export function Dashboard({ name, photoURL, period, result, credits, today = new Date().toISOString().slice(0, 10), accountState, onSignIn, signInMessage, notice, onAddCredit, onOpenCredit, hasPastCycles, onOpenPastCycles, onSettings, onOpenReport }: DashboardProps) {
  const totalRule = result.progress.find(p => p.key === 'total')!
  // Carry-forward (M1 review, item 1): the headline count and the parent-complete gating both
  // come from buildDashboardRows — the same unified rows that are rendered, so "N requirements
  // left" always equals the number of unmet rows in the visible list below.
  const rows = buildDashboardRows(result, credits)
  const unmetCount = rows.filter(r => !r.met).length

  if (credits.length === 0) {
    return (
      <div className="wrap">
        <SignInToSave accountState={accountState} onSignIn={onSignIn} name={name} photoURL={photoURL} brand onSettings={onSettings} />
        {signInMessage && <div className="note">{signInMessage}</div>}
        {notice && <div className="note">{notice}</div>}
        <h1 className="h1">Add your first credit</h1>
        <div className="sub">Reporting cycle: {formatDate(period.start)} – {formatDate(period.end)}</div>
        <div className="submeta">{totalRule.required} hours required · report by {formatDate(period.reportBy)}</div>

        <div className="label">Requirements</div>
        <RequirementsList rows={rows} onOpenCredit={onOpenCredit} />

        <button className="btn" onClick={onAddCredit}>Add a certificate</button>
        <PastCyclesLink hasPastCycles={hasPastCycles} onOpenPastCycles={onOpenPastCycles} />
        <div className="note">Upload a certificate and we'll sort it into the right categories. Not legal advice — verify with the State Bar of California.</div>
      </div>
    )
  }

  const earned = totalRule.earned
  const total = totalRule.required

  return (
    <div className="wrap">
      <SignInToSave accountState={accountState} onSignIn={onSignIn} name={name} photoURL={photoURL} brand onSettings={onSettings} />
      {signInMessage && <div className="note">{signInMessage}</div>}
      {notice && <div className="note">{notice}</div>}
      <h1 className="h1">{unmetCount === 0 ? "You're compliant" : `${unmetCount} requirement${unmetCount === 1 ? '' : 's'} left`}</h1>
      <div className="sub">Reporting cycle: {formatDate(period.start)} – {formatDate(period.end)}</div>
      <div className="submeta">Report by {formatDate(period.reportBy)} · {today > period.reportBy ? 'Overdue' : `${daysUntil(period.reportBy, today)} days left`} · {earned} of {total} hours logged</div>

      <div className="label">Requirements</div>
      <RequirementsList rows={rows} onOpenCredit={onOpenCredit} />

      <button className="btn" onClick={onAddCredit}>Add a certificate</button>
      <button className="btn tinted" onClick={onOpenReport}>Export report (PDF)</button>
      <PastCyclesLink hasPastCycles={hasPastCycles} onOpenPastCycles={onOpenPastCycles} />
      <Disclaimer />
    </div>
  )
}
