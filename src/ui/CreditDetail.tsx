// ABOUTME: Single-credit screen: view details, edit via the shared form, or remove.
// ABOUTME: Ports mockups.html #s-credit; shows which requirements the credit counts toward.
import { useState } from 'react'
import type { Credit, RequirementRule } from '../domain/types'
import { REQUIREMENT_RULES } from '../domain/requirements'
import { requirementsForCredit, hoursToward } from '../domain/creditContribution'
import { creditToForm } from './creditFormValues'
import { CreditForm } from './CreditForm'
import { formatDate } from './formatDate'

interface Props {
  credit: Credit
  rules?: RequirementRule[]
  onUpdate: (id: string, patch: Omit<Credit, 'id'>) => void
  onRemove: (id: string) => void
  onBack: () => void
}

export function CreditDetail({ credit, rules = REQUIREMENT_RULES, onUpdate, onRemove, onBack }: Props) {
  const [editing, setEditing] = useState(false)

  if (editing) {
    return (
      <div className="wrap">
        <div className="topline"><button className="back" onClick={() => setEditing(false)}>‹ Back</button><div className="sp" /></div>
        <h1 className="h1">Edit credit</h1>
        <CreditForm submitLabel="Save credit" initial={creditToForm(credit)}
          onSave={patch => { onUpdate(credit.id, patch); setEditing(false) }}
          onCancel={() => setEditing(false)} />
      </div>
    )
  }

  const counts = requirementsForCredit(rules, credit)
  return (
    <div className="wrap">
      <div className="topline"><button className="back" onClick={onBack}>‹ Back</button><div className="sp" /></div>
      <h1 className="h1">{credit.activityTitle}</h1>
      <div className="sub">{credit.provider} · {formatDate(credit.completionDate)}</div>

      <div className="label">Details</div>
      <div className="list">
        <div className="row"><div className="t"><div className="n">Hours</div></div><div className="val">{credit.totalHours.toFixed(1)}</div></div>
        <div className="row"><div className="t"><div className="n">Participatory</div></div><div className={`val${credit.participatory ? ' met' : ''}`}>{credit.participatory ? 'Yes' : 'No'}</div></div>
        <div className="row"><div className="t"><div className="n">Counts toward</div><div className="m q">{counts.map(r => `${r.label} · ${hoursToward(r.key, credit).toFixed(1)} hrs`).join(' · ')}</div></div></div>
      </div>

      <button className="btn" onClick={() => setEditing(true)}>Edit credit</button>
      <button className="link" style={{ color: '#FF3B30' }} onClick={() => onRemove(credit.id)}>Remove credit</button>
      <div className="note">One certificate can count toward more than one requirement.</div>
    </div>
  )
}
