// ABOUTME: React hook wrapping an async Store so mutations and live updates re-render the UI.
// ABOUTME: The store is always injected — the caller (App) owns which Store implementation is live.
import { useCallback, useEffect, useState } from 'react'
import type { Credit } from '../domain/types'
import type { Store } from './types'

export function useCredits(store: Store) {
  const [credits, setCredits] = useState<Credit[]>(() => store.getCredits())

  // Re-sync on store swap, and stay in sync with every subsequent write — including ones
  // that land from elsewhere (another tab, the live Firestore subscription).
  useEffect(() => {
    setCredits(store.getCredits())
    return store.subscribe(() => setCredits(store.getCredits()))
  }, [store])

  const add = useCallback(async (input: Omit<Credit, 'id'>) => {
    const credit: Credit = { ...input, id: crypto.randomUUID() }
    await store.addCredit(credit)
    return credit
  }, [store])

  const update = useCallback(async (id: string, patch: Partial<Omit<Credit, 'id'>>) => {
    const existing = store.getCredits().find((c) => c.id === id)
    if (!existing) throw new Error(`update: no credit with id ${id}`)
    const updated: Credit = { ...existing, ...patch, id }
    await store.updateCredit(updated)
    return updated
  }, [store])

  const remove = useCallback(async (id: string) => {
    await store.removeCredit(id)
  }, [store])

  return { credits, add, update, remove }
}
