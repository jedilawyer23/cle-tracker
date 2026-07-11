// ABOUTME: Links a Google credential to the current anonymous uid, preserving uid + data.
// ABOUTME: Flips users/{uid}.accountState to 'linked'; falls back per resolveLinkOutcome.
import {
  GoogleAuthProvider, linkWithPopup, linkWithRedirect, signInWithCredential, getRedirectResult,
  type Auth, type User, type UserCredential,
} from 'firebase/auth'
import { collection, doc, getDocs, setDoc, type Firestore } from 'firebase/firestore'
import { resolveLinkOutcome, type LinkOutcome } from './linkOutcome'
import { mergeCreditsIntoAccount } from '../store/mergeCreditsIntoAccount'
import { docToCredit } from '../firebase/mappers'
import { prefersRedirectSignIn } from './prefersRedirectSignIn'

// Default production linker: opens the Google popup and links to the current uid.
const popupLink = (user: User): Promise<UserCredential> =>
  linkWithPopup(user, new GoogleAuthProvider())

// Persists the linked Google email so the M5 reminder sweep has somewhere to send to. Guests
// (never linked) keep no email field — dueReminders treats that as hasEmail=false. Firestore
// rejects an explicit `undefined` field value, so only include the key when there's an email.
async function markAccountLinked(db: Firestore, uid: string, email?: string | null): Promise<void> {
  await setDoc(
    doc(db, 'users', uid),
    { accountState: 'linked', ...(email ? { email } : {}) },
    { merge: true },
  )
}

// Chosen v1 resolution for a Google credential already linked elsewhere: sign into the
// pre-existing account, then merge the guest session's credits into it so they aren't stranded
// on the abandoned anonymous uid. Returns false (no-op) when no credential can be recovered.
// NOTE: under the Auth emulator, credentialFromError(err) returns null for the synthetic OIDC
// credential used in tests, so this branch's merge/setDoc calls are only exercised by
// src/auth/__tests__/linkGoogle.test.ts (mocked deps) and by
// src/store/__tests__/mergeCreditsIntoAccount.emulator.test.ts (the merge logic itself, against
// real Firestore). The full real-Google path must be confirmed manually.
async function adoptExistingAccount(auth: Auth, db: Firestore, err: unknown, guestUid: string | undefined): Promise<boolean> {
  const cred = GoogleAuthProvider.credentialFromError(err as never)
  if (!cred) return false
  // Read the guest's credits WHILE still authenticated as the guest — after the switch below,
  // security rules deny reading users/{guestUid}. Hold them in memory to merge after.
  const guestSnap = guestUid ? await getDocs(collection(db, 'users', guestUid, 'credits')) : null
  const guestCredits = guestSnap ? guestSnap.docs.map((d) => docToCredit(d.id, d.data() as Record<string, unknown>)) : []
  const { user: existingUser } = await signInWithCredential(auth, cred)
  await mergeCreditsIntoAccount(db, existingUser.uid, guestCredits)
  await markAccountLinked(db, existingUser.uid, auth.currentUser?.email)
  return true
}

export async function linkGoogle(
  auth: Auth,
  db: Firestore,
  link: (user: User) => Promise<UserCredential> = popupLink,
): Promise<LinkOutcome> {
  const user = auth.currentUser
  if (!user) return { kind: 'error', code: 'auth/no-current-user' }
  try {
    const result = await link(user)
    await markAccountLinked(db, result.user.uid, auth.currentUser?.email)
    return { kind: 'linked' }
  } catch (err) {
    const code = (err as { code?: string }).code ?? 'auth/unknown'
    const outcome = resolveLinkOutcome(code)
    if (outcome.kind === 'use-existing-account') {
      await adoptExistingAccount(auth, db, err, user.uid)
    }
    return outcome
  }
}

// Starts a Google account-link attempt, picking the flow by device: mobile browsers commonly
// block linkWithPopup, so touch devices use linkWithRedirect (the outcome is then resolved by
// completeRedirectLink after the page navigates back) while others keep the popup flow.
export async function startGoogleLink(
  auth: Auth,
  db: Firestore,
  prefersRedirect: () => boolean = prefersRedirectSignIn,
): Promise<LinkOutcome> {
  const user = auth.currentUser
  if (!user) return { kind: 'error', code: 'auth/no-current-user' }
  if (prefersRedirect()) {
    try {
      await linkWithRedirect(user, new GoogleAuthProvider())
    } catch (err) {
      // linkWithRedirect can reject synchronously (e.g. auth/unauthorized-domain) before it ever
      // navigates — surface that instead of letting it become a silent unhandled rejection.
      return resolveLinkOutcome((err as { code?: string }).code ?? 'auth/unknown')
    }
    // The page navigates away before this matters — the real outcome is handled on return by
    // completeRedirectLink.
    return { kind: 'cancelled' }
  }
  return linkGoogle(auth, db)
}

// Finishes a pending Google redirect sign-in — call on boot. Returns null when no redirect was
// pending (the normal desktop/first-load case).
export async function completeRedirectLink(auth: Auth, db: Firestore): Promise<LinkOutcome | null> {
  let result: UserCredential | null
  try {
    result = await getRedirectResult(auth)
  } catch (err) {
    const code = (err as { code?: string }).code ?? 'auth/unknown'
    const outcome = resolveLinkOutcome(code)
    if (outcome.kind === 'use-existing-account') {
      // auth.currentUser is still the guest here — the switch happens inside adoptExistingAccount.
      await adoptExistingAccount(auth, db, err, auth.currentUser?.uid)
    }
    return outcome
  }
  if (!result) return null
  // Success — same uid now Google-linked. Persist accountState in the background: awaiting this
  // write on the redirect return can stall (the auth token is mid-refresh), and the store's live
  // subscription reflects the linked state as soon as the write lands.
  void markAccountLinked(db, result.user.uid, auth.currentUser?.email).catch(() => {})
  return { kind: 'linked' }
}
