// ABOUTME: Links a Google credential to the current anonymous uid, preserving uid + data.
// ABOUTME: Flips users/{uid}.accountState to 'linked'; falls back per resolveLinkOutcome.
import {
  GoogleAuthProvider, linkWithPopup, signInWithCredential,
  type Auth, type User, type UserCredential,
} from 'firebase/auth'
import { collection, doc, getDocs, setDoc, type Firestore } from 'firebase/firestore'
import { resolveLinkOutcome, type LinkOutcome } from './linkOutcome'
import { mergeCreditsIntoAccount } from '../store/mergeCreditsIntoAccount'
import { docToCredit } from '../firebase/mappers'

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
      // Chosen v1 resolution: sign into the pre-existing account, then merge the guest
      // session's credits into it so they aren't stranded on the abandoned anonymous uid.
      const guestUid = user.uid
      const cred = GoogleAuthProvider.credentialFromError(err as never)
      // NOTE: under the Auth emulator, credentialFromError(err) returns null for the synthetic
      // OIDC credential used in tests, so this branch's merge/setDoc calls are only exercised
      // by src/auth/__tests__/linkGoogle.test.ts (mocked deps) and by
      // src/store/__tests__/mergeCreditsIntoAccount.emulator.test.ts (the merge logic itself,
      // against real Firestore). The full real-Google path must be confirmed manually.
      if (!cred) return outcome
      // Read the guest's credits WHILE still authenticated as the guest — after the switch
      // below, security rules deny reading users/{guestUid}. Hold them in memory to merge after.
      const guestSnap = await getDocs(collection(db, 'users', guestUid, 'credits'))
      const guestCredits = guestSnap.docs.map((d) => docToCredit(d.id, d.data() as Record<string, unknown>))
      const { user: existingUser } = await signInWithCredential(auth, cred)
      await mergeCreditsIntoAccount(db, existingUser.uid, guestCredits)
      const linkedEmail = auth.currentUser?.email
      await setDoc(
        doc(db, 'users', existingUser.uid),
        { accountState: 'linked', ...(linkedEmail ? { email: linkedEmail } : {}) },
        { merge: true },
      )
    }
    return outcome
  }
}
