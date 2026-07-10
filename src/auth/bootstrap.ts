// ABOUTME: Ensures every visitor has a Firebase uid by signing in anonymously on first load.
// ABOUTME: Idempotent — returns the existing user when one is already signed in.
import { signInAnonymously, type Auth, type User } from 'firebase/auth'

export async function ensureAnonymousUser(auth: Auth): Promise<User> {
  if (auth.currentUser) return auth.currentUser
  const cred = await signInAnonymously(auth)
  return cred.user
}
