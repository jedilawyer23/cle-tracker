// ABOUTME: React hook wrapping a CreditStore so mutations re-render the UI.
// ABOUTME: Components depend on this surface; swapping the store keeps the hook unchanged.
import { useCallback, useState } from 'react'
import type { Credit } from '../domain/types'
import { createCreditStore, type CreditStore } from './creditStore'

const defaultStore = createCreditStore()

export function useCredits(store: CreditStore = defaultStore) {
  const [credits, setCredits] = useState<Credit[]>(() => store.list())
  const add = useCallback((input: Omit<Credit, 'id'>) => {
    const c = store.add(input); setCredits(store.list()); return c
  }, [store])
  const update = useCallback((id: string, patch: Partial<Omit<Credit, 'id'>>) => {
    const c = store.update(id, patch); setCredits(store.list()); return c
  }, [store])
  const remove = useCallback((id: string) => {
    store.remove(id); setCredits(store.list())
  }, [store])
  return { credits, add, update, remove }
}
