// ABOUTME: Emulator test — FirestoreStore reads and writes the users/{uid} profile live.
// ABOUTME: Requires the Firestore + Auth emulators (run via `npm run test:emulator`); rules
// ABOUTME: require a signed-in caller, so each test signs in anonymously for its own uid.
import { beforeAll, afterAll, describe, it, expect } from 'vitest'
import { initializeApp, deleteApp, type FirebaseApp } from 'firebase/app'
import { getFirestore, type Firestore } from 'firebase/firestore'
import { connectFirestoreEmulator } from 'firebase/firestore'
import { getAuth, connectAuthEmulator, signInAnonymously, type Auth } from 'firebase/auth'
import { FirestoreStore } from '../firestoreStore'
import type { UserProfile } from '../types'
import type { Credit } from '../../domain/types'

let app: FirebaseApp
let db: Firestore
let auth: Auth

const profile: UserProfile = {
  name: 'Maya Hoffman', lastName: 'Hoffman', group: 2, admissionDate: null,
  accountState: 'guest',
  currentPeriod: { start: '2024-02-01', end: '2027-03-29', reportBy: '2027-03-30' },
  requirementsVersion: '2026-07-10',
}

beforeAll(() => {
  app = initializeApp({ apiKey: 'demo', projectId: 'demo-cle' })
  db = getFirestore(app)
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
  auth = getAuth(app)
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
})
afterAll(() => deleteApp(app))

describe('FirestoreStore profile', () => {
  it('saves a first-run profile and reads it back live', async () => {
    const { user } = await signInAnonymously(auth)
    const store = new FirestoreStore(db, user.uid)
    await store.ready()
    expect(store.getProfile()).toBeNull()
    await store.saveProfile(profile)
    // onSnapshot must reflect the write into the cache
    await new Promise((r) => setTimeout(r, 100))
    expect(store.getProfile()).toEqual(profile)
    store.dispose()
  })
})

const credit = (over: Partial<Credit>): Credit => ({
  id: 'c1', provider: 'p', activityTitle: 't', completionDate: '2026-01-01',
  totalHours: 1, participatory: true, categoryHours: {}, ...over,
})

describe('FirestoreStore credits', () => {
  it('adds, updates, removes credits and notifies subscribers live', async () => {
    const { user } = await signInAnonymously(auth)
    const store = new FirestoreStore(db, user.uid)
    await store.ready()
    let notifications = 0
    const unsub = store.subscribe(() => { notifications++ })

    await store.addCredit(credit({ id: 'a', totalHours: 2 }))
    await new Promise((r) => setTimeout(r, 100))
    expect(store.getCredits().map((c) => c.id)).toContain('a')

    await store.updateCredit(credit({ id: 'a', totalHours: 5 }))
    await new Promise((r) => setTimeout(r, 100))
    expect(store.getCredits().find((c) => c.id === 'a')!.totalHours).toBe(5)

    await store.removeCredit('a')
    await new Promise((r) => setTimeout(r, 100))
    expect(store.getCredits()).toHaveLength(0)

    expect(notifications).toBeGreaterThan(0)
    unsub(); store.dispose()
  })
})
