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

// Google's OAuth handler is served from `authDomain`. When that differs from the host the app
// runs on, the redirect sign-in hops app-domain → authDomain → back, and Safari/iOS partitions
// storage across that hop and drops the returned credential (the user lands back signed-out).
// Firebase Hosting serves the `/__/auth/` handler on every domain it hosts, so on any of our
// Hosting-served domains we use the current host as authDomain to keep the whole flow same-origin.
// Off Hosting (localhost dev), fall back to the configured authDomain.
export function resolveAuthDomain(hostname: string, configured: string): string {
  const isHostingServed =
    hostname === 'clekeeper.com' ||
    hostname === 'www.clekeeper.com' ||
    hostname.endsWith('.web.app') ||
    hostname.endsWith('.firebaseapp.com')
  return isHostingServed ? hostname : configured
}
