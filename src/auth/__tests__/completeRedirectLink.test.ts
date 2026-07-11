// ABOUTME: Unit tests (mocked firebase/auth + firestore + mergeCreditsIntoAccount) for
// ABOUTME: completeRedirectLink — resolves a pending Google redirect sign-in on boot.
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import type { Auth, User, UserCredential } from 'firebase/auth'
import type { Firestore } from 'firebase/firestore'
import { completeRedirectLink } from '../linkGoogle'

vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: Object.assign(
    vi.fn(function GoogleAuthProvider(this: unknown) { return this }),
    { credentialFromError: vi.fn() },
  ),
  linkWithPopup: vi.fn(),
  linkWithRedirect: vi.fn(),
  signInWithCredential: vi.fn(),
  getRedirectResult: vi.fn(),
}))
vi.mock('firebase/firestore', () => ({
  doc: vi.fn((_db: unknown, ...segments: string[]) => segments.join('/')),
  collection: vi.fn((_db: unknown, ...segments: string[]) => segments.join('/')),
  getDocs: vi.fn(),
  setDoc: vi.fn(),
}))
vi.mock('../../store/mergeCreditsIntoAccount', () => ({
  mergeCreditsIntoAccount: vi.fn(),
}))

import { GoogleAuthProvider, getRedirectResult, signInWithCredential } from 'firebase/auth'
import { doc, getDocs, setDoc } from 'firebase/firestore'
import { mergeCreditsIntoAccount } from '../../store/mergeCreditsIntoAccount'

const db = {} as Firestore

beforeEach(() => {
  vi.clearAllMocks()
})

describe('completeRedirectLink', () => {
  it('returns null and writes nothing when no redirect was pending', async () => {
    const auth = { currentUser: { uid: 'guest-uid' } as User } as Auth
    ;(getRedirectResult as Mock).mockResolvedValue(null)

    const outcome = await completeRedirectLink(auth, db)

    expect(outcome).toBeNull()
    expect(setDoc).not.toHaveBeenCalled()
  })

  it('marks the account linked and returns {kind:"linked"} when the redirect resolves', async () => {
    const linkedUser = { uid: 'guest-uid', email: 'owner@example.com' } as User
    const auth = { currentUser: linkedUser } as Auth
    ;(getRedirectResult as Mock).mockResolvedValue({ user: linkedUser } as UserCredential)

    const outcome = await completeRedirectLink(auth, db)

    expect(outcome).toEqual({ kind: 'linked' })
    expect(setDoc).toHaveBeenCalledWith(
      doc(db, 'users', 'guest-uid'),
      { accountState: 'linked', email: 'owner@example.com' },
      { merge: true },
    )
  })

  it('adopts the existing account and returns {kind:"use-existing-account"} on credential-already-in-use', async () => {
    const auth = { currentUser: { uid: 'guest-uid' } as User } as Auth
    const err = Object.assign(new Error('credential in use'), { code: 'auth/credential-already-in-use' })
    ;(getRedirectResult as Mock).mockRejectedValue(err)
    const fakeCredential = { providerId: 'google.com' }
    const guestDocData = { provider: 'CEB', activityTitle: 'Conflicts', completionDate: '2026-01-22', totalHours: 4, participatory: true, categoryHours: { ethics: 4 } }
    ;(getDocs as Mock).mockResolvedValue({ docs: [{ id: 'g1', data: () => guestDocData }] })
    ;(GoogleAuthProvider.credentialFromError as Mock).mockReturnValue(fakeCredential)
    ;(signInWithCredential as Mock).mockImplementation(async (authArg: Auth, _cred: unknown) => {
      const existingUser = { uid: 'existing-uid', email: 'owner@example.com' } as User
      ;(authArg as { currentUser: User }).currentUser = existingUser
      return { user: existingUser } as UserCredential
    })
    ;(mergeCreditsIntoAccount as Mock).mockResolvedValue(2)

    const outcome = await completeRedirectLink(auth, db)

    expect(outcome).toEqual({ kind: 'use-existing-account' })
    expect(signInWithCredential).toHaveBeenCalledWith(auth, fakeCredential)
    // Guest credits are read BEFORE the switch and merged into the existing account.
    expect(mergeCreditsIntoAccount).toHaveBeenCalledWith(db, 'existing-uid', [{ id: 'g1', ...guestDocData }])
    expect(setDoc).toHaveBeenCalledWith(
      doc(db, 'users', 'existing-uid'),
      { accountState: 'linked', email: 'owner@example.com' },
      { merge: true },
    )
  })
})
