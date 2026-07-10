// ABOUTME: Add screen — capture a certificate (PDF, image, or camera), parse it, and route to
// ABOUTME: Confirm or manual entry. Uploads base64 to the parseCertificate callable; the file itself is never stored.
import { useState } from 'react'
import { fileToBase64 } from '../parsing/fileToBase64'
import { parseCertificate } from '../parsing/parseCertificate'
import { parsedCreditToConfirmState, type ConfirmState } from '../parsing/parsedCreditToConfirmState'

interface Props {
  onParsed: (state: ConfirmState) => void
  onManual: (message: string) => void
  onBack?: () => void
}

export function AddCertificate({ onParsed, onManual, onBack }: Props) {
  const [busy, setBusy] = useState(false)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true)
    try {
      const payload = await fileToBase64(file)
      const parsed = await parseCertificate(payload)
      onParsed(parsedCreditToConfirmState(parsed))
    } catch {
      onManual("We couldn't read that certificate. Enter the details manually.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="wrap">
      {onBack && (
        <div className="topline">
          <button className="back" onClick={onBack}>‹ Back</button>
          <div className="sp" />
        </div>
      )}
      <h1 className="h1">Add a certificate</h1>
      <div className="sub">Take a photo, or choose a PDF or image. Nothing is uploaded until you pick a file.</div>

      <label className="btn" htmlFor="cert-input">{busy ? 'Reading…' : 'Add certificate'}</label>
      <input
        id="cert-input"
        aria-label="Certificate"
        type="file"
        accept="application/pdf,image/*"
        capture="environment"
        onChange={handleFile}
        disabled={busy}
        hidden
      />
      <button className="link" onClick={() => onManual('')}>Enter manually instead</button>
      {busy && <div className="note">Reading the certificate…</div>}
    </div>
  )
}
