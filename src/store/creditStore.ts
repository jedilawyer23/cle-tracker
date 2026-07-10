// ABOUTME: localStorage-backed CRUD store for a user's logged MCLE credits.
// ABOUTME: The list/add/update/remove interface is what a later milestone swaps onto Firestore.
import type { Credit } from '../domain/types'

// Synchronous because localStorage is synchronous; when M4 swaps this onto Firestore,
// every method here becomes Promise-returning and callers will need to await them.
export interface CreditStore {
  list(): Credit[]
  add(input: Omit<Credit, 'id'>): Credit
  update(id: string, patch: Partial<Omit<Credit, 'id'>>): Credit
  remove(id: string): void
}

const DEFAULT_KEY = 'cle.credits'

export function createCreditStore(
  storage: Storage = localStorage,
  key: string = DEFAULT_KEY,
): CreditStore {
  const read = (): Credit[] => {
    const raw = storage.getItem(key)
    return raw ? (JSON.parse(raw) as Credit[]) : []
  }
  const write = (credits: Credit[]) => storage.setItem(key, JSON.stringify(credits))

  return {
    list: () => read(),
    add(input) {
      const credit: Credit = { ...input, id: crypto.randomUUID() }
      write([...read(), credit])
      return credit
    },
    update(id, patch) {
      const credits = read()
      const i = credits.findIndex(c => c.id === id)
      if (i === -1) throw new Error(`update: no credit with id ${id}`)
      const updated: Credit = { ...credits[i], ...patch, id }
      credits[i] = updated
      write(credits)
      return updated
    },
    remove(id) {
      const credits = read()
      if (!credits.some(c => c.id === id)) throw new Error(`remove: no credit with id ${id}`)
      write(credits.filter(c => c.id !== id))
    },
  }
}
