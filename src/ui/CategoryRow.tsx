// ABOUTME: An expandable dashboard requirement row revealing its contributing CLEs.
// ABOUTME: Ports the item/row/credits/crow accordion markup from mockups.html #s-dash.
import { useState } from 'react'
import type { DashboardRow } from './dashboardRows'
import { hoursToward } from '../domain/creditContribution'
import { formatDate } from './formatDate'

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

function remainingLabel(hrs: number) { return `+${hrs} hr${hrs === 1 ? '' : 's'}` }

function metaText(row: DashboardRow): string {
  if (row.key === 'participatory') return `live hours, not self-study · ${row.earned} of ${row.required}`
  if (row.children.length) return row.children.map(c => `incl. ${c.required} hr ${c.label}`).join(' · ')
  return `${row.earned} of ${row.required}`
}

// The in-panel hint mirrors mockups.html #s-dash: an unmet row keeps showing "Still need N hr,
// including <sub-minimum>." even after it has contributing credits (e.g. Competence 1/2 with
// Prevention & Detection still 0/1 shows both the counted credit and this hint).
function gapHint(row: DashboardRow): string {
  const hours = `${row.remaining} hr${row.remaining === 1 ? '' : 's'}`
  const unmetChild = row.children.find(c => !c.met)
  return unmetChild ? `Still need ${hours}, including ${unmetChild.label}.` : `Still need ${hours}.`
}

interface Props { row: DashboardRow; onOpenCredit: (id: string) => void }

export function CategoryRow({ row, onOpenCredit }: Props) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`item${open ? ' open' : ''}`}>
      <div className="row tap" onClick={() => setOpen(o => !o)}>
        <div className="t">
          <div className="n">{row.label}</div>
          {/* Completed rows have no meta line in the mockup (e.g. Legal Ethics 4/4). */}
          {!row.met && <div className="m q">{metaText(row)}</div>}
        </div>
        {row.met
          ? <><div className="val">{row.earned}/{row.required}</div><div className="ck">✓</div></>
          : <div className="need">{remainingLabel(row.remaining)}</div>}
        <ChevDown />
      </div>
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
    </div>
  )
}
