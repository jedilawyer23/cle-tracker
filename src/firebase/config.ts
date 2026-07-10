// ABOUTME: Reads and validates the Firebase Web SDK config from Vite env vars.
// ABOUTME: Never hardcodes secrets — every value comes from import.meta.env at build time.
export interface FirebaseConfig {
  apiKey: string; authDomain: string; projectId: string; appId: string
  storageBucket?: string; messagingSenderId?: string
}

type Env = Record<string, string | undefined>

export function readFirebaseConfig(env: Env): FirebaseConfig {
  const cfg = {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    appId: env.VITE_FIREBASE_APP_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  }
  const required = ['apiKey', 'authDomain', 'projectId', 'appId'] as const
  const missing = required.filter((k) => !cfg[k])
  if (missing.length) throw new Error(`Missing Firebase env vars: ${missing.join(', ')}`)
  return cfg as FirebaseConfig
}
