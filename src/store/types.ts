// ABOUTME: The persistence-agnostic Store contract and the user profile shape.
// ABOUTME: Introduced in M4 for the Firestore-backed store; M2's CreditStore is unaffected.
import type { Group, Period, Credit } from '../domain/types'

export interface UserProfile {
  name: string
  lastName: string
  group: Group
  admissionDate: string | null
  accountState: 'guest' | 'linked'
  currentPeriod: Period
  requirementsVersion: string
}

export interface Store {
  /** Resolves once the initial profile + credits have loaded. */
  ready(): Promise<void>
  getProfile(): UserProfile | null
  getCredits(): Credit[]
  saveProfile(profile: UserProfile): Promise<void>
  addCredit(credit: Credit): Promise<void>
  updateCredit(credit: Credit): Promise<void>
  removeCredit(creditId: string): Promise<void>
  /** Registers a change listener; returns an unsubscribe fn. */
  subscribe(listener: () => void): () => void
}
