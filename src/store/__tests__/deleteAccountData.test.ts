// ABOUTME: Unit test (mocked firebase/firestore) for deleteAccountData — verifies every credit
// ABOUTME: doc is deleted before the user profile doc, using the same mocking style as linkGoogle.test.ts.
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import type { Firestore } from 'firebase/firestore'
import { deleteAccountData } from '../deleteAccountData'

vi.mock('firebase/firestore', () => ({
  doc: vi.fn((_db: unknown, ...segments: string[]) => segments.join('/')),
  collection: vi.fn((_db: unknown, ...segments: string[]) => segments.join('/')),
  getDocs: vi.fn(),
  deleteDoc: vi.fn(),
}))

import { doc, collection, getDocs, deleteDoc } from 'firebase/firestore'

const db = {} as Firestore

beforeEach(() => {
  vi.clearAllMocks()
})

describe('deleteAccountData', () => {
  it('deletes every credit doc, then the user profile doc', async () => {
    ;(getDocs as Mock).mockResolvedValue({
      docs: [{ ref: 'users/u1/credits/a' }, { ref: 'users/u1/credits/b' }],
    })

    await deleteAccountData(db, 'u1')

    expect(collection).toHaveBeenCalledWith(db, 'users', 'u1', 'credits')
    expect(deleteDoc).toHaveBeenCalledWith('users/u1/credits/a')
    expect(deleteDoc).toHaveBeenCalledWith('users/u1/credits/b')
    expect(deleteDoc).toHaveBeenCalledWith(doc(db, 'users', 'u1'))
    // The profile doc is only deleted once every credit is gone.
    const profileCallIndex = (deleteDoc as Mock).mock.calls.findIndex(c => c[0] === 'users/u1')
    expect(profileCallIndex).toBe((deleteDoc as Mock).mock.calls.length - 1)
  })

  it('deletes just the profile doc when there are no credits', async () => {
    ;(getDocs as Mock).mockResolvedValue({ docs: [] })

    await deleteAccountData(db, 'u1')

    expect(deleteDoc).toHaveBeenCalledTimes(1)
    expect(deleteDoc).toHaveBeenCalledWith('users/u1')
  })
})
