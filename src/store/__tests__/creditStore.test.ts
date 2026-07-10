// ABOUTME: Tests the localStorage-backed credit store CRUD interface.
import { describe, it, expect, beforeEach } from 'vitest'
import { createCreditStore, type CreditStore } from '../creditStore'
import type { Credit } from '../../domain/types'

const base: Omit<Credit, 'id'> = {
  provider: 'CEB', activityTitle: 'Conflicts of Interest', completionDate: '2026-01-22',
  totalHours: 1.5, participatory: true, categoryHours: { ethics: 1.5 },
}

// A minimal in-memory Storage stand-in so tests never touch the real localStorage.
function fakeStorage(): Storage {
  const map = new Map<string, string>()
  return {
    get length() { return map.size },
    clear: () => map.clear(),
    getItem: (k) => map.get(k) ?? null,
    key: (i) => [...map.keys()][i] ?? null,
    removeItem: (k) => { map.delete(k) },
    setItem: (k, v) => { map.set(k, v) },
  }
}

describe('createCreditStore', () => {
  let store: CreditStore
  beforeEach(() => { store = createCreditStore(fakeStorage(), 'credits') })

  it('starts empty', () => {
    expect(store.list()).toEqual([])
  })
  it('add returns the credit with a generated id and lists it', () => {
    const c = store.add(base)
    expect(c.id).toBeTruthy()
    expect(store.list()).toHaveLength(1)
    expect(store.list()[0].provider).toBe('CEB')
  })
  it('update patches a credit by id', () => {
    const c = store.add(base)
    const updated = store.update(c.id, { totalHours: 2 })
    expect(updated.totalHours).toBe(2)
    expect(store.list()[0].totalHours).toBe(2)
  })
  it('remove deletes a credit by id', () => {
    const c = store.add(base)
    store.remove(c.id)
    expect(store.list()).toEqual([])
  })
  it('persists across store instances sharing the same storage', () => {
    const storage = fakeStorage()
    createCreditStore(storage, 'credits').add(base)
    expect(createCreditStore(storage, 'credits').list()).toHaveLength(1)
  })
  it('throws when updating or removing an unknown id', () => {
    expect(() => store.update('nope', {})).toThrow()
    expect(() => store.remove('nope')).toThrow()
  })
})
