// ABOUTME: Editable MCLE credit form shared by the Add and credit-detail edit flows.
// ABOUTME: Ports the field/toggle/switch markup from mockups.html #s-add.
import { useState } from 'react'
import type { Credit } from '../domain/types'
import {
  type CreditFormValues, emptyCreditForm, formToCredit, validateCreditForm,
  FORM_CATEGORIES, CATEGORY_LABELS,
} from './creditFormValues'

// Field names a certificate parse can flag as low-confidence (mirrors ParsedCredit['confidence']
// in ../domain/types, kept as a plain string union here so this form has no parsing dependency).
export type FlaggableField =
  | 'provider' | 'activityTitle' | 'completionDate' | 'totalHours' | 'participatory' | 'categoryHours'

interface Props {
  submitLabel: string
  initial?: CreditFormValues
  lowConfidenceFields?: FlaggableField[]
  onSave: (credit: Omit<Credit, 'id'>) => void
  onCancel?: () => void
}

function LowConfidenceHint({ flagged }: { flagged: boolean }) {
  if (!flagged) return null
  return (
    <div className="note" style={{ color: 'var(--warn)', textAlign: 'left', margin: '2px 0 0', fontSize: 13 }}>
      Couldn't read — please confirm
    </div>
  )
}

export function CreditForm({ submitLabel, initial, lowConfidenceFields = [], onSave, onCancel }: Props) {
  const [values, setValues] = useState<CreditFormValues>(initial ?? emptyCreditForm())
  const [errors, setErrors] = useState<Record<string, string>>({})
  const flagged = (field: FlaggableField) => lowConfidenceFields.includes(field)

  const set = (patch: Partial<CreditFormValues>) => setValues(v => ({ ...v, ...patch }))
  const setCat = (k: string, val: string) =>
    setValues(v => ({ ...v, categoryHours: { ...v.categoryHours, [k]: val } }))

  const submit = () => {
    const errs = validateCreditForm(values)
    setErrors(errs)
    if (Object.keys(errs).length === 0) onSave(formToCredit(values))
  }

  return (
    <>
      <div className="label">Activity</div>
      <div className="list">
        <div className="field">
          <label htmlFor="provider">Provider</label>
          <input id="provider" value={values.provider} onChange={e => set({ provider: e.target.value })} />
          <LowConfidenceHint flagged={flagged('provider')} />
        </div>
        <div className="field">
          <label htmlFor="activityTitle">Activity title</label>
          <input id="activityTitle" value={values.activityTitle} onChange={e => set({ activityTitle: e.target.value })} />
          <LowConfidenceHint flagged={flagged('activityTitle')} />
        </div>
        <div className="field">
          <label htmlFor="completionDate">Completion date</label>
          <input id="completionDate" type="date" value={values.completionDate} onChange={e => set({ completionDate: e.target.value })} />
          <LowConfidenceHint flagged={flagged('completionDate')} />
        </div>
        <div className="field">
          <label htmlFor="totalHours">Total hours</label>
          <input id="totalHours" inputMode="decimal" value={values.totalHours} onChange={e => set({ totalHours: e.target.value })} />
          <LowConfidenceHint flagged={flagged('totalHours')} />
        </div>
        <div className="toggle">
          <div className="t">
            <div className="n">Participatory</div>
            {flagged('participatory')
              ? <div className="m">Couldn't read — please confirm</div>
              : <div className="m q">live hours, not self-study</div>}
          </div>
          <button type="button" className={`switch${values.participatory ? ' on' : ''}`}
            aria-pressed={values.participatory} aria-label="Participatory"
            onClick={() => set({ participatory: !values.participatory })} />
        </div>
      </div>

      <div className="label">Category hours</div>
      <LowConfidenceHint flagged={flagged('categoryHours')} />
      <div className="list">
        {FORM_CATEGORIES.map(k => (
          <div className="field" key={k}>
            <label htmlFor={`cat-${k}`}>{CATEGORY_LABELS[k]}</label>
            <input id={`cat-${k}`} inputMode="decimal" value={values.categoryHours[k]}
              onChange={e => setCat(k, e.target.value)} />
          </div>
        ))}
      </div>

      {Object.values(errors).length > 0 && (
        <div className="note" style={{ color: '#FF3B30', textAlign: 'left' }}>
          {Object.values(errors).map(msg => <div key={msg}>{msg}</div>)}
        </div>
      )}

      <button className="btn" onClick={submit}>{submitLabel}</button>
      {onCancel && <button className="link" onClick={onCancel}>Cancel</button>}
    </>
  )
}
