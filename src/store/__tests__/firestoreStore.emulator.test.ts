// ABOUTME: Emulator test — FirestoreStore reads and writes the users/{uid} profile live.
// ABOUTME: Requires the Firestore emulator (run via `npm run test:emulator`).
import { beforeAll, afterAll, describe, it, expect } from 'vitest'
import { initializeApp, deleteApp, type FirebaseApp } from 'firebase/app'
import { getFirestore, type Firestore } from 'firebase/firestore'
import { connectFirestoreEmulator } from 'firebase/firestore'
import { FirestoreStore } from '../firestoreStore'
import type { UserProfile } from '../types'

let app: FirebaseApp
let db: Firestore

const profile: UserProfile = {
  name: 'Maya Hoffman', lastName: 'Hoffman', group: 2, admissionDate: null,
  accountState: 'guest',
  currentPeriod: { start: '2024-02-01', end: '2027-03-29', reportBy: '2027-03-30' },
  requirementsVersion: '2026-07-10',
}

beforeAll(() => {
  app = initializeApp({ projectId: 'demo-cle' })
  db = getFirestore(app)
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
})
afterAll(() => deleteApp(app))

describe('FirestoreStore profile', () => {
  it('saves a first-run profile and reads it back live', async () => {
    const store = new FirestoreStore(db, `u-${Date.now()}`)
    await store.ready()
    expect(store.getProfile()).toBeNull()
    await store.saveProfile(profile)
    // onSnapshot must reflect the write into the cache
    await new Promise((r) => setTimeout(r, 100))
    expect(store.getProfile()).toEqual(profile)
    store.dispose()
  })
})
