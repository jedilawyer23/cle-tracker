// ABOUTME: "Get started" onboarding screen — name entry that derives and previews the MCLE
// ABOUTME: requirement (group, deadline, total hours) before continuing, porting mockups.html#s-setup.
import { useState } from 'react'
import { List } from './List'
import { Row } from './Row'
import { Disclaimer } from './Disclaimer'
import { deriveGroup } from '../domain/deriveGroup'
import { resolvePeriod } from '../domain/resolvePeriod'
import { GROUP_CALENDAR, REQUIREMENT_RULES } from '../domain/requirements'
import type { Group, Period } from '../domain/types'
import { formatDate } from './formatDate'
import { lastToken } from './lastToken'

export interface FirstRunResult {
  name: string
  group: Group
  period: Period
}

export interface FirstRunProps {
  onContinue: (result: FirstRunResult) => void
  today?: string
}

const LETTER_RANGE: Record<Group, string> = { 1: 'A–G', 2: 'H–M', 3: 'N–Z' }

export function FirstRun({ onContinue, today = new Date().toISOString().slice(0, 10) }: FirstRunProps) {
  const [name, setName] = useState('')

  const derivedGroup = (() => {
    const token = lastToken(name)
    if (!token) return null
    try {
      return deriveGroup(token)
    } catch {
      return null
    }
  })()
  const derived = derivedGroup !== null
    ? { group: derivedGroup, period: resolvePeriod(GROUP_CALENDAR[derivedGroup], today) }
    : null
  const totalRule = REQUIREMENT_RULES.find(r => r.key === 'total')!

  return (
    <div className="wrap">
      <div className="topline"><div className="sp" /></div>
      <h1 className="h1">Get started</h1>
      <div className="sub">Enter your name and we'll set your California MCLE requirement.</div>

      <div className="label">Your name</div>
      <List>
        <div className="field">
          <label htmlFor="firstrun-name">Full name</label>
          <input
            id="firstrun-name"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>
      </List>

      {derived && (
        <>
          <div className="label">Your requirement</div>
          <List>
            <Row
              label={`Group ${derived.group} · ${LETTER_RANGE[derived.group]}`}
              trailing={<div className="val">due {formatDate(derived.period.reportBy)}</div>}
            />
            <Row
              label="Total"
              trailing={<div className="val">{totalRule.minimumHours} hours</div>}
            />
          </List>
        </>
      )}

      <button
        className="btn"
        disabled={!derived}
        onClick={() => derived && onContinue({ name, group: derived.group, period: derived.period })}
      >
        Continue
      </button>
      <div className="note">No sign-in needed — save with Google later.</div>
      <Disclaimer />
    </div>
  )
}
