// ABOUTME: The "Confirm & save" screen for adding a credit — blank for manual entry, or seeded
// ABOUTME: from a parsed certificate draft (mockups.html #s-add) with low-confidence fields flagged.
import type { ChangeEvent } from 'react'
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
  // Lets the user pick a certificate file to parse without leaving this screen — the same parse
  // pipeline re-seeds the page (auto-fills the form on success, or updates the message on failure).
  onUploadFile?: (file: File) => void
  parsing?: boolean
}

export function AddCredit({ onSave, onBack, initial, lowConfidenceFields, message, accountState, onSignIn, signInMessage, name, photoURL, currentPeriod, onUploadFile, parsing }: Props) {
  const initialValues: CreditFormValues | undefined = initial ? creditToForm({ ...initial, id: '' }) : undefined
  const sub = initial
    ? 'We read the certificate. Review anything flagged below.'
    : message || 'Enter your credit details. Nothing is uploaded.'

  function handleUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file && onUploadFile) onUploadFile(file)
  }

  // Offer a re-upload only when there's no successfully-parsed draft to review — i.e. after a
  // failed/not-a-CLE upload (where the message invites another file) or in plain manual entry.
  const showUpload = onUploadFile && !initial

  return (
    <div className="wrap">
      {accountState
        ? <SignInToSave accountState={accountState} onSignIn={onSignIn ?? (() => {})} name={name} photoURL={photoURL} onBack={onBack} />
        : <div className="topline"><button className="back" onClick={onBack}>‹ Back</button><div className="sp" /></div>}
      {signInMessage && <div className="note">{signInMessage}</div>}
      <h1 className="h1">Confirm &amp; save</h1>
      <div className="sub">{sub}</div>
      {showUpload && (
        parsing
          ? <button type="button" className="btn tinted" disabled>Reading…</button>
          : <>
              <label className="btn tinted uploadbtn" htmlFor="addcredit-upload">
                {message ? 'Choose a different file' : 'Upload a certificate to auto-fill'}
              </label>
              <input
                id="addcredit-upload"
                type="file"
                accept="application/pdf,image/png,image/jpeg,image/webp,image/gif"
                onChange={handleUpload}
                hidden
              />
            </>
      )}
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
