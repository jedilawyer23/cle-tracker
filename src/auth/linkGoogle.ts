// ABOUTME: Links a Google credential to the current anonymous uid, preserving uid + data.
// ABOUTME: Flips users/{uid}.accountState to 'linked'; falls back per resolveLinkOutcome.
import {
  GoogleAuthProvider, linkWithPopup, signInWithCredential,
  type Auth, type User, type UserCredential,
} from 'firebase/auth'
import { doc, setDoc, type Firestore } from 'firebase/firestore'
import { resolveLinkOutcome, type LinkOutcome } from './linkOutcome'

// Default production linker: opens the Google popup and links to the current uid.
const popupLink = (user: User): Promise<UserCredential> =>
  linkWithPopup(user, new GoogleAuthProvider())

export async function linkGoogle(
  auth: Auth,
  db: Firestore,
  link: (user: User) => Promise<UserCredential> = popupLink,
): Promise<LinkOutcome> {
  const user = auth.currentUser
  if (!user) return { kind: 'error', code: 'auth/no-current-user' }
  try {
    const result = await link(user)
    // Persist the linked Google email so the M5 reminder sweep has somewhere to send to.
    // Guests (never linked) keep no email field — dueReminders treats that as hasEmail=false.
    // Firestore rejects an explicit `undefined` field value, so only include the key when
    // there's an actual email to write.
    const email = auth.currentUser?.email
    await setDoc(
      doc(db, 'users', result.user.uid),
      { accountState: 'linked', ...(email ? { email } : {}) },
      { merge: true },
    )
    return { kind: 'linked' }
  } catch (err) {
    const code = (err as { code?: string }).code ?? 'auth/unknown'
    const outcome = resolveLinkOutcome(code)
    if (outcome.kind === 'use-existing-account') {
      // Chosen v1 resolution: sign into the pre-existing account. Guest-session
      // data is NOT merged (documented limitation); the existing account keeps its own data.
      const cred = GoogleAuthProvider.credentialFromError(err as never)
      if (cred) await signInWithCredential(auth, cred)
    }
    return outcome
  }
}
