// ABOUTME: Unit test (mocked firebase/auth + deleteAccountData) for deleteAccount — data is wiped
// ABOUTME: before the Auth user, and a stale-session deleteUser failure still reloads but surfaces.
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import type { Auth, User } from 'firebase/auth'
import type { Firestore } from 'firebase/firestore'
import { deleteAccount } from '../deleteAccount'

vi.mock('firebase/auth', () => ({
  deleteUser: vi.fn(),
}))
vi.mock('../../store/deleteAccountData', () => ({
  deleteAccountData: vi.fn(),
}))

import { deleteUser } from 'firebase/auth'
import { deleteAccountData } from '../../store/deleteAccountData'

const db = {} as Firestore

beforeEach(() => {
  vi.clearAllMocks()
})

describe('deleteAccount', () => {
  it('does nothing when there is no signed-in user', async () => {
    const auth = { currentUser: null } as Auth
    const reload = vi.fn()

    await deleteAccount(auth, db, reload)

    expect(deleteAccountData).not.toHaveBeenCalled()
    expect(deleteUser).not.toHaveBeenCalled()
    expect(reload).not.toHaveBeenCalled()
  })

  it('deletes the Firestore data, then the Auth user, then reloads', async () => {
    const user = { uid: 'u1' } as User
    const auth = { currentUser: user } as Auth
    const reload = vi.fn()
    ;(deleteAccountData as Mock).mockResolvedValue(undefined)
    ;(deleteUser as Mock).mockResolvedValue(undefined)

    await deleteAccount(auth, db, reload)

    expect(deleteAccountData).toHaveBeenCalledWith(db, 'u1')
    expect(deleteUser).toHaveBeenCalledWith(user)
    expect(reload).toHaveBeenCalledTimes(1)
    // Data must be gone before the Auth user is deleted.
    const dataOrder = (deleteAccountData as Mock).mock.invocationCallOrder[0]!
    const userOrder = (deleteUser as Mock).mock.invocationCallOrder[0]!
    expect(dataOrder).toBeLessThan(userOrder)
  })

  it('on auth/requires-recent-login: still reloads (data is already gone) but rejects with a clear message', async () => {
    const user = { uid: 'u1' } as User
    const auth = { currentUser: user } as Auth
    const reload = vi.fn()
    ;(deleteAccountData as Mock).mockResolvedValue(undefined)
    ;(deleteUser as Mock).mockRejectedValue(Object.assign(new Error('stale'), { code: 'auth/requires-recent-login' }))

    await expect(deleteAccount(auth, db, reload)).rejects.toThrow(/sign-in/i)

    expect(deleteAccountData).toHaveBeenCalledWith(db, 'u1')
    expect(reload).toHaveBeenCalledTimes(1)
  })

  it('on any other deleteUser failure: propagates the error without reloading', async () => {
    const user = { uid: 'u1' } as User
    const auth = { currentUser: user } as Auth
    const reload = vi.fn()
    ;(deleteAccountData as Mock).mockResolvedValue(undefined)
    const boom = Object.assign(new Error('network down'), { code: 'auth/network-request-failed' })
    ;(deleteUser as Mock).mockRejectedValue(boom)

    await expect(deleteAccount(auth, db, reload)).rejects.toThrow('network down')

    expect(reload).not.toHaveBeenCalled()
  })

  it('propagates a deleteAccountData failure without ever calling deleteUser or reloading', async () => {
    const user = { uid: 'u1' } as User
    const auth = { currentUser: user } as Auth
    const reload = vi.fn()
    ;(deleteAccountData as Mock).mockRejectedValue(new Error('firestore down'))

    await expect(deleteAccount(auth, db, reload)).rejects.toThrow('firestore down')

    expect(deleteUser).not.toHaveBeenCalled()
    expect(reload).not.toHaveBeenCalled()
  })
})
