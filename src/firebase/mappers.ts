// ABOUTME: Pure conversions between domain/profile objects and Firestore document data.
// ABOUTME: Keeps Firestore field naming and the doc-id/credit-id split out of the store.
import type { Credit } from '../domain/types'
import type { UserProfile } from '../store/types'

export function profileToDoc(p: UserProfile): Record<string, unknown> {
  return { ...p }
}
export function docToProfile(d: Record<string, unknown>): UserProfile {
  return d as unknown as UserProfile
}
export function creditToDoc(c: Credit): Record<string, unknown> {
  const { id: _id, ...rest } = c
  return rest
}
export function docToCredit(id: string, d: Record<string, unknown>): Credit {
  return { id, ...(d as Omit<Credit, 'id'>) }
}
