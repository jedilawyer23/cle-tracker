// ABOUTME: Editable MCLE credit form shared by the Add and credit-detail edit flows.
// ABOUTME: Ports the field/toggle/switch markup from mockups.html #s-add.
import { useState } from 'react'
import type { Credit, Period } from '../domain/types'
import {
  type CreditFormValues, emptyCreditForm, formToCredit, validateCreditForm,
  FORM_CATEGORIES, CATEGORY_LABELS, SUB_MINIMUM_PARENT,
} from './creditFormValues'

// Field names a certificate parse can flag as low-confidence (mirrors ParsedCredit['confidence']
// in ../domain/types, kept as a plain string union here so this form has no parsing dependency).
export type FlaggableField =
  | 'provider' | 'activityTitle' | 'completionDate' | 'totalHours' | 'participatory' | 'categoryHours'

interface Props {
  submitLabel: string
  initial?: CreditFormValues
  lowConfidenceFields?: FlaggableField[]
  // When supplied, a completion date outside [start, end] shows a non-blocking note — the
  // credit can still be saved, but it won't count toward the current cycle's requirement.
  currentPeriod?: Period
  onSave: (credit: Omit<Credit, 'id'>) => void
  onCancel?: () => void
}

// Top-level categories, each optionally followed by its nested sub-minimum ("of which ...").
const TOP_LEVEL_CATEGORIES = FORM_CATEGORIES.filter(k => !SUB_MINIMUM_PARENT[k as keyof typeof SUB_MINIMUM_PARENT])
const SUB_MINIMUM_OF_CATEGORY = Object.fromEntries(
  Object.entries(SUB_MINIMUM_PARENT).map(([child, parent]) => [parent, child]),
) as Partial<Record<typeof FORM_CATEGORIES[number], typeof FORM_CATEGORIES[number]>>

function LowConfidenceHint({ flagged }: { flagged: boolean }) {
  if (!flagged) return null
  return (
    <div className="note" style={{ color: 'var(--warn)', textAlign: 'left', margin: '2px 0 0', fontSize: 13 }}>
      Couldn't read — please confirm
    </div>
  )
}

export function CreditForm({ submitLabel, initial, lowConfidenceFields = [], currentPeriod, onSave, onCancel }: Props) {
  const [values, setValues] = useState<CreditFormValues>(initial ?? emptyCreditForm())
  const [errors, setErrors] = useState<Record<string, string>>({})
  const flagged = (field: FlaggableField) => lowConfidenceFields.includes(field)
  const isOutOfCycle = !!currentPeriod && !!values.completionDate
    && (values.completionDate < currentPeriod.start || values.completionDate > currentPeriod.end)

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
          {isOutOfCycle && (
            <div className="note" style={{ textAlign: 'left', margin: '2px 0 0', fontSize: 13 }}>
              This certificate is from a different reporting cycle — it won't count toward your current requirement.
            </div>
          )}
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
        {TOP_LEVEL_CATEGORIES.map(k => {
          const subKey = SUB_MINIMUM_OF_CATEGORY[k]
          return (
            <div key={k}>
              <div className="field">
                <label htmlFor={`cat-${k}`}>{CATEGORY_LABELS[k]}</label>
                <input id={`cat-${k}`} inputMode="decimal" value={values.categoryHours[k]}
                  onChange={e => setCat(k, e.target.value)} />
              </div>
              {subKey && (
                <div className="field sub-field" style={{ marginLeft: 16 }}>
                  <label htmlFor={`cat-${subKey}`}>of which {CATEGORY_LABELS[subKey]}</label>
                  <input id={`cat-${subKey}`} inputMode="decimal" value={values.categoryHours[subKey]}
                    onChange={e => setCat(subKey, e.target.value)} />
                </div>
              )}
            </div>
          )
        })}
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
