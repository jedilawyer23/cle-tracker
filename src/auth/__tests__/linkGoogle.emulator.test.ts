// ABOUTME: Emulator test — linkGoogle links a Google credential to the anonymous uid.
// ABOUTME: Injects a credential-link fn so the test can drive it without a real popup.
import { beforeAll, afterAll, describe, it, expect } from 'vitest'
import { initializeApp, deleteApp, type FirebaseApp } from 'firebase/app'
import {
  getAuth, connectAuthEmulator, signInAnonymously, signOut,
  GoogleAuthProvider, linkWithCredential, type Auth, type UserCredential,
} from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator, doc, getDoc, setDoc, type Firestore } from 'firebase/firestore'
import { linkGoogle } from '../linkGoogle'

let app: FirebaseApp
let auth: Auth
let db: Firestore

// A deterministic fake Google id-token the Auth emulator accepts.
const googleCred = () => GoogleAuthProvider.credential(
  JSON.stringify({ sub: `g-${Date.now()}`, email: `x${Date.now()}@example.com` }),
)

beforeAll(() => {
  app = initializeApp({ apiKey: 'demo', projectId: 'demo-cle' })
  auth = getAuth(app); connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  db = getFirestore(app); connectFirestoreEmulator(db, '127.0.0.1', 8080)
})
afterAll(() => deleteApp(app))

describe('linkGoogle', () => {
  it('links Google to the anon uid, preserves the uid, and flips accountState', async () => {
    await signOut(auth).catch(() => {})
    const { user } = await signInAnonymously(auth)
    const anonUid = user.uid
    await setDoc(doc(db, 'users', anonUid), { accountState: 'guest', name: 'Maya' })

    const cred = googleCred()
    const link = (u: typeof user): Promise<UserCredential> => linkWithCredential(u, cred)
    const outcome = await linkGoogle(auth, db, link)

    expect(outcome).toEqual({ kind: 'linked' })
    expect(auth.currentUser!.uid).toBe(anonUid) // uid preserved
    const snap = await getDoc(doc(db, 'users', anonUid))
    expect(snap.data()!.accountState).toBe('linked')
    expect(snap.data()!.name).toBe('Maya') // data preserved
  })

  it('resolves to use-existing-account when the Google credential is already linked elsewhere', async () => {
    await signOut(auth).catch(() => {})
    const sharedCred = () => GoogleAuthProvider.credential(
      JSON.stringify({ sub: 'g-shared-1', email: 'shared1@example.com' }),
    )

    // First account claims the Google credential.
    const first = await signInAnonymously(auth)
    await linkWithCredential(first.user, sharedCred())

    // A second, unrelated anonymous visitor tries to link the same Google identity.
    await signOut(auth)
    const second = await signInAnonymously(auth)
    const secondUid = second.user.uid
    await setDoc(doc(db, 'users', secondUid), { accountState: 'guest' })

    const link = (u: typeof second.user): Promise<UserCredential> => linkWithCredential(u, sharedCred())
    const outcome = await linkGoogle(auth, db, link)

    // NOTE (emulator limitation): GoogleAuthProvider.credentialFromError(err) returns null
    // under the Auth emulator for this synthetic OIDC credential, so linkGoogle cannot
    // complete the "sign into the pre-existing account" step here — it correctly resolves
    // the outcome but has no credential to hand signInWithCredential. The resolver decision
    // itself (verified below) is what the emulator can prove; the actual account-switch via
    // signInWithCredential is covered by resolveLinkOutcome's unit tests and must be
    // confirmed against real Google Sign-In in a live manual check.
    expect(outcome).toEqual({ kind: 'use-existing-account' })
    // The second visitor's guest profile is left untouched — no accountState flip happened.
    const secondSnap = await getDoc(doc(db, 'users', secondUid))
    expect(secondSnap.data()!.accountState).toBe('guest')
  })
})
