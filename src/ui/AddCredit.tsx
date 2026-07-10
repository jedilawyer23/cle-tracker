// ABOUTME: The blank manual "Confirm & save" screen for adding a credit by hand.
// ABOUTME: Ports mockups.html #s-add; writes via the injected onSave (the credit store).
import type { Credit } from '../domain/types'
import { CreditForm } from './CreditForm'

interface Props {
  onSave: (credit: Omit<Credit, 'id'>) => void
  onBack: () => void
}

export function AddCredit({ onSave, onBack }: Props) {
  return (
    <div className="wrap">
      <div className="topline">
        <button className="back" onClick={onBack}>‹ Back</button>
        <div className="sp" />
      </div>
      <h1 className="h1">Confirm &amp; save</h1>
      <div className="sub">Enter your credit details. Nothing is uploaded.</div>
      <CreditForm submitLabel="Save credit" onSave={onSave} onCancel={onBack} />
    </div>
  )
}
