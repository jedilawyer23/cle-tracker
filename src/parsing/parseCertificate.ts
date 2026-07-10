// ABOUTME: Client wrapper over the parseCertificate callable.
// ABOUTME: Sends base64 + mime type; returns a validated ParsedCredit.
import { httpsCallable } from 'firebase/functions'
import { functions } from '../firebase'
import type { ParsedCredit } from '../domain/types'
import type { UploadPayload } from './fileToBase64'

const callable = httpsCallable<UploadPayload, ParsedCredit>(functions, 'parseCertificate')

export async function parseCertificate(payload: UploadPayload): Promise<ParsedCredit> {
  const { data } = await callable(payload)
  return data
}
