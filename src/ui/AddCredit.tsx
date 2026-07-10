// ABOUTME: The "Confirm & save" screen for adding a credit — blank for manual entry, or seeded
// ABOUTME: from a parsed certificate draft (mockups.html #s-add) with low-confidence fields flagged.
import type { Credit } from '../domain/types'
import type { UserProfile } from '../store/types'
import { CreditForm, type FlaggableField } from './CreditForm'
import { creditToForm, type CreditFormValues } from './creditFormValues'

// A parsed certificate draft has every Credit field except id (see
// ../parsing/parsedCreditToConfirmState). creditToForm ignores id, so a placeholder is safe here.
type Draft = Omit<Credit, 'id'>

interface Props {
  onSave: (credit: Omit<Credit, 'id'>) => void
  onBack: () => void
  initial?: Draft
  lowConfidenceFields?: FlaggableField[]
  message?: string
  accountState?: UserProfile['accountState']
  onSignIn?: () => void
  signInMessage?: string | null
}

export function AddCredit({ onSave, onBack, initial, lowConfidenceFields, message, accountState, onSignIn, signInMessage }: Props) {
  const initialValues: CreditFormValues | undefined = initial ? creditToForm({ ...initial, id: '' }) : undefined
  const sub = initial
    ? 'We read the certificate. Review anything flagged below.'
    : message || 'Enter your credit details. Nothing is uploaded.'

  return (
    <div className="wrap">
      <div className="topline">
        <button className="back" onClick={onBack}>‹ Back</button>
        <div className="sp" />
        {accountState && accountState !== 'linked' && (
          <button type="button" className="navbtn" onClick={onSignIn}>Sign in to save</button>
        )}
      </div>
      {signInMessage && <div className="note">{signInMessage}</div>}
      <h1 className="h1">Confirm &amp; save</h1>
      <div className="sub">{sub}</div>
      <CreditForm
        submitLabel="Save credit"
        initial={initialValues}
        lowConfidenceFields={lowConfidenceFields}
        onSave={onSave}
        onCancel={onBack}
      />
    </div>
  )
}
