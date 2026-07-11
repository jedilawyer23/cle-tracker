// ABOUTME: Picks the Google sign-in flow by pointer type — touch devices (coarse pointer) prefer
// ABOUTME: the redirect flow since mobile browsers commonly block the popup flow.
export function prefersRedirectSignIn(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches === true
}
