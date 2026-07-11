// ABOUTME: Pure decision for resolving a Google account-link attempt from its error code.
// ABOUTME: credential-already-in-use => sign into the existing account; linkGoogle then merges
// ABOUTME: the guest session's credits into it (see mergeCreditsIntoAccount).
export type LinkOutcome =
  | { kind: 'linked' }
  | { kind: 'already-linked' }
  | { kind: 'use-existing-account' }
  | { kind: 'cancelled' }
  | { kind: 'error'; code: string }

export function resolveLinkOutcome(errorCode: string | null): LinkOutcome {
  if (!errorCode) return { kind: 'linked' }
  switch (errorCode) {
    case 'auth/credential-already-in-use':
    case 'auth/email-already-in-use':
      return { kind: 'use-existing-account' }
    case 'auth/provider-already-linked':
      return { kind: 'already-linked' }
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return { kind: 'cancelled' }
    default:
      return { kind: 'error', code: errorCode }
  }
}

// The user-facing message each outcome maps to (null = show nothing, e.g. a silent cancel).
export function messageForOutcome(outcome: LinkOutcome): string | null {
  switch (outcome.kind) {
    case 'linked':
    case 'already-linked':
      return 'Saved to your Google account.'
    case 'use-existing-account':
      return 'Signed in — your credits were saved to your account.'
    case 'error':
      // The code is surfaced so a failure (e.g. auth/unauthorized-domain from an un-allowlisted
      // custom domain) is diagnosable on-device instead of a silent no-op.
      return `Couldn't sign in — please try again. (${outcome.code})`
    case 'cancelled':
      // Silent — the user closed/blocked the popup themselves; leave the UI unchanged.
      return null
  }
}
