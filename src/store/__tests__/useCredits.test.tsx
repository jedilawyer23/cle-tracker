// ABOUTME: Tests the React hook that mirrors an async Store's credits into re-rendering state.
// ABOUTME: Uses the in-memory fake Store — no Firestore, no emulator.
import { describe, it, expect } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { useCredits } from '../useCredits'
import { createFakeStore } from '../fakeStore'
import type { Credit } from '../../domain/types'

const base: Omit<Credit, 'id'> = {
  provider: 'CEB', activityTitle: 'X', completionDate: '2026-01-22',
  totalHours: 1, participatory: true, categoryHours: {},
}

describe('useCredits', () => {
  it('exposes stored credits and re-renders on add/update/remove', async () => {
    const store = createFakeStore()
    const { result } = renderHook(() => useCredits(store))
    expect(result.current.credits).toEqual([])

    let id = ''
    await act(async () => { id = (await result.current.add(base)).id })
    expect(result.current.credits).toHaveLength(1)

    await act(async () => { await result.current.update(id, { totalHours: 3 }) })
    expect(result.current.credits[0].totalHours).toBe(3)

    await act(async () => { await result.current.remove(id) })
    expect(result.current.credits).toEqual([])
  })

  it('starts from whatever the store already has and reacts to external subscription events', async () => {
    const seeded: Credit = { id: 'seed', ...base }
    const store = createFakeStore({ credits: [seeded] })
    const { result } = renderHook(() => useCredits(store))
    expect(result.current.credits).toEqual([seeded])

    await act(async () => { await store.addCredit({ id: 'external', ...base }) })
    await waitFor(() => expect(result.current.credits).toHaveLength(2))
  })
})
