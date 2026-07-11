// ABOUTME: Ensures every visitor has a Firebase uid, reusing the persisted session when present.
// ABOUTME: Awaits authStateReady() first so we never mint a new anon over a restored/linked user.
import { signInAnonymously, type Auth, type User } from 'firebase/auth'

export async function ensureAnonymousUser(auth: Auth): Promise<User> {
  // On a fresh page load, auth.currentUser is null until Firebase restores the persisted
  // session from IndexedDB. Wait for that to settle before deciding to create a new anonymous
  // user — otherwise every reload (and the post-link reload) strands the real account.
  await auth.authStateReady()
  if (auth.currentUser) return auth.currentUser
  const cred = await signInAnonymously(auth)
  return cred.user
}
