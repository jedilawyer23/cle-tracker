// ABOUTME: Hook that reads a picked certificate file, parses it, and reports either a Confirm-
// ABOUTME: screen seed or a fallback message. The file itself is never stored, only its base64.
import { useCallback, useState } from 'react'
import { fileToBase64 } from './fileToBase64'
import { parseCertificate, NotACleCertificateError } from './parseCertificate'
import { parsedCreditToConfirmState, type ConfirmState } from './parsedCreditToConfirmState'

export function useParseFile(
  onParsed: (state: ConfirmState) => void,
  onError: (message: string) => void,
) {
  const [busy, setBusy] = useState(false)

  const parseFile = useCallback(async (file: File) => {
    setBusy(true)
    try {
      const payload = await fileToBase64(file)
      const parsed = await parseCertificate(payload)
      onParsed(parsedCreditToConfirmState(parsed))
    } catch (err) {
      onError(
        err instanceof NotACleCertificateError
          ? "This doesn't look like a CLE certificate. Upload your completion certificate, or enter the details manually below."
          : "We couldn't read that certificate. Enter the details manually below.",
      )
    } finally {
      setBusy(false)
    }
  }, [onParsed, onError])

  return { busy, parseFile }
}
