// ABOUTME: In-memory fake async Store for fast component/integration tests — never touches
// ABOUTME: Firestore or an emulator. Satisfies the exact async Store contract FirestoreStore does.
import type { Store, UserProfile } from './types'
import type { Credit } from '../domain/types'

export function createFakeStore(seed?: { profile?: UserProfile | null; credits?: Credit[] }): Store {
  let profile: UserProfile | null = seed?.profile ?? null
  let credits: Credit[] = seed?.credits ?? []
  const listeners = new Set<() => void>()
  const emit = () => listeners.forEach((l) => l())

  return {
    async ready() {},
    getProfile: () => profile,
    getCredits: () => credits,
    async saveProfile(p) {
      profile = p
      emit()
    },
    async addCredit(c) {
      credits = [...credits, c]
      emit()
    },
    async updateCredit(c) {
      const i = credits.findIndex((existing) => existing.id === c.id)
      if (i === -1) throw new Error(`updateCredit: no credit with id ${c.id}`)
      credits = credits.map((existing) => (existing.id === c.id ? c : existing))
      emit()
    },
    async removeCredit(id) {
      if (!credits.some((c) => c.id === id)) throw new Error(`removeCredit: no credit with id ${id}`)
      credits = credits.filter((c) => c.id !== id)
      emit()
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}
