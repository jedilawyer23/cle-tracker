# CLE Tracker — Milestone 4: Persistence + Accounts (Firebase) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the tracker off in-memory / localStorage state onto Firebase. Every visitor is signed in anonymously on first load and gets a real uid; their profile (`users/{uid}`) and credits (`users/{uid}/credits/{id}`) live in Firestore and the dashboard reads them live. A quiet "Sign in to save" affordance links a Google credential to the existing anonymous uid — preserving the uid and all data and flipping `accountState` guest → linked. Firestore security rules confine each user to their own data and make `mcleRequirements` read-only.

**Architecture:** The M1 domain modules (`deriveGroup`, `resolvePeriod`, `calculateCompliance`, `REQUIREMENT_RULES`, `GROUP_CALENDAR`) and the M2 `Store` **interface** are unchanged. This milestone supplies a **new `Store` implementation backed by Firestore** that drops in behind the exact same interface the M2 localStorage store fulfilled — the app, the domain, and the UI from M1–M3 do not change except (a) the boot code that constructs the store and (b) the auth/link glue plus the "Sign in to save" behavior. Firebase access is isolated in `src/firebase/*`, `src/store/firestoreStore.ts`, and `src/auth/*`; nothing in `src/domain/*` imports Firebase. Pure logic (config validation, doc↔domain mappers, the link-outcome resolver) is unit-tested with plain data; the Firestore store, the anonymous-sign-in bootstrap, and the security rules are tested against the **Firebase Local Emulator Suite**.

**Tech Stack:** Firebase JS SDK **v10 (modular)** — `firebase/app`, `firebase/auth`, `firebase/firestore`; `firebase-tools` (emulators) and `@firebase/rules-unit-testing` for tests; existing Vite + React 18 + TypeScript + Vitest.

> **Version note (MUST verify at build time):** The exact Firebase SDK version and modular API surfaces (`signInAnonymously`, `linkWithPopup`, `linkWithCredential`, `GoogleAuthProvider.credentialFromError`, `onSnapshot`, `connect*Emulator`, `initializeTestEnvironment`, error-code strings such as `auth/credential-already-in-use`) **must be re-verified against the installed `firebase` and `@firebase/rules-unit-testing` versions when this milestone is built.** Firebase changes these between minor versions. Treat every import and error-code below as "verify, then use."

> **Secrets note:** Never hardcode Firebase config keys or any secret. All config comes from Vite env vars (`import.meta.env.VITE_FIREBASE_*`) at build time. Commit `.env.example` (placeholders only); never commit `.env.local`.

**Reference:** The approved UI is `mockups.html` — the "Sign in to save" affordance is the top-right `a.navbtn` in `.topline` on the guest dashboard and add screens (`#s-dash`, `#s-add`), and the first-run note "No sign-in needed — save with Google later." (`#s-setup`). Verified data model and accounts behavior are in `docs/superpowers/specs/2026-07-10-california-cle-tracker-design.md` (sections "Accounts and guest mode", "Data model (Firestore)", "Security and privacy").

> **Assumption (M2 not yet in this repo tree):** This plan assumes M1–M3 are complete and that M2 created `src/store/types.ts` defining the `Store` interface and `UserProfile`, plus a `LocalStorageStore` implementing it, and that App/AppRoot already receives its `store` by injection. The interface is **reproduced verbatim in Task 3 for reference** — if the real M2 interface differs, conform the Firestore implementation to the real one and do not modify the interface here.

---

## File structure

```
.env.example                      # VITE_FIREBASE_* placeholders (committed; no real values)
.gitignore                        # add .env.local, firebase-debug.log, .firebase/
firebase.json                     # emulator config (auth + firestore) + rules path
firestore.rules                   # security rules
vitest.emulator.config.ts         # runs only *.emulator.test.ts (needs the emulator)
src/
  firebase/
    config.ts                     # readFirebaseConfig(env) -> validated FirebaseConfig (pure)
    app.ts                        # getFirebase(): { app, auth, db } singleton; emulator wiring
    mappers.ts                    # profile/credit <-> Firestore doc (pure)
  firebase/__tests__/
    config.test.ts
    mappers.test.ts
  store/
    types.ts                      # (M2) Store interface + UserProfile — reproduced, DO NOT modify
    firestoreStore.ts             # NEW Store impl backed by Firestore (swaps M2 localStorage)
  store/__tests__/
    firestoreStore.emulator.test.ts
  auth/
    bootstrap.ts                  # ensureAnonymousUser(auth) -> User
    linkOutcome.ts                # resolveLinkOutcome(errorCode) -> outcome (pure)
    linkGoogle.ts                 # linkGoogle(auth, db): links credential to anon uid
  auth/__tests__/
    linkOutcome.test.ts
    bootstrap.emulator.test.ts
    linkGoogle.emulator.test.ts
  ui/
    SignInToSave.tsx              # top-right affordance (visible when guest)
  ui/__tests__/
    SignInToSave.test.tsx
  firestore-rules/__tests__/
    rules.emulator.test.ts        # @firebase/rules-unit-testing
  main.tsx                        # MODIFY: bootstrap anon user, build FirestoreStore, inject
  App.tsx (or AppRoot)            # MODIFY: show SignInToSave for guests; wire linkGoogle
```

`src/domain/*` is untouched. Firebase imports appear only under `src/firebase/*`, `src/store/firestoreStore.ts`, and `src/auth/*`. The UI imports the `Store` interface, never a concrete backend.

---

## Task 1: Add Firebase SDK, env config, and app init

**Files:**
- Create: `.env.example`, `src/firebase/config.ts`, `src/firebase/app.ts`
- Test: `src/firebase/__tests__/config.test.ts`
- Modify: `.gitignore`

- [ ] **Step 1: Install the SDK and emulator tooling**

Run:
```bash
cd "/Users/shrut/Documents/GitHub/CLE tracker"
npm install firebase
npm install -D firebase-tools @firebase/rules-unit-testing
```
Verify the resolved `firebase` major version is **10.x** (`npm ls firebase`); if a newer major resolved, re-verify the modular API surfaces named in this plan before continuing.

- [ ] **Step 2: Add env placeholders and gitignore secrets**

Create `.env.example` (placeholders only — no real values):
```
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=000000000000
VITE_FIREBASE_APP_ID=1:000000000000:web:abc123
VITE_FIREBASE_USE_EMULATOR=false
```
Append to `.gitignore`: `.env.local`, `.env.*.local`, `firebase-debug.log`, `.firebase/`.

- [ ] **Step 3: Write the failing test for config validation**

`src/firebase/__tests__/config.test.ts`:
```ts
// ABOUTME: Tests that Firebase config is read from env and rejects missing required keys.
import { describe, it, expect } from 'vitest'
import { readFirebaseConfig } from '../config'

const full = {
  VITE_FIREBASE_API_KEY: 'k', VITE_FIREBASE_AUTH_DOMAIN: 'd',
  VITE_FIREBASE_PROJECT_ID: 'p', VITE_FIREBASE_APP_ID: 'a',
  VITE_FIREBASE_STORAGE_BUCKET: 'b', VITE_FIREBASE_MESSAGING_SENDER_ID: 's',
}

describe('readFirebaseConfig', () => {
  it('maps env vars to a config object', () => {
    const cfg = readFirebaseConfig(full)
    expect(cfg.apiKey).toBe('k')
    expect(cfg.projectId).toBe('p')
    expect(cfg.appId).toBe('a')
  })
  it('throws listing every missing required key', () => {
    expect(() => readFirebaseConfig({})).toThrow(/apiKey/)
    expect(() => readFirebaseConfig({ ...full, VITE_FIREBASE_PROJECT_ID: undefined }))
      .toThrow(/projectId/)
  })
})
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npm test -- config`
Expected: FAIL — `readFirebaseConfig` not found.

- [ ] **Step 5: Implement config and app init**

`src/firebase/config.ts`:
```ts
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
```

`src/firebase/app.ts` (no dedicated unit test — exercised by the emulator tasks; keep it a thin singleton):
```ts
// ABOUTME: Initializes the Firebase app, Auth, and Firestore singletons for the browser.
// ABOUTME: Connects to local emulators when VITE_FIREBASE_USE_EMULATOR is truthy.
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import { getAuth, connectAuthEmulator, type Auth } from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator, type Firestore } from 'firebase/firestore'
import { readFirebaseConfig } from './config'

let handle: { app: FirebaseApp; auth: Auth; db: Firestore } | undefined

export function getFirebase(env: Record<string, string | undefined> = import.meta.env) {
  if (handle) return handle
  const app = getApps()[0] ?? initializeApp(readFirebaseConfig(env))
  const auth = getAuth(app)
  const db = getFirestore(app)
  if (env.VITE_FIREBASE_USE_EMULATOR === 'true') {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
    connectFirestoreEmulator(db, '127.0.0.1', 8080)
  }
  handle = { app, auth, db }
  return handle
}
```

- [ ] **Step 6: Run test + typecheck**

Run: `npm test -- config` → Expected: PASS (2 tests).
Run: `npx tsc --noEmit` → Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add .env.example .gitignore src/firebase/config.ts src/firebase/app.ts src/firebase/__tests__/config.test.ts package.json package-lock.json
git commit -m "feat(firebase): add SDK, env-driven config, and app init singleton"
```

---

## Task 2: Emulator config and emulator test runner

**Files:**
- Create: `firebase.json`, `vitest.emulator.config.ts`
- Modify: `vite.config.ts` (exclude emulator tests from the default run), `package.json` (scripts)

Emulator-backed tests are named `*.emulator.test.ts`. The default `npm test` **excludes** them (they need a running emulator); `npm run test:emulator` starts the emulator and runs only them via `firebase emulators:exec`.

- [ ] **Step 1: Configure the emulators**

`firebase.json`:
```json
{
  "firestore": { "rules": "firestore.rules" },
  "emulators": {
    "auth": { "port": 9099 },
    "firestore": { "port": 8080 },
    "singleUseVerification": false,
    "ui": { "enabled": false }
  }
}
```

- [ ] **Step 2: Exclude emulator tests from the default Vitest run**

In `vite.config.ts` `test`, add:
```ts
exclude: ['**/node_modules/**', '**/*.emulator.test.ts'],
```

`vitest.emulator.config.ts`:
```ts
/// <reference types="vitest" />
import { defineConfig } from 'vite'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['**/*.emulator.test.ts'],
  },
})
```

- [ ] **Step 3: Add scripts**

In `package.json` scripts:
```json
"test:emulator": "firebase emulators:exec --only auth,firestore \"vitest run --config vitest.emulator.config.ts\""
```

- [ ] **Step 4: Verify wiring**

Run: `npm test` → Expected: existing suite still green; no emulator tests picked up (none exist yet).
Run: `npm run test:emulator` → Expected: emulators boot, Vitest runs with **no test files found** and exits 0 (nothing to run yet). If `firebase` is not authenticated, `emulators:exec` still runs offline for auth+firestore; no login required.

- [ ] **Step 5: Commit**

```bash
git add firebase.json vitest.emulator.config.ts vite.config.ts package.json
git commit -m "chore(firebase): add emulator config and emulator-only test runner"
```

---

## Task 3: Store interface reference + domain↔Firestore mappers

**Files:**
- Create/confirm: `src/store/types.ts` (from M2 — reproduced; **do not modify** if it already exists)
- Create: `src/firebase/mappers.ts`
- Test: `src/firebase/__tests__/mappers.test.ts`

The `Store` interface below is the **M2 contract this milestone must satisfy**. The Firestore store keeps an in-memory cache fed by `onSnapshot`; `getProfile`/`getCredits` return that cache synchronously and `subscribe` notifies on every snapshot — the same shape the localStorage store fulfilled.

- [ ] **Step 1: Confirm (or reproduce) the M2 store interface**

`src/store/types.ts` (if this exists from M2, read it and skip; otherwise create exactly this):
```ts
// ABOUTME: The persistence-agnostic Store contract and the user profile shape.
// ABOUTME: Introduced in M2 (localStorage); M4 adds a Firestore implementation behind it.
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
```

- [ ] **Step 2: Write the failing test for the mappers**

`src/firebase/__tests__/mappers.test.ts`:
```ts
// ABOUTME: Tests lossless conversion between domain objects and Firestore doc shapes.
import { describe, it, expect } from 'vitest'
import { profileToDoc, docToProfile, creditToDoc, docToCredit } from '../mappers'
import type { UserProfile } from '../../store/types'
import type { Credit } from '../../domain/types'

const profile: UserProfile = {
  name: 'Maya Hoffman', lastName: 'Hoffman', group: 2, admissionDate: null,
  accountState: 'guest',
  currentPeriod: { start: '2024-02-01', end: '2027-03-29', reportBy: '2027-03-30' },
  requirementsVersion: '2026-07-10',
}

const credit: Credit = {
  id: 'c1', provider: 'State Bar of CA', activityTitle: 'Ethics 101',
  completionDate: '2026-01-02', totalHours: 4, participatory: true,
  categoryHours: { ethics: 4 },
}

describe('mappers', () => {
  it('round-trips a profile', () => {
    expect(docToProfile(profileToDoc(profile))).toEqual(profile)
  })
  it('drops id from the credit doc and restores it from the doc id', () => {
    const doc = creditToDoc(credit)
    expect('id' in doc).toBe(false)
    expect(docToCredit('c1', doc)).toEqual(credit)
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- mappers`
Expected: FAIL — mapper functions not found.

- [ ] **Step 4: Implement the mappers**

`src/firebase/mappers.ts`:
```ts
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
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- mappers` → Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add src/store/types.ts src/firebase/mappers.ts src/firebase/__tests__/mappers.test.ts
git commit -m "feat(firebase): add domain<->Firestore mappers and confirm store interface"
```

---

## Task 4: FirestoreStore — profile read/write (emulator TDD)

**Files:**
- Create: `src/store/firestoreStore.ts`
- Test: `src/store/__tests__/firestoreStore.emulator.test.ts`

The store is constructed with a Firestore instance and a uid. On construction it subscribes to `users/{uid}` with `onSnapshot` and caches the profile; `ready()` resolves on the first snapshot; `saveProfile` writes with `setDoc(..., { merge: true })`.

- [ ] **Step 1: Write the failing emulator test (profile)**

`src/store/__tests__/firestoreStore.emulator.test.ts`:
```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:emulator`
Expected: FAIL — `FirestoreStore` not found / not implemented.

- [ ] **Step 3: Implement FirestoreStore (profile portion)**

`src/store/firestoreStore.ts`:
```ts
// ABOUTME: Firestore-backed Store: users/{uid} profile + users/{uid}/credits subcollection.
// ABOUTME: Same Store interface M2 fulfilled with localStorage; only the backend changed.
import {
  doc, collection, onSnapshot, setDoc, deleteDoc, type Firestore, type Unsubscribe,
} from 'firebase/firestore'
import type { Store, UserProfile } from './types'
import type { Credit } from '../domain/types'
import {
  profileToDoc, docToProfile, creditToDoc, docToCredit,
} from '../firebase/mappers'

export class FirestoreStore implements Store {
  private profile: UserProfile | null = null
  private credits: Credit[] = []
  private listeners = new Set<() => void>()
  private unsubs: Unsubscribe[] = []
  private readyPromise: Promise<void>

  constructor(private db: Firestore, private uid: string) {
    let markReady!: () => void
    let profileLoaded = false
    let creditsLoaded = false
    this.readyPromise = new Promise((resolve) => { markReady = resolve })
    const settle = () => { if (profileLoaded && creditsLoaded) markReady() }

    this.unsubs.push(
      onSnapshot(doc(db, 'users', uid), (snap) => {
        this.profile = snap.exists() ? docToProfile(snap.data()) : null
        profileLoaded = true
        this.emit(); settle()
      }),
      onSnapshot(collection(db, 'users', uid, 'credits'), (snap) => {
        this.credits = snap.docs.map((d) => docToCredit(d.id, d.data()))
        creditsLoaded = true
        this.emit(); settle()
      }),
    )
  }

  ready() { return this.readyPromise }
  getProfile() { return this.profile }
  getCredits() { return this.credits }

  async saveProfile(profile: UserProfile) {
    await setDoc(doc(this.db, 'users', this.uid), profileToDoc(profile), { merge: true })
  }
  async addCredit(credit: Credit) {
    await setDoc(doc(this.db, 'users', this.uid, 'credits', credit.id), creditToDoc(credit))
  }
  async updateCredit(credit: Credit) {
    await setDoc(doc(this.db, 'users', this.uid, 'credits', credit.id), creditToDoc(credit), { merge: true })
  }
  async removeCredit(creditId: string) {
    await deleteDoc(doc(this.db, 'users', this.uid, 'credits', creditId))
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }
  dispose() { this.unsubs.forEach((u) => u()); this.listeners.clear() }
  private emit() { this.listeners.forEach((l) => l()) }
}
```
(`dispose()` is an implementation detail beyond the `Store` interface, used by tests and by boot teardown; it is fine for a concrete class to add it.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:emulator` → Expected: PASS (profile test).

- [ ] **Step 5: Commit**

```bash
git add src/store/firestoreStore.ts src/store/__tests__/firestoreStore.emulator.test.ts
git commit -m "feat(store): Firestore-backed Store with live profile read/write"
```

---

## Task 5: FirestoreStore — credits CRUD + live subscription (emulator TDD)

**Files:**
- Modify: `src/store/__tests__/firestoreStore.emulator.test.ts`

The store code from Task 4 already implements credits; this task proves credits CRUD and that `subscribe` fires on live changes.

- [ ] **Step 1: Add the failing credits + subscription test**

Append to `src/store/__tests__/firestoreStore.emulator.test.ts`:
```ts
import type { Credit } from '../../domain/types'

const credit = (over: Partial<Credit>): Credit => ({
  id: 'c1', provider: 'p', activityTitle: 't', completionDate: '2026-01-01',
  totalHours: 1, participatory: true, categoryHours: {}, ...over,
})

describe('FirestoreStore credits', () => {
  it('adds, updates, removes credits and notifies subscribers live', async () => {
    const store = new FirestoreStore(db, `u-${Date.now()}`)
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
```

- [ ] **Step 2: Run test to verify it fails, then passes**

Run: `npm run test:emulator`
Expected: this new test **passes** with the Task 4 implementation (credits CRUD already coded). If it FAILS, fix `firestoreStore.ts` — do not weaken the test. Confirm the whole emulator suite is green.

- [ ] **Step 3: Commit**

```bash
git add src/store/__tests__/firestoreStore.emulator.test.ts
git commit -m "test(store): cover Firestore credits CRUD and live subscription"
```

---

## Task 6: Anonymous sign-in bootstrap (emulator TDD)

**Files:**
- Create: `src/auth/bootstrap.ts`
- Test: `src/auth/__tests__/bootstrap.emulator.test.ts`

`ensureAnonymousUser` returns the current user if signed in, otherwise signs in anonymously — giving every first-time visitor a real uid.

- [ ] **Step 1: Write the failing emulator test**

`src/auth/__tests__/bootstrap.emulator.test.ts`:
```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:emulator`
Expected: FAIL — `ensureAnonymousUser` not found.

- [ ] **Step 3: Implement the bootstrap**

`src/auth/bootstrap.ts`:
```ts
// ABOUTME: Ensures every visitor has a Firebase uid by signing in anonymously on first load.
// ABOUTME: Idempotent — returns the existing user when one is already signed in.
import { signInAnonymously, type Auth, type User } from 'firebase/auth'

export async function ensureAnonymousUser(auth: Auth): Promise<User> {
  if (auth.currentUser) return auth.currentUser
  const cred = await signInAnonymously(auth)
  return cred.user
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:emulator` → Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/auth/bootstrap.ts src/auth/__tests__/bootstrap.emulator.test.ts
git commit -m "feat(auth): anonymous sign-in bootstrap giving every visitor a uid"
```

---

## Task 7: Google-link outcome resolver (pure)

**Files:**
- Create: `src/auth/linkOutcome.ts`
- Test: `src/auth/__tests__/linkOutcome.test.ts`

Linking can succeed, or fail with a code that decides the resolution. **Chosen resolution for `auth/credential-already-in-use`** (the Google account already belongs to a *separate* existing account): sign the user into that existing account with the returned credential and surface a clear message that data added in *this* guest session is **not** merged into it. v1 does **not** attempt a guest→existing-account data merge (out of scope; the existing account already has its own profile and credits). `auth/provider-already-linked` (or a non-anonymous current user) is a no-op "already saved". Other codes are surfaced as errors.

- [ ] **Step 1: Write the failing test**

`src/auth/__tests__/linkOutcome.test.ts`:
```ts
// ABOUTME: Tests the pure decision for how to resolve a Google account-link attempt.
import { describe, it, expect } from 'vitest'
import { resolveLinkOutcome } from '../linkOutcome'

describe('resolveLinkOutcome', () => {
  it('treats a null error code as a successful link', () => {
    expect(resolveLinkOutcome(null)).toEqual({ kind: 'linked' })
  })
  it('routes credential-already-in-use to sign into the existing account', () => {
    expect(resolveLinkOutcome('auth/credential-already-in-use'))
      .toEqual({ kind: 'use-existing-account' })
    expect(resolveLinkOutcome('auth/email-already-in-use'))
      .toEqual({ kind: 'use-existing-account' })
  })
  it('treats an already-linked provider as a no-op', () => {
    expect(resolveLinkOutcome('auth/provider-already-linked'))
      .toEqual({ kind: 'already-linked' })
  })
  it('surfaces any other code as an error', () => {
    expect(resolveLinkOutcome('auth/popup-closed-by-user'))
      .toEqual({ kind: 'error', code: 'auth/popup-closed-by-user' })
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- linkOutcome`
Expected: FAIL — `resolveLinkOutcome` not found.

- [ ] **Step 3: Implement the resolver**

`src/auth/linkOutcome.ts`:
```ts
// ABOUTME: Pure decision for resolving a Google account-link attempt from its error code.
// ABOUTME: credential-already-in-use => sign into the existing account (no guest-data merge in v1).
export type LinkOutcome =
  | { kind: 'linked' }
  | { kind: 'already-linked' }
  | { kind: 'use-existing-account' }
  | { kind: 'error'; code: string }

export function resolveLinkOutcome(errorCode: string | null): LinkOutcome {
  if (!errorCode) return { kind: 'linked' }
  switch (errorCode) {
    case 'auth/credential-already-in-use':
    case 'auth/email-already-in-use':
      return { kind: 'use-existing-account' }
    case 'auth/provider-already-linked':
      return { kind: 'already-linked' }
    default:
      return { kind: 'error', code: errorCode }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- linkOutcome` → Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/auth/linkOutcome.ts src/auth/__tests__/linkOutcome.test.ts
git commit -m "feat(auth): pure resolver for Google account-link outcomes"
```

---

## Task 8: linkGoogle glue + accountState flip (emulator TDD)

**Files:**
- Create: `src/auth/linkGoogle.ts`
- Test: `src/auth/__tests__/linkGoogle.emulator.test.ts`

`linkGoogle` links a Google credential to the current (anonymous) uid via `linkWithCredential`, preserving the uid and all data, then flips the profile's `accountState` to `linked`. On `credential-already-in-use` it signs into the existing account (per Task 7's chosen resolution). Because `linkWithPopup` cannot run headless, the **popup is injected** so the emulator test drives it with `linkWithCredential`.

> **Verify at build time:** in production `linkGoogle` uses `linkWithPopup(user, new GoogleAuthProvider())`; on error it reads the pending credential with `GoogleAuthProvider.credentialFromError(err)` and calls `signInWithCredential`. Confirm these names against the installed SDK.

- [ ] **Step 1: Write the failing emulator test**

`src/auth/__tests__/linkGoogle.emulator.test.ts`:
```ts
// ABOUTME: Emulator test — linkGoogle links a Google credential to the anonymous uid.
// ABOUTME: Injects a credential-link fn so the test can drive it without a real popup.
import { beforeAll, afterAll, describe, it, expect } from 'vitest'
import { initializeApp, deleteApp, type FirebaseApp } from 'firebase/app'
import {
  getAuth, connectAuthEmulator, signInAnonymously, signOut,
  GoogleAuthProvider, linkWithCredential, type Auth, type UserCredential,
} from 'firebase/auth'
import { getFirestore, connectFirestoreEmulator, doc, getDoc, setDoc, type Firestore } from 'firebase/firestore'
import { linkGoogle } from '../linkGoogle'

let app: FirebaseApp
let auth: Auth
let db: Firestore

// A deterministic fake Google id-token the Auth emulator accepts.
const googleCred = () => GoogleAuthProvider.credential(
  JSON.stringify({ sub: `g-${Date.now()}`, email: `x${Date.now()}@example.com` }),
)

beforeAll(() => {
  app = initializeApp({ apiKey: 'demo', projectId: 'demo-cle' })
  auth = getAuth(app); connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  db = getFirestore(app); connectFirestoreEmulator(db, '127.0.0.1', 8080)
})
afterAll(() => deleteApp(app))

describe('linkGoogle', () => {
  it('links Google to the anon uid, preserves the uid, and flips accountState', async () => {
    await signOut(auth).catch(() => {})
    const { user } = await signInAnonymously(auth)
    const anonUid = user.uid
    await setDoc(doc(db, 'users', anonUid), { accountState: 'guest', name: 'Maya' })

    const cred = googleCred()
    const link = (u: typeof user): Promise<UserCredential> => linkWithCredential(u, cred)
    const outcome = await linkGoogle(auth, db, link)

    expect(outcome).toEqual({ kind: 'linked' })
    expect(auth.currentUser!.uid).toBe(anonUid) // uid preserved
    const snap = await getDoc(doc(db, 'users', anonUid))
    expect(snap.data()!.accountState).toBe('linked')
    expect(snap.data()!.name).toBe('Maya') // data preserved
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:emulator`
Expected: FAIL — `linkGoogle` not found.

- [ ] **Step 3: Implement linkGoogle**

`src/auth/linkGoogle.ts`:
```ts
// ABOUTME: Links a Google credential to the current anonymous uid, preserving uid + data.
// ABOUTME: Flips users/{uid}.accountState to 'linked'; falls back per resolveLinkOutcome.
import {
  GoogleAuthProvider, linkWithPopup, signInWithCredential,
  type Auth, type User, type UserCredential,
} from 'firebase/auth'
import { doc, setDoc, type Firestore } from 'firebase/firestore'
import { resolveLinkOutcome, type LinkOutcome } from './linkOutcome'

// Default production linker: opens the Google popup and links to the current uid.
const popupLink = (user: User): Promise<UserCredential> =>
  linkWithPopup(user, new GoogleAuthProvider())

export async function linkGoogle(
  auth: Auth,
  db: Firestore,
  link: (user: User) => Promise<UserCredential> = popupLink,
): Promise<LinkOutcome> {
  const user = auth.currentUser
  if (!user) return { kind: 'error', code: 'auth/no-current-user' }
  try {
    const result = await link(user)
    await setDoc(doc(db, 'users', result.user.uid), { accountState: 'linked' }, { merge: true })
    return { kind: 'linked' }
  } catch (err) {
    const code = (err as { code?: string }).code ?? 'auth/unknown'
    const outcome = resolveLinkOutcome(code)
    if (outcome.kind === 'use-existing-account') {
      // Chosen v1 resolution: sign into the pre-existing account. Guest-session
      // data is NOT merged (documented limitation); the existing account keeps its own data.
      const cred = GoogleAuthProvider.credentialFromError(err as never)
      if (cred) await signInWithCredential(auth, cred)
    }
    return outcome
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:emulator` → Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/auth/linkGoogle.ts src/auth/__tests__/linkGoogle.emulator.test.ts
git commit -m "feat(auth): link Google to anonymous uid and flip accountState to linked"
```

---

## Task 9: "Sign in to save" affordance + App wiring

**Files:**
- Create: `src/ui/SignInToSave.tsx`
- Test: `src/ui/__tests__/SignInToSave.test.tsx`
- Modify: `src/App.tsx` (or `AppRoot`)

The affordance is the top-right `a.navbtn` in `.topline` (`mockups.html#s-dash`). It shows only while `accountState === 'guest'`; once linked it disappears. Clicking it invokes `onSignIn`.

- [ ] **Step 1: Write the failing test**

`src/ui/__tests__/SignInToSave.test.tsx`:
```tsx
// ABOUTME: Verifies the Sign-in-to-save affordance shows only for guests and fires onSignIn.
import { render, screen, fireEvent } from '@testing-library/react'
import { SignInToSave } from '../SignInToSave'

it('renders for a guest and fires onSignIn on click', () => {
  const onSignIn = vi.fn()
  render(<SignInToSave accountState="guest" onSignIn={onSignIn} />)
  fireEvent.click(screen.getByRole('button', { name: /sign in to save/i }))
  expect(onSignIn).toHaveBeenCalled()
})

it('renders nothing once linked', () => {
  const { container } = render(<SignInToSave accountState="linked" onSignIn={() => {}} />)
  expect(container).toBeEmptyDOMElement()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- SignInToSave`
Expected: FAIL — `SignInToSave` not found.

- [ ] **Step 3: Implement the affordance**

`src/ui/SignInToSave.tsx`:
```tsx
// ABOUTME: Top-right "Sign in to save" affordance shown to guest users only.
// ABOUTME: Presentational — parent passes accountState and the link handler.
import type { UserProfile } from '../store/types'

export function SignInToSave(
  { accountState, onSignIn }: { accountState: UserProfile['accountState']; onSignIn: () => void },
) {
  if (accountState === 'linked') return null
  return (
    <div className="topline">
      <div className="sp" />
      <button type="button" className="navbtn" onClick={onSignIn}>Sign in to save</button>
    </div>
  )
}
```
(The mockup markup used an `<a class="navbtn">`; use a `<button>` for a real action and keep the `navbtn`/`topline` classes so the ported CSS still applies.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- SignInToSave` → Expected: PASS (2 tests).

- [ ] **Step 5: Wire it into App**

In `App.tsx`/`AppRoot`, render `<SignInToSave accountState={profile.accountState} onSignIn={handleSignIn} />` at the top of the guest-facing screens. `handleSignIn` calls the injected `onLinkGoogle` (provided by boot in Task 10) and, based on the returned `LinkOutcome`, shows a brief message: `linked`/`already-linked` → "Saved to your Google account."; `use-existing-account` → "You already have an account — signed you in. Credits added in this guest session weren't carried over."; `error` → "Couldn't sign in — please try again." Keep messaging minimal (existing toast/inline pattern from M3). No screen navigation changes.

- [ ] **Step 6: Commit**

```bash
git add src/ui/SignInToSave.tsx src/ui/__tests__/SignInToSave.test.tsx src/App.tsx
git commit -m "feat(ui): Sign-in-to-save affordance wired to Google account linking"
```

---

## Task 10: Firestore security rules + rules test

**Files:**
- Create: `firestore.rules`, `src/firestore-rules/__tests__/rules.emulator.test.ts`

Rules: a signed-in user reads/writes only their own `users/{uid}` doc and `credits` subcollection; `mcleRequirements` is world-readable, never client-writable.

- [ ] **Step 1: Write the failing rules test**

`src/firestore-rules/__tests__/rules.emulator.test.ts`:
```ts
// ABOUTME: Emulator rules test — a user reaches only their own data; requirements are read-only.
// ABOUTME: Uses @firebase/rules-unit-testing against the Firestore emulator.
import { beforeAll, afterAll, describe, it } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  initializeTestEnvironment, assertSucceeds, assertFails,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { doc, getDoc, setDoc } from 'firebase/firestore'

let env: RulesTestEnvironment

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-cle',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  })
})
afterAll(() => env.cleanup())

describe('firestore.rules', () => {
  it('lets a user read/write their own profile and credits', async () => {
    const db = env.authenticatedContext('alice').firestore()
    await assertSucceeds(setDoc(doc(db, 'users/alice'), { name: 'Alice' }))
    await assertSucceeds(getDoc(doc(db, 'users/alice')))
    await assertSucceeds(setDoc(doc(db, 'users/alice/credits/c1'), { totalHours: 1 }))
  })
  it("forbids reaching another user's data", async () => {
    const db = env.authenticatedContext('alice').firestore()
    await assertFails(getDoc(doc(db, 'users/bob')))
    await assertFails(setDoc(doc(db, 'users/bob/credits/c1'), { totalHours: 1 }))
  })
  it('forbids an unauthenticated user entirely', async () => {
    const db = env.unauthenticatedContext().firestore()
    await assertFails(getDoc(doc(db, 'users/alice')))
  })
  it('makes mcleRequirements read-only to clients', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'mcleRequirements/2026-07-10'), { total: 25 })
    })
    const db = env.authenticatedContext('alice').firestore()
    await assertSucceeds(getDoc(doc(db, 'mcleRequirements/2026-07-10')))
    await assertFails(setDoc(doc(db, 'mcleRequirements/2026-07-10'), { total: 1 }))
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:emulator`
Expected: FAIL — no `firestore.rules` file (or default rules deny everything).

- [ ] **Step 3: Write the rules**

`firestore.rules`:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;

      match /credits/{creditId} {
        allow read, write: if request.auth != null && request.auth.uid == uid;
      }
    }

    match /mcleRequirements/{version} {
      allow read: if true;
      allow write: if false;
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:emulator` → Expected: PASS (4 rules tests) and the whole emulator suite green.

- [ ] **Step 5: Commit**

```bash
git add firestore.rules src/firestore-rules/__tests__/rules.emulator.test.ts
git commit -m "feat(security): Firestore rules confining users to their own data + rules test"
```

---

## Task 11: Swap the store at boot + full verification

**Files:**
- Modify: `src/main.tsx` (and `src/App.tsx`/`AppRoot` if the store injection point lives there)

Replace the M2 localStorage store construction with: anonymous sign-in, build a `FirestoreStore(db, uid)`, wait for `ready()`, then render App with that store and an `onLinkGoogle` handler — the **only** production code that changes, since both stores satisfy the same `Store` interface.

- [ ] **Step 1: Wire boot**

In `src/main.tsx`:
```ts
// ABOUTME: React entry — boots Firebase auth + Firestore store, then renders the app.
// ABOUTME: Swaps M2's localStorage store for FirestoreStore behind the same Store interface.
import { getFirebase } from './firebase/app'
import { ensureAnonymousUser } from './auth/bootstrap'
import { FirestoreStore } from './store/firestoreStore'
import { linkGoogle } from './auth/linkGoogle'
// ...React imports, App, CSS...

async function boot() {
  const { auth, db } = getFirebase()
  const user = await ensureAnonymousUser(auth)
  const store = new FirestoreStore(db, user.uid)
  await store.ready()
  createRoot(document.getElementById('root')!).render(
    <App store={store} onLinkGoogle={() => linkGoogle(auth, db)} />,
  )
}
boot()
```
On **first run**, App writes the derived profile (from M1 `deriveGroup`/`resolvePeriod`) via `store.saveProfile({ ..., accountState: 'guest', requirementsVersion })`; thereafter it reads `store.getProfile()`/`store.getCredits()` and re-renders on `store.subscribe`. This preserves the M1–M3 domain and UI; only the backend and the link glue are new.

- [ ] **Step 2: Typecheck and run the pure suite**

Run: `npx tsc --noEmit` → Expected: no errors.
Run: `npm test` → Expected: all pure/UI tests green (domain, config, mappers, linkOutcome, SignInToSave, plus M1–M3 suites).

- [ ] **Step 3: Run the emulator suite**

Run: `npm run test:emulator` → Expected: all emulator tests green (store, bootstrap, linkGoogle, rules).

- [ ] **Step 4: Manual end-to-end check**

With a real `.env.local` (or `VITE_FIREBASE_USE_EMULATOR=true` against a running emulator), run `npm run dev`:
1. Load the app → confirm an anonymous session exists (a `users/{uid}` doc appears after first run) and the dashboard reads live.
2. Add a credit → it persists to `users/{uid}/credits` and the dashboard updates without reload.
3. Click "Sign in to save" → Google link keeps the same uid, keeps the credit, and the affordance disappears (`accountState: linked`).
Use the superpowers:verification-before-completion skill before claiming done.

- [ ] **Step 5: Commit**

```bash
git add src/main.tsx src/App.tsx
git commit -m "feat: boot anonymous auth and swap in the Firestore store"
```

---

## Done criteria for Milestone 4

- Every visitor is signed in anonymously on load and has a `users/{uid}` profile + `credits` subcollection in Firestore; the dashboard reads live via `onSnapshot`.
- The Firestore store satisfies the **exact M2 `Store` interface**; the M1 domain and M1–M3 UI are unchanged apart from boot wiring and the link glue.
- "Sign in to save" links Google to the anonymous uid, preserving uid and data and flipping `accountState` guest → linked; `credential-already-in-use` and already-linked are handled with the documented resolutions.
- Firestore security rules confine each user to their own data and make `mcleRequirements` read-only; the rules unit test proves it.
- `npm test` (pure/UI) and `npm run test:emulator` (Firestore/auth/rules) are both green. No secrets are committed; all config is env-driven. SDK versions and API surfaces were re-verified against the installed `firebase`/`@firebase/rules-unit-testing` at build time.
