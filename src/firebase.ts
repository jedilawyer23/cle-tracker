// ABOUTME: Initializes the Firebase client app from Vite env vars (VITE_FIREBASE_*) — no
// ABOUTME: real config is ever committed; see .env.example. Exports `functions` for the callable.
import { initializeApp, type FirebaseOptions } from 'firebase/app'
import { getFunctions } from 'firebase/functions'

const firebaseConfig: FirebaseOptions = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const app = initializeApp(firebaseConfig)
export const functions = getFunctions(app)
