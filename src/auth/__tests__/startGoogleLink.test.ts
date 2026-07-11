// ABOUTME: Unit tests (mocked firebase/auth + firestore) for startGoogleLink — picks the redirect
// ABOUTME: flow on touch devices (popups get blocked there) and the existing popup flow otherwise.
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import type { Auth, User } from 'firebase/auth'
import type { Firestore } from 'firebase/firestore'
import { startGoogleLink } from '../linkGoogle'

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

import { linkWithPopup, linkWithRedirect } from 'firebase/auth'

const db = {} as Firestore

beforeEach(() => {
  vi.clearAllMocks()
})

describe('startGoogleLink', () => {
  it('returns an error outcome with no current user', async () => {
    const auth = { currentUser: null } as Auth
    const outcome = await startGoogleLink(auth, db, () => true)
    expect(outcome).toEqual({ kind: 'error', code: 'auth/no-current-user' })
  })

  it('uses the redirect flow on a touch device and returns cancelled without opening the popup', async () => {
    const user = { uid: 'guest-uid' } as User
    const auth = { currentUser: user } as Auth
    ;(linkWithRedirect as Mock).mockResolvedValue(undefined)

    const outcome = await startGoogleLink(auth, db, () => true)

    expect(linkWithRedirect).toHaveBeenCalledWith(user, expect.any(Object))
    expect(linkWithPopup).not.toHaveBeenCalled()
    expect(outcome).toEqual({ kind: 'cancelled' })
  })

  it('surfaces an error outcome when the redirect rejects before navigating (e.g. unauthorized domain)', async () => {
    const user = { uid: 'guest-uid' } as User
    const auth = { currentUser: user } as Auth
    ;(linkWithRedirect as Mock).mockRejectedValue({ code: 'auth/unauthorized-domain' })

    const outcome = await startGoogleLink(auth, db, () => true)

    expect(outcome).toEqual({ kind: 'error', code: 'auth/unauthorized-domain' })
  })

  it('delegates to the existing popup flow on a non-touch device', async () => {
    const user = { uid: 'guest-uid' } as User
    const auth = { currentUser: user } as Auth
    ;(linkWithPopup as Mock).mockResolvedValue({ user })

    const outcome = await startGoogleLink(auth, db, () => false)

    expect(linkWithPopup).toHaveBeenCalled()
    expect(linkWithRedirect).not.toHaveBeenCalled()
    expect(outcome).toEqual({ kind: 'linked' })
  })
})
