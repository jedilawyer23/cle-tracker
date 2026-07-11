// ABOUTME: The "Confirm & save" screen for adding a credit — blank for manual entry, or seeded
// ABOUTME: from a parsed certificate draft (mockups.html #s-add) with low-confidence fields flagged.
import type { Credit, Period } from '../domain/types'
import type { UserProfile } from '../store/types'
import { CreditForm, type FlaggableField } from './CreditForm'
import { creditToForm, type CreditFormValues } from './creditFormValues'
import { SignInToSave } from './SignInToSave'

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
  name?: string
  photoURL?: string | null
  // The user's current compliance period — passed through to CreditForm so it can flag a
  // completion date that falls outside it as belonging to a different reporting cycle.
  currentPeriod?: Period
}

export function AddCredit({ onSave, onBack, initial, lowConfidenceFields, message, accountState, onSignIn, signInMessage, name, photoURL, currentPeriod }: Props) {
  const initialValues: CreditFormValues | undefined = initial ? creditToForm({ ...initial, id: '' }) : undefined
  const sub = initial
    ? 'We read the certificate. Review anything flagged below.'
    : message || 'Enter your credit details. Nothing is uploaded.'

  return (
    <div className="wrap">
      {accountState
        ? <SignInToSave accountState={accountState} onSignIn={onSignIn ?? (() => {})} name={name} photoURL={photoURL} onBack={onBack} />
        : <div className="topline"><button className="back" onClick={onBack}>‹ Back</button><div className="sp" /></div>}
      {signInMessage && <div className="note">{signInMessage}</div>}
      <h1 className="h1">Confirm &amp; save</h1>
      <div className="sub">{sub}</div>
      <CreditForm
        submitLabel="Save credit"
        initial={initialValues}
        lowConfidenceFields={lowConfidenceFields}
        currentPeriod={currentPeriod}
        onSave={onSave}
        onCancel={onBack}
      />
    </div>
  )
}
