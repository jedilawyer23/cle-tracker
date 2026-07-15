// ABOUTME: "Get started" onboarding screen — name entry that derives and previews the MCLE
// ABOUTME: requirement (group, deadline, total hours) before continuing, porting mockups.html#s-setup.
import { useState } from 'react'
import { List } from './List'
import { Row } from './Row'
import { Disclaimer } from './Disclaimer'
import { LegalFooter } from './LegalFooter'
import { Wordmark } from './Wordmark'
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
  /** Prefills the name field — used when reopening this screen to edit an existing profile. */
  initialName?: string
  /** Renders a leading "‹ Back" control instead of the wordmark — used by the edit screen. */
  onBack?: () => void
  /** 'edit' swaps the setup copy/CTA for editing an existing name; defaults to onboarding. */
  mode?: 'setup' | 'edit'
  /** Opens the Privacy Policy screen from the legal footer; footer is hidden when omitted. */
  onOpenPrivacy?: () => void
  /** Opens the Terms of Use screen from the legal footer; footer is hidden when omitted. */
  onOpenTerms?: () => void
}

const LETTER_RANGE: Record<Group, string> = { 1: 'A–G', 2: 'H–M', 3: 'N–Z' }

export function FirstRun({
  onContinue,
  today = new Date().toISOString().slice(0, 10),
  initialName = '',
  onBack,
  mode = 'setup',
  onOpenPrivacy,
  onOpenTerms,
}: FirstRunProps) {
  const [name, setName] = useState(initialName)
  // Surname derivation can be wrong for unusual name formats — lets the user pick their real
  // group instead. Cleared whenever the name changes, since a stale override could otherwise
  // silently override a freshly (and correctly) derived group.
  const [overrideGroup, setOverrideGroup] = useState<Group | null>(null)
  const [showOverride, setShowOverride] = useState(false)

  const handleNameChange = (value: string) => {
    setName(value)
    setOverrideGroup(null)
    setShowOverride(false)
  }

  const derivedGroup = (() => {
    const token = lastToken(name)
    if (!token) return null
    try {
      return deriveGroup(token)
    } catch {
      return null
    }
  })()
  const effectiveGroup = overrideGroup ?? derivedGroup
  const derived = effectiveGroup !== null
    ? { group: effectiveGroup, period: resolvePeriod(GROUP_CALENDAR[effectiveGroup], today) }
    : null
  const totalRule = REQUIREMENT_RULES.find(r => r.key === 'total')!

  return (
    <div className="wrap">
      <div className="topline">
        {onBack ? <button className="back" onClick={onBack}>‹ Back</button> : <Wordmark />}
        <div className="sp" />
      </div>
      <h1 className="h1" tabIndex={-1}>{mode === 'edit' ? 'Edit name' : 'Your California MCLE, tracked.'}</h1>
      {mode === 'edit' ? (
        <div className="sub">Update your name to correct your MCLE group.</div>
      ) : (
        <>
          <div className="sub">Upload your CLE certificates — we sort the credits and count down to your Bar deadline.</div>
          <div className="submeta">Enter your name and we'll look up your requirement.</div>
        </>
      )}

      <div className="label">Your name</div>
      <List>
        <div className="field">
          <label htmlFor="firstrun-name">Full name</label>
          <input
            id="firstrun-name"
            value={name}
            onChange={e => handleNameChange(e.target.value)}
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
          {!showOverride ? (
            <button type="button" className="link" onClick={() => setShowOverride(true)}>
              Not group {derived.group}? Change
            </button>
          ) : (
            <div className="field" style={{ textAlign: 'left' }}>
              <div className="m q">Choose your group</div>
              <div className="chip-row">
                {([1, 2, 3] as Group[]).map(g => (
                  <button
                    key={g}
                    type="button"
                    className={`chip${derived.group === g ? ' on' : ''}`}
                    onClick={() => setOverrideGroup(g)}
                  >
                    Group {g} · {LETTER_RANGE[g]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <button
        className="btn"
        disabled={!derived}
        onClick={() => derived && onContinue({ name, group: derived.group, period: derived.period })}
      >
        {mode === 'edit' ? 'Save' : 'Continue'}
      </button>
      {mode === 'setup' && <div className="note">Sign in with Google later to save your progress.</div>}
      <Disclaimer />
      {onOpenPrivacy && onOpenTerms && <LegalFooter onOpenPrivacy={onOpenPrivacy} onOpenTerms={onOpenTerms} />}
    </div>
  )
}
