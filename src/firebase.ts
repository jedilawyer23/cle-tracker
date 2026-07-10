// ABOUTME: Initializes the Firebase client app from Vite env vars (VITE_FIREBASE_*) — no
// ABOUTME: real config is ever committed; see .env.example. Exports `functions`, `auth`, `db`.
import { initializeApp } from 'firebase/app'
import { getFunctions } from 'firebase/functions'
import { getAuth, connectAuthEmulator } from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'
import { readFirebaseConfig } from './firebase/config'

const firebaseConfig = readFirebaseConfig(import.meta.env)

export const app = initializeApp(firebaseConfig)
export const functions = getFunctions(app)
export const auth = getAuth(app)
export const db = getFirestore(app)

// Local dev/test only — never connects to real emulated services in production builds.
if (import.meta.env.VITE_FIREBASE_USE_EMULATOR === 'true') {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
}
