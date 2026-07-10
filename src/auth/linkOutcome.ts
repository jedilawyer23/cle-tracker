// ABOUTME: Pure decision for resolving a Google account-link attempt from its error code.
// ABOUTME: credential-already-in-use => sign into the existing account (no guest-data merge in v1).
export type LinkOutcome =
  | { kind: 'linked' }
  | { kind: 'already-linked' }
  | { kind: 'use-existing-account' }
  | { kind: 'error'; code: string }

export function resolveLinkOutcome(errorCode: string | null): LinkOutcome {
  if (!errorCode) return { kind: 'linked' }
  switch (errorCode) {
    case 'auth/credential-already-in-use':
    case 'auth/email-already-in-use':
      return { kind: 'use-existing-account' }
    case 'auth/provider-already-linked':
      return { kind: 'already-linked' }
    default:
      return { kind: 'error', code: errorCode }
  }
}
