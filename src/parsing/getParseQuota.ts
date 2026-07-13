// ABOUTME: Client wrapper over the read-only getParseQuota callable.
// ABOUTME: Returns today's used/limit/remaining parse counts so the UI can show "X parses left".
import { httpsCallable } from 'firebase/functions'
import { functions } from '../firebase'

export interface ParseQuota {
  used: number
  limit: number
  remaining: number
}

const callable = httpsCallable<void, ParseQuota>(functions, 'getParseQuota')

export async function getParseQuota(): Promise<ParseQuota> {
  const { data } = await callable()
  return data
}
