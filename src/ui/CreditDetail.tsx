// ABOUTME: Single-credit screen: view details, edit via the shared form, or remove (behind a
// ABOUTME: confirmation step). Ports mockups.html #s-credit; shows which requirements it counts toward.
import { useState } from 'react'
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
  onRemove: (id: string) => void
  onBack: () => void
  // Threaded into the edit form so the same out-of-cycle / future-date warnings apply when editing.
  currentPeriod?: Period
  today?: string
}

export function CreditDetail({ credit, rules = REQUIREMENT_RULES, onUpdate, onRemove, onBack, currentPeriod, today }: Props) {
  const [editing, setEditing] = useState(false)
  const [confirmingRemove, setConfirmingRemove] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  if (editing) {
    return (
      <div className="wrap">
        <div className="topline"><button className="back" onClick={() => setEditing(false)}>‹ Back</button><div className="sp" /></div>
        <h1 className="h1" tabIndex={-1}>Edit credit</h1>
        <CreditForm submitLabel="Save credit" initial={creditToForm(credit)}
          currentPeriod={currentPeriod} today={today}
          onSave={patch => {
            onUpdate(credit.id, patch)
              .then(() => { setSaveError(null); setEditing(false) })
              .catch(() => setSaveError("Couldn't save changes — please try again."))
          }}
          onCancel={() => setEditing(false)} />
        <ToastView message={saveError} onDismiss={() => setSaveError(null)} />
      </div>
    )
  }

  if (confirmingRemove) {
    return (
      <div className="wrap">
        <div className="topline"><button className="back" onClick={() => setConfirmingRemove(false)}>‹ Back</button><div className="sp" /></div>
        <h1 className="h1" tabIndex={-1}>Remove this credit?</h1>
        <div className="sub">{credit.activityTitle}</div>
        <div className="note">This can't be undone.</div>
        <button className="btn" style={{ background: '#FF3B30' }}
          onClick={() => { setConfirmingRemove(false); onRemove(credit.id) }}>Remove</button>
        <button className="link" onClick={() => setConfirmingRemove(false)}>Cancel</button>
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
