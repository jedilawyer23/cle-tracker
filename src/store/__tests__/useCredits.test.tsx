// ABOUTME: Tests the React hook that mirrors the credit store into re-rendering state.
import { describe, it, expect } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useCredits } from '../useCredits'
import { createCreditStore } from '../creditStore'
import type { Credit } from '../../domain/types'

function fakeStorage(): Storage {
  const map = new Map<string, string>()
  return {
    get length() { return map.size }, clear: () => map.clear(),
    getItem: (k) => map.get(k) ?? null, key: (i) => [...map.keys()][i] ?? null,
    removeItem: (k) => { map.delete(k) }, setItem: (k, v) => { map.set(k, v) },
  }
}

const base: Omit<Credit, 'id'> = {
  provider: 'CEB', activityTitle: 'X', completionDate: '2026-01-22',
  totalHours: 1, participatory: true, categoryHours: {},
}

describe('useCredits', () => {
  it('exposes stored credits and re-renders on add/update/remove', () => {
    const store = createCreditStore(fakeStorage())
    const { result } = renderHook(() => useCredits(store))
    expect(result.current.credits).toEqual([])

    let id = ''
    act(() => { id = result.current.add(base).id })
    expect(result.current.credits).toHaveLength(1)

    act(() => { result.current.update(id, { totalHours: 3 }) })
    expect(result.current.credits[0].totalHours).toBe(3)

    act(() => { result.current.remove(id) })
    expect(result.current.credits).toEqual([])
  })
})
