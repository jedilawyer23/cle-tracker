// ABOUTME: Client wrapper over the parseCertificate callable.
// ABOUTME: Sends base64 + mime type; returns a validated ParsedCredit, or a typed
// ABOUTME: NotACleCertificateError when the upload isn't a CLE certificate at all.
import { httpsCallable } from 'firebase/functions'
import { functions } from '../firebase'
import type { ParsedCredit } from '../domain/types'
import type { UploadPayload } from './fileToBase64'

// Thrown when the upload parsed but the model judged it not to be a CLE certificate — a different
// situation from an unreadable file, and worth a different message to the user.
export class NotACleCertificateError extends Error {}

// Thrown when the caller has hit their per-day parseCertificate quota (an interim spend guard
// ahead of App Check — see functions/src/index.ts).
export class DailyLimitReachedError extends Error {}

const callable = httpsCallable<UploadPayload, ParsedCredit>(functions, 'parseCertificate')

export async function parseCertificate(payload: UploadPayload): Promise<ParsedCredit> {
  try {
    const { data } = await callable(payload)
    return data
  } catch (err) {
    if ((err as { message?: string }).message === 'NOT_A_CLE_CERTIFICATE') {
      throw new NotACleCertificateError()
    }
    if ((err as { message?: string }).message === 'DAILY_LIMIT') {
      throw new DailyLimitReachedError()
    }
    throw err
  }
}
