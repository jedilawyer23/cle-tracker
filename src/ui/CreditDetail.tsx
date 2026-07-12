// ABOUTME: Single-credit screen: view details, edit via the shared form, or remove (behind a
// ABOUTME: confirmation step). Ports mockups.html #s-credit; shows which requirements it counts toward.
import { useEffect, useState } from 'react'
import type { Credit, RequirementRule, Period } from '../domain/types'
import { REQUIREMENT_RULES } from '../domain/requirements'
import { requirementsForCredit, hoursToward } from '../domain/creditContribution'
import { creditToForm } from './creditFormValues'
import { CreditForm } from './CreditForm'
import { formatDate } from './formatDate'
import { ToastView } from './ToastView'

interface Props {
  credit: Credit
  rules?: RequirementRule[]
  onUpdate: (id: string, patch: Omit<Credit, 'id'>) => Promise<void>
  // May be async (it awaits a Store delete). On success the caller navigates away, unmounting this
  // screen; on failure it stays put, so the confirm button re-enables for a retry.
  onRemove: (id: string) => void | Promise<void>
  onBack: () => void
  // Threaded into the edit form so the same out-of-cycle / future-date warnings apply when editing.
  currentPeriod?: Period
  today?: string
}

export function CreditDetail({ credit, rules = REQUIREMENT_RULES, onUpdate, onRemove, onBack, currentPeriod, today }: Props) {
  const [editing, setEditing] = useState(false)
  const [confirmingRemove, setConfirmingRemove] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // This screen's edit and remove-confirm sub-views are local state toggles, not App-level screen
  // changes, so App's focus-on-navigation effect never sees them — move focus to whichever heading
  // is showing so keyboard/screen-reader users aren't stranded when the sub-view swaps in.
  useEffect(() => {
    document.querySelector<HTMLElement>('.wrap h1[tabindex="-1"]')?.focus()
  }, [editing, confirmingRemove])

  if (editing) {
    return (
      <div className="wrap">
        <div className="topline"><button className="back" onClick={() => setEditing(false)}>‹ Back</button><div className="sp" /></div>
        <h1 className="h1" tabIndex={-1}>Edit credit</h1>
        <CreditForm submitLabel="Save credit" initial={creditToForm(credit)}
          currentPeriod={currentPeriod} today={today}
          onSave={async patch => {
            try {
              await onUpdate(credit.id, patch)
              setSaveError(null)
              setEditing(false)
            } catch {
              setSaveError("Couldn't save changes — please try again.")
            }
          }}
          onCancel={() => setEditing(false)} />
        <ToastView message={saveError} onDismiss={() => setSaveError(null)} />
      </div>
    )
  }

  if (confirmingRemove) {
    // Don't leave the confirm view until the delete settles — on success the caller navigates
    // away (unmounting this screen); on failure it stays, so re-enabling the button offers a retry.
    // Flipping back to the detail view up-front would flash Edit/Remove back while the delete is
    // still pending and let a second tap fire a second delete.
    const remove = async () => {
      setRemoving(true)
      try {
        await onRemove(credit.id)
      } finally {
        setRemoving(false)
      }
    }
    return (
      <div className="wrap">
        <div className="topline"><button className="back" disabled={removing} onClick={() => setConfirmingRemove(false)}>‹ Back</button><div className="sp" /></div>
        <h1 className="h1" tabIndex={-1}>Remove this credit?</h1>
        <div className="sub">{credit.activityTitle}</div>
        <div className="note">This can't be undone.</div>
        <button className="btn" style={{ background: '#FF3B30' }} disabled={removing} onClick={remove}>Remove</button>
        <button className="link" disabled={removing} onClick={() => setConfirmingRemove(false)}>Cancel</button>
      </div>
    )
  }

  const counts = requirementsForCredit(rules, credit)
  return (
    <div className="wrap">
      <div className="topline"><button className="back" onClick={onBack}>‹ Back</button><div className="sp" /></div>
      <h1 className="h1" tabIndex={-1}>{credit.activityTitle}</h1>
      <div className="sub">{credit.provider} · {formatDate(credit.completionDate)}</div>

      <div className="label">Details</div>
      <div className="list">
        <div className="row"><div className="t"><div className="n">Hours</div></div><div className="val">{credit.totalHours.toFixed(1)}</div></div>
        <div className="row"><div className="t"><div className="n">Participatory</div></div><div className={`val${credit.participatory ? ' met' : ''}`}>{credit.participatory ? 'Yes' : 'No'}</div></div>
        <div className="row"><div className="t"><div className="n">Counts toward</div><div className="m q">{counts.map(r => `${r.label} · ${hoursToward(r.key, credit).toFixed(1)} hrs`).join(' · ')}</div></div></div>
      </div>

      <button className="btn" onClick={() => setEditing(true)}>Edit credit</button>
      <button className="link" style={{ color: '#FF3B30' }} onClick={() => setConfirmingRemove(true)}>Remove credit</button>
      <div className="note">One certificate can count toward more than one requirement.</div>
    </div>
  )
}
