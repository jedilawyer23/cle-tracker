// ABOUTME: A unified dashboard requirement row — label+meta, a thin progress bar, aligned
// ABOUTME: earned/required/check columns, and (for category rows) an expandable credits accordion.
import { useState } from 'react'
import type { DashboardRow } from './dashboardRows'
import { hoursToward } from '../domain/creditContribution'
import { formatDate } from './formatDate'
import { formatHours } from './formatHours'

const ChevDown = () => (
  <svg className="chev" width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M3.25 6 8 10.75 12.75 6" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
const ChevRight = () => (
  <svg className="chev" width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M6 3.25 10.75 8 6 12.75" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

function hoursLabel(hrs: number) { return `${hrs} hr${hrs === 1 ? '' : 's'}` }

// Sub-minimums (e.g. Prevention & Detection, Implicit Bias) aren't separate rows — they show as
// muted meta text under their parent, unconditionally (table-mocks.html Option A shows "incl. 1 hr
// Implicit Bias" under Elimination of Bias even once that row is met — it's informational, not a
// warning; the earned/required columns already carry the met/short state).
function metaFor(row: DashboardRow): string | undefined {
  if (row.key === 'participatory') return 'live hours, not self-study'
  if (row.children.length) return row.children.map(c => `incl. ${hoursLabel(c.required)} ${c.label}`).join(' · ')
  return undefined
}

// The in-panel hint mirrors mockups.html #s-dash: an unmet row keeps showing "Still need N hr,
// including <sub-minimum>." even after it has contributing credits (e.g. Competence 1/2 with
// Prevention & Detection still 0/1 shows both the counted credit and this hint).
function gapHint(row: DashboardRow): string {
  const hours = hoursLabel(row.remaining)
  const unmetChild = row.children.find(c => !c.met)
  return unmetChild ? `Still need ${hours}, including ${unmetChild.label}.` : `Still need ${hours}.`
}

// Percent of the bar to fill, clamped 0-100 and floored at 2 so a 0-hour row still shows a tick
// (table-mocks.html Option A: `Math.max(p, 2)`).
function fillPercent(earned: number, required: number): number {
  const pct = required > 0 ? Math.round((earned / required) * 100) : 0
  return Math.max(Math.min(pct, 100), 2)
}

interface Props {
  row: DashboardRow
  expandable: boolean
  onOpenCredit: (id: string) => void
}

export function BarRow({ row, expandable, onOpenCredit }: Props) {
  const [open, setOpen] = useState(false)
  const meta = metaFor(row)
  const rawPct = row.required > 0 ? (row.earned / row.required) * 100 : 0
  const fillClass = row.met ? 'g' : rawPct > 0 ? 'a' : 'o'

  return (
    <div className={`item${expandable && open ? ' open' : ''}`}>
      <div
        className={expandable ? 'rowbar tap' : 'rowbar'}
        onClick={expandable ? () => setOpen(o => !o) : undefined}
      >
        <div className="rn">
          {row.label}
          {meta && <div className="rm">{meta}</div>}
        </div>
        <div className="pbar"><i className={fillClass} style={{ width: `${fillPercent(row.earned, row.required)}%` }} /></div>
        <div className={`ev ${row.met ? 'met' : 'short'}`}>{formatHours(row.earned)}</div>
        <div className="rv">/ {row.required}</div>
        <div className="chkcol">{row.met && <span className="ck">✓</span>}</div>
        <div className="chevcol">{expandable && <ChevDown />}</div>
      </div>
      {expandable && (
        <div className="credits">
          {row.credits.length === 0 && (
            <div className="empty">No {row.label.toLowerCase()} CLE yet — add one to close this.</div>
          )}
          {row.credits.map(c => (
            <div className="crow" key={c.id} onClick={() => onOpenCredit(c.id)}>
              <div className="t">
                <div className="cn">{c.activityTitle}</div>
                <div className="cm">{c.provider} · {formatDate(c.completionDate)}</div>
              </div>
              <div className="chn">{hoursToward(row.key, c).toFixed(1)} hr</div>
              <ChevRight />
            </div>
          ))}
          {!row.met && row.credits.length > 0 && (
            <div className="empty">{gapHint(row)}</div>
          )}
        </div>
      )}
    </div>
  )
}
