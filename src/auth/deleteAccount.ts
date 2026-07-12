// ABOUTME: Deletes a signed-in user's Firestore data, then their Firebase Auth user — data first
// ABOUTME: so a stale-session Auth failure below never leaves data half-deleted.
import { deleteUser, type Auth } from 'firebase/auth'
import type { Firestore } from 'firebase/firestore'
import { deleteAccountData } from '../store/deleteAccountData'

export async function deleteAccount(
  auth: Auth,
  db: Firestore,
  reload: () => void = () => window.location.reload(),
): Promise<void> {
  const user = auth.currentUser
  if (!user) return
  await deleteAccountData(db, user.uid)
  try {
    await deleteUser(user)
  } catch (err) {
    // Firebase requires a *recent* sign-in to delete the Auth user itself (unlike the Firestore
    // writes above, which have no such restriction). This app has no re-auth flow — anonymous or
    // Google-linked, never a password — so there's nothing to silently recover with. The data is
    // already gone, so reload to leave the visitor with a fresh session, but throw first so the
    // caller can still show what happened before that reload takes effect.
    if ((err as { code?: string }).code === 'auth/requires-recent-login') {
      reload()
      throw new Error("Your data was deleted, but we couldn't remove your sign-in — please try again.")
    }
    throw err
  }
  reload()
}
