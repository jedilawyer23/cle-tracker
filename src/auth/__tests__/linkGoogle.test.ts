// ABOUTME: Unit test (mocked firebase/auth + firebase/firestore + mergeCreditsIntoAccount) for
// ABOUTME: linkGoogle's use-existing-account branch — the real Auth-emulator credential-already-
// ABOUTME: in-use path can't drive this (see the NOTE in linkGoogle.emulator.test.ts: the Auth
// ABOUTME: emulator's credentialFromError returns null for the synthetic OIDC credential), so we
// ABOUTME: verify the guest->existing merge wiring here with fully injected dependencies instead.
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import type { Auth, User, UserCredential } from 'firebase/auth'
import type { Firestore } from 'firebase/firestore'
import { linkGoogle } from '../linkGoogle'

vi.mock('firebase/auth', () => ({
  GoogleAuthProvider: Object.assign(
    vi.fn(function GoogleAuthProvider(this: unknown) { return this }),
    { credentialFromError: vi.fn() },
  ),
  linkWithPopup: vi.fn(),
  signInWithCredential: vi.fn(),
}))
vi.mock('firebase/firestore', () => ({
  doc: vi.fn((_db: unknown, ...segments: string[]) => segments.join('/')),
  setDoc: vi.fn(),
}))
vi.mock('../../store/mergeCreditsIntoAccount', () => ({
  mergeCreditsIntoAccount: vi.fn(),
}))

import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth'
import { doc, setDoc } from 'firebase/firestore'
import { mergeCreditsIntoAccount } from '../../store/mergeCreditsIntoAccount'

const db = {} as Firestore

function credentialAlreadyInUseError() {
  return Object.assign(new Error('credential in use'), { code: 'auth/credential-already-in-use' })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('linkGoogle — use-existing-account branch', () => {
  it('merges the guest uid\'s credits into the existing account and flips it to linked', async () => {
    const auth = { currentUser: { uid: 'guest-uid' } as User } as Auth
    const fakeCredential = { providerId: 'google.com' }
    ;(GoogleAuthProvider.credentialFromError as Mock).mockReturnValue(fakeCredential)
    ;(signInWithCredential as Mock).mockImplementation(async (authArg: Auth, _cred: unknown) => {
      const existingUser = { uid: 'existing-uid', email: 'owner@example.com' } as User
      ;(authArg as { currentUser: User }).currentUser = existingUser
      return { user: existingUser } as UserCredential
    })
    ;(mergeCreditsIntoAccount as Mock).mockResolvedValue(2)
    const link = vi.fn().mockRejectedValue(credentialAlreadyInUseError())

    const outcome = await linkGoogle(auth, db, link)

    expect(outcome).toEqual({ kind: 'use-existing-account' })
    expect(signInWithCredential).toHaveBeenCalledWith(auth, fakeCredential)
    expect(mergeCreditsIntoAccount).toHaveBeenCalledWith(db, 'guest-uid', 'existing-uid')
    expect(setDoc).toHaveBeenCalledWith(
      doc(db, 'users', 'existing-uid'),
      { accountState: 'linked', email: 'owner@example.com' },
      { merge: true },
    )
  })

  it('returns the outcome unchanged without merging when no credential can be recovered from the error', async () => {
    const auth = { currentUser: { uid: 'guest-uid' } as User } as Auth
    ;(GoogleAuthProvider.credentialFromError as Mock).mockReturnValue(null)
    const link = vi.fn().mockRejectedValue(credentialAlreadyInUseError())

    const outcome = await linkGoogle(auth, db, link)

    expect(outcome).toEqual({ kind: 'use-existing-account' })
    expect(signInWithCredential).not.toHaveBeenCalled()
    expect(mergeCreditsIntoAccount).not.toHaveBeenCalled()
    expect(setDoc).not.toHaveBeenCalled()
  })
})
