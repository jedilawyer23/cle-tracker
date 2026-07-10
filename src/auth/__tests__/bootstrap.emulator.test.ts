// ABOUTME: Emulator test — ensureAnonymousUser signs a fresh visitor in anonymously.
// ABOUTME: Requires the Auth emulator (run via `npm run test:emulator`).
import { beforeAll, afterAll, describe, it, expect } from 'vitest'
import { initializeApp, deleteApp, type FirebaseApp } from 'firebase/app'
import { getAuth, connectAuthEmulator, signOut, type Auth } from 'firebase/auth'
import { ensureAnonymousUser } from '../bootstrap'

let app: FirebaseApp
let auth: Auth

beforeAll(() => {
  app = initializeApp({ apiKey: 'demo', projectId: 'demo-cle' })
  auth = getAuth(app)
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
})
afterAll(() => deleteApp(app))

describe('ensureAnonymousUser', () => {
  it('creates an anonymous uid on first call and reuses it on the second', async () => {
    await signOut(auth).catch(() => {})
    const u1 = await ensureAnonymousUser(auth)
    expect(u1.isAnonymous).toBe(true)
    expect(u1.uid).toBeTruthy()
    const u2 = await ensureAnonymousUser(auth)
    expect(u2.uid).toBe(u1.uid)
  })
})
