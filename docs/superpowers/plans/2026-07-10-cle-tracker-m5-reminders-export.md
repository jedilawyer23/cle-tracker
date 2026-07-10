# CLE Tracker — Milestone 5: Reminders + Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Attorneys are reminded by email before their MCLE reporting deadline (and when still short of a requirement near the deadline), and can export a one-tap PDF compliance report. Reminders run as a daily Firebase v2 scheduled Cloud Function that is idempotent — a given reminder is sent once, never re-sent on the next day's run. The "which reminders are due" decision and the "what the report says" content are both **pure, unit-tested functions** with no email, PDF, or Firestore in the test path.

**Architecture:** Two independent slices, both built on M1's pure domain and M4's Firestore data model.

1. **Reminders (server).** A Cloud Functions (Node) workspace under `functions/`. The scheduled handler is a thin wrapper that builds real dependencies (firebase-admin reads, a `mail`-collection writer for the Firebase *Trigger Email* extension, a `sentReminders` recorder) and hands them to `processReminders(deps, today)` — an orchestration function unit-tested with fakes. The core decision, `dueReminders(state, today)`, is a side-effect-free function: input a user's reminder state + today, output the reminder keys to send. Idempotency comes from recording sent keys per user and filtering them out of the next run. Compliance is computed by reusing M1's `calculateCompliance` and `REQUIREMENT_RULES` — no domain rules are reinvented.

2. **Export (client).** Report generation runs **client-side**: the dashboard already holds the user, credits, and `ComplianceResult` in memory, so assembling and rendering a PDF needs no server round-trip, no cold start, and keeps PII off the wire. `buildReportContent(...)` is a pure function that assembles the report data (credits grouped by category, per-requirement earned/required, verdict, period dates, disclaimer); `renderReportPdf(content)` is a thin jsPDF renderer kept separate so the content is tested without asserting on PDF bytes.

A single `DISCLAIMER_TEXT` constant is the one source of the "not legal advice" line, reused by the reminder emails, the report, and every UI surface that shows compliance status.

**Tech Stack:** Existing Vite + React 18 + TypeScript + Tailwind v4 + Vitest app (M1–M4). New: `firebase-functions` v2 + `firebase-admin` in a `functions/` workspace (Vitest for its tests); `jspdf` on the client. The Firebase *Trigger Email* extension (SendGrid is the drop-in alternative) delivers mail.

> **Verify at build time.** The exact `firebase-functions` v2 scheduler API (`onSchedule` import path and options), the Trigger Email extension's collection name and message-document shape, and all package versions **MUST be re-verified against current docs when this is built** — they drift. Never hardcode provider secrets: the extension is configured through its own install config / Secret Manager, and any SendGrid key comes from function config, never source. The shared-domain module resolution for the `functions/` workspace (path alias below) must also be confirmed to compile and bundle at deploy.

**Reference:** The approved UI is `mockups.html` (the dashboard `.note` disclaimer, `.btn`/`.link` buttons, `.list`/`.row` primitives). Verified MCLE rules, the Firestore data model, and the reminder/export flows (sections 8–9) are in `docs/superpowers/specs/2026-07-10-california-cle-tracker-design.md`. Assumes M1 (`calculateCompliance`, `REQUIREMENT_RULES`, `resolvePeriod`, types) and M4 (Firestore user/credit stores, `users/{uid}` + `users/{uid}/credits`) are complete.

---

## File structure

```
functions/                         # NEW Cloud Functions workspace
  package.json                     # firebase-functions v2, firebase-admin; vitest
  tsconfig.json                    # @domain/* -> ../src/domain/* path alias (VERIFY bundling)
  vitest.config.ts                 # mirrors the @domain/* alias for tests
  src/
    index.ts                       # v2 onSchedule wrapper -> processReminders (thin, I/O only)
    reminders/
      config.ts                    # thresholds + near-deadline default (data)
      dueReminders.ts              # PURE: (reminder state, today) -> reminder keys to send
      reminderMessages.ts          # PURE: reminder key + context -> { subject, text }
      processReminders.ts          # orchestration over injected deps (unit-tested with fakes)
      firestoreDeps.ts             # builds real ReminderDeps from firebase-admin (I/O; not unit-tested)
    __tests__/
      dueReminders.test.ts
      reminderMessages.test.ts
      processReminders.test.ts

src/                               # existing client app
  domain/
    disclaimer.ts                  # NEW: DISCLAIMER_TEXT single source of truth
  report/
    buildReportContent.ts          # NEW PURE: user + result + credits -> ReportContent
    renderReportPdf.ts             # NEW: ReportContent -> jsPDF document (thin renderer)
  report/__tests__/
    buildReportContent.test.ts
    renderReportPdf.test.ts
  ui/
    Disclaimer.tsx                 # NEW: renders DISCLAIMER_TEXT as the .note line
    ExportButton.tsx               # NEW: one-tap "Export report (PDF)" -> render + download
  ui/__tests__/
    ExportButton.test.tsx
```

The reminder pure functions and the report pure functions import nothing from React, Firebase, jsPDF, or email. `functions/` imports M1's domain through the `@domain/*` alias; the client `report/` imports it by relative path. Nothing in `src/domain` imports upward.

---

## Task 1: Scaffold the Cloud Functions workspace

**Files:**
- Create: `functions/package.json`, `functions/tsconfig.json`, `functions/vitest.config.ts`, `functions/src/index.ts`

This adds a self-contained Node workspace for server code. It does **not** touch the client app. Firebase v2 functions target Node 20+; confirm the runtime and `firebase-functions` major version against current docs before writing handlers.

- [ ] **Step 1: Create the functions package**

`functions/package.json`:
```json
{
  "name": "cle-tracker-functions",
  "private": true,
  "type": "module",
  "engines": { "node": "20" },
  "main": "lib/index.js",
  "scripts": {
    "build": "tsc",
    "test": "vitest run --passWithNoTests",
    "test:watch": "vitest"
  },
  "dependencies": {
    "firebase-admin": "^12",
    "firebase-functions": "^5"
  },
  "devDependencies": {
    "typescript": "^5",
    "vitest": "^2"
  }
}
```
Then:
```bash
cd "/Users/shrut/Documents/GitHub/CLE tracker/functions"
npm install
```
Note: the `firebase-admin`/`firebase-functions` majors above are placeholders — **install and pin whatever npm resolves at build time**, and adjust the scheduler import in Task 5 if the v2 API differs.

- [ ] **Step 2: TypeScript config with the shared-domain alias**

`functions/tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "lib",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "baseUrl": ".",
    "paths": { "@domain/*": ["../src/domain/*"] }
  },
  "include": ["src/**/*", "../src/domain/**/*"]
}
```
The `@domain/*` alias lets server code reuse M1's pure domain (`calculateCompliance`, `REQUIREMENT_RULES`, types) without copying it. **Verify at build time** that this resolves through the Firebase deploy bundler (tsc path aliases are not rewritten by plain `tsc` at runtime — a `tsc-alias` post-step or an esbuild bundle may be needed). This is the main build risk in this milestone.

- [ ] **Step 3: Vitest config mirroring the alias**

`functions/vitest.config.ts`:
```ts
// ABOUTME: Vitest config for the Cloud Functions workspace.
// ABOUTME: Mirrors the @domain/* path alias so server tests import M1's pure domain.
import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  test: { environment: 'node', globals: true },
  resolve: {
    alias: { '@domain': fileURLToPath(new URL('../src/domain', import.meta.url)) },
  },
})
```

- [ ] **Step 4: Placeholder entry point**

`functions/src/index.ts`:
```ts
// ABOUTME: Cloud Functions entry point — exports the scheduled reminders function.
// ABOUTME: Handler wiring is added in Task 5; this is a compile-clean placeholder.
export {}
```

- [ ] **Step 5: Verify it compiles and the test runner is green**

Run: `cd "/Users/shrut/Documents/GitHub/CLE tracker/functions" && npx tsc --noEmit`
Expected: no errors.
Run: `cd "/Users/shrut/Documents/GitHub/CLE tracker/functions" && npm test`
Expected: exit 0 (no tests yet, `--passWithNoTests`).

- [ ] **Step 6: Commit**

```bash
git add functions/package.json functions/tsconfig.json functions/vitest.config.ts functions/src/index.ts
git commit -m "chore(functions): scaffold Cloud Functions workspace with shared-domain alias"
```

---

## Task 2: Shared disclaimer text + Disclaimer component

**Files:**
- Create: `src/domain/disclaimer.ts`, `src/ui/Disclaimer.tsx`
- Test: none for the constant; the component is covered where it is used (Task 8)

One source of truth for the "not legal advice" line, so reminder emails, the PDF report, and every UI surface stay identical.

- [ ] **Step 1: Define the constant**

`src/domain/disclaimer.ts`:
```ts
// ABOUTME: Single source of the "not legal advice" disclaimer text.
// ABOUTME: Reused by reminder emails, the PDF report, and every compliance UI surface.
export const DISCLAIMER_TEXT =
  'Not legal advice — verify your compliance with the State Bar of California.'
```

- [ ] **Step 2: Create the UI component**

`src/ui/Disclaimer.tsx` — renders `DISCLAIMER_TEXT` as the `.note` line ported from `mockups.html` so it looks identical to the existing dashboard note:
```tsx
// ABOUTME: Persistent "not legal advice" disclaimer shown wherever compliance status appears.
// ABOUTME: Presentational only — text comes from the shared DISCLAIMER_TEXT constant.
import { DISCLAIMER_TEXT } from '../domain/disclaimer'

export function Disclaimer() {
  return <div className="note">{DISCLAIMER_TEXT}</div>
}
```

- [ ] **Step 3: Verify it compiles**

Run: `cd "/Users/shrut/Documents/GitHub/CLE tracker" && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/domain/disclaimer.ts src/ui/Disclaimer.tsx
git commit -m "feat(ui): shared disclaimer text and Disclaimer component"
```

---

## Task 3: dueReminders (pure "which reminders are due")

**Files:**
- Create: `functions/src/reminders/config.ts`, `functions/src/reminders/dueReminders.ts`
- Test: `functions/src/__tests__/dueReminders.test.ts`

The heart of reminders: given a user's reminder state and today, return the reminder **keys** to send. Rules:
- Suppressed entirely when the user is **not required to report** this cycle, or has **no email**, or the deadline has **passed**.
- Deadline reminders bucket by threshold. The *current bucket* is the smallest configured threshold `T` with `daysUntil <= T` (thresholds 90/30/7). Exactly one bucket is active on any given day; because `daysUntil` only shrinks, a larger bucket never re-fires after a smaller one. This makes first-run-inside-a-window send only the most urgent reminder, and makes each key fire once.
- A `noncompliant-{T}` reminder is added when the user is **not compliant** and the bucket is **near the deadline** (`T <= nearDeadlineDays`, default 30).
- Any key already in `alreadySent` is filtered out — the idempotency guarantee.

- [ ] **Step 1: Write the config data**

`functions/src/reminders/config.ts`:
```ts
// ABOUTME: Tunable reminder cadence — deadline thresholds and the near-deadline cutoff.
// ABOUTME: Data only; defaults match the spec (90/30/7 days out, non-compliant within 30).
export interface ReminderConfig {
  thresholds: number[]      // days-out buckets, any order
  nearDeadlineDays: number  // non-compliant reminders fire only within this many days
}

export const DEFAULT_REMINDER_CONFIG: ReminderConfig = {
  thresholds: [90, 30, 7],
  nearDeadlineDays: 30,
}
```

- [ ] **Step 2: Write the failing test**

`functions/src/__tests__/dueReminders.test.ts`:
```ts
// ABOUTME: Tests the pure decision of which reminder keys are due for a user today.
import { describe, it, expect } from 'vitest'
import { dueReminders, daysUntil, type ReminderState } from '../reminders/dueReminders'
import { DEFAULT_REMINDER_CONFIG } from '../reminders/config'

const base: ReminderState = {
  hasEmail: true,
  requiredToReport: true,
  compliant: false,
  reportBy: '2027-03-30',
  alreadySent: [],
}
const cfg = DEFAULT_REMINDER_CONFIG

describe('daysUntil', () => {
  it('counts calendar days without timezone drift', () => {
    expect(daysUntil('2027-03-01', '2027-03-30')).toBe(29)
    expect(daysUntil('2027-03-30', '2027-03-30')).toBe(0)
  })
})

describe('dueReminders', () => {
  it('sends nothing when not required to report this cycle', () => {
    expect(dueReminders({ ...base, requiredToReport: false }, '2027-01-01', cfg)).toEqual([])
  })

  it('sends nothing when the user has no email', () => {
    expect(dueReminders({ ...base, hasEmail: false }, '2027-03-01', cfg)).toEqual([])
  })

  it('sends nothing when the deadline has passed', () => {
    expect(dueReminders(base, '2027-04-01', cfg)).toEqual([])
  })

  it('sends nothing outside the widest window', () => {
    expect(dueReminders(base, '2026-01-01', cfg)).toEqual([])
  })

  it('sends the 90-day deadline reminder in the 90 bucket while compliant', () => {
    // 60 days out -> smallest threshold >= 60 is 90; compliant so no non-compliant key
    expect(dueReminders({ ...base, compliant: true }, '2027-01-29', cfg)).toEqual(['deadline-90'])
  })

  it('adds a non-compliant reminder inside the near window', () => {
    // 20 days out -> bucket 30 (near); not compliant
    expect(dueReminders(base, '2027-03-10', cfg)).toEqual(['deadline-30', 'noncompliant-30'])
  })

  it('is idempotent — filters keys already sent', () => {
    expect(
      dueReminders({ ...base, alreadySent: ['deadline-30'] }, '2027-03-10', cfg),
    ).toEqual(['noncompliant-30'])
  })

  it('does not re-fire a larger bucket after a smaller one is reached', () => {
    // 5 days out -> only bucket 7 is active; 90/30 never reappear
    expect(dueReminders(base, '2027-03-25', cfg)).toEqual(['deadline-7', 'noncompliant-7'])
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd "/Users/shrut/Documents/GitHub/CLE tracker/functions" && npm test -- dueReminders`
Expected: FAIL — `dueReminders` not found.

- [ ] **Step 4: Write minimal implementation**

`functions/src/reminders/dueReminders.ts`:
```ts
// ABOUTME: Pure decision — which reminder keys are due for a user on a given day.
// ABOUTME: Idempotent by filtering alreadySent; no email, Firestore, or clock access.
import type { ReminderConfig } from './config'

export interface ReminderState {
  hasEmail: boolean
  requiredToReport: boolean
  compliant: boolean
  reportBy: string        // ISO date (YYYY-MM-DD)
  alreadySent: string[]   // reminder keys already delivered
}

function toUTC(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

export function daysUntil(today: string, target: string): number {
  return Math.round((toUTC(target) - toUTC(today)) / 86_400_000)
}

// Smallest threshold T with days <= T, or null if past the widest window.
function currentBucket(days: number, thresholds: number[]): number | null {
  const active = [...thresholds].sort((a, b) => a - b).find(t => days <= t)
  return active ?? null
}

export function dueReminders(
  state: ReminderState,
  today: string,
  cfg: ReminderConfig,
): string[] {
  if (!state.hasEmail || !state.requiredToReport) return []
  const days = daysUntil(today, state.reportBy)
  if (days < 0) return []
  const bucket = currentBucket(days, cfg.thresholds)
  if (bucket === null) return []

  const keys = [`deadline-${bucket}`]
  if (!state.compliant && bucket <= cfg.nearDeadlineDays) keys.push(`noncompliant-${bucket}`)
  return keys.filter(k => !state.alreadySent.includes(k))
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd "/Users/shrut/Documents/GitHub/CLE tracker/functions" && npm test -- dueReminders`
Expected: PASS (all cases).

- [ ] **Step 6: Commit**

```bash
git add functions/src/reminders/config.ts functions/src/reminders/dueReminders.ts functions/src/__tests__/dueReminders.test.ts
git commit -m "feat(functions): pure dueReminders decision with idempotent bucketing"
```

---

## Task 4: reminderMessages (pure key → email content)

**Files:**
- Create: `functions/src/reminders/reminderMessages.ts`
- Test: `functions/src/__tests__/reminderMessages.test.ts`

Maps a reminder key + context to a plain `{ subject, text }`. Pure, so email copy is asserted without any provider. The disclaimer line is always appended from the shared constant.

- [ ] **Step 1: Write the failing test**

`functions/src/__tests__/reminderMessages.test.ts`:
```ts
// ABOUTME: Tests reminder email copy generated from a key and context.
import { describe, it, expect } from 'vitest'
import { buildMessage, type MessageContext } from '../reminders/reminderMessages'
import { DISCLAIMER_TEXT } from '@domain/disclaimer'

const ctx: MessageContext = {
  name: 'Maya Hoffman',
  reportBy: '2027-03-30',
  daysLeft: 20,
  remainingCount: 3,
}

describe('buildMessage', () => {
  it('builds a deadline reminder with the days left and deadline', () => {
    const m = buildMessage('deadline-30', ctx)
    expect(m.subject).toMatch(/deadline/i)
    expect(m.text).toContain('20 days')
    expect(m.text).toContain('Mar 30, 2027')
    expect(m.text).toContain(DISCLAIMER_TEXT)
  })

  it('builds a non-compliant reminder naming the outstanding count', () => {
    const m = buildMessage('noncompliant-7', ctx)
    expect(m.subject).toMatch(/outstanding|incomplete/i)
    expect(m.text).toContain('3 requirement')
    expect(m.text).toContain(DISCLAIMER_TEXT)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "/Users/shrut/Documents/GitHub/CLE tracker/functions" && npm test -- reminderMessages`
Expected: FAIL — `buildMessage` not found.

- [ ] **Step 3: Write minimal implementation**

`functions/src/reminders/reminderMessages.ts`:
```ts
// ABOUTME: Pure reminder email copy — maps a reminder key + context to subject/text.
// ABOUTME: No provider or I/O; the disclaimer is appended from the shared constant.
import { DISCLAIMER_TEXT } from '@domain/disclaimer'

export interface MessageContext {
  name: string
  reportBy: string        // ISO date
  daysLeft: number
  remainingCount: number  // requirements still unmet
}

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

export function buildMessage(key: string, ctx: MessageContext): { subject: string; text: string } {
  const deadline = formatDate(ctx.reportBy)
  const sign = `— ${DISCLAIMER_TEXT}`
  if (key.startsWith('noncompliant-')) {
    return {
      subject: 'MCLE requirements still outstanding',
      text:
        `Hi ${ctx.name}, you still have ${ctx.remainingCount} requirement(s) to complete ` +
        `before your California MCLE reporting deadline on ${deadline} (${ctx.daysLeft} days). ` +
        `Log the remaining credits soon.\n\n${sign}`,
    }
  }
  return {
    subject: 'Your MCLE reporting deadline is approaching',
    text:
      `Hi ${ctx.name}, your California MCLE reporting deadline is ${deadline} — ` +
      `${ctx.daysLeft} days away. Review your progress in CLE Tracker.\n\n${sign}`,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd "/Users/shrut/Documents/GitHub/CLE tracker/functions" && npm test -- reminderMessages`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add functions/src/reminders/reminderMessages.ts functions/src/__tests__/reminderMessages.test.ts
git commit -m "feat(functions): pure reminder email copy from key and context"
```

---

## Task 5: processReminders orchestration + scheduled wrapper

**Files:**
- Create: `functions/src/reminders/processReminders.ts`, `functions/src/reminders/firestoreDeps.ts`
- Modify: `functions/src/index.ts`
- Test: `functions/src/__tests__/processReminders.test.ts`

`processReminders(deps, today, cfg)` walks every user: it reuses M1's `calculateCompliance(REQUIREMENT_RULES, credits)` to decide compliance, builds a `ReminderState`, asks `dueReminders` what to send, enqueues one email per key via `buildMessage`, then records the sent keys. All I/O is injected as `deps`, so the whole loop is unit-tested with fakes — no Firebase, no email. `firestoreDeps.ts` and the `onSchedule` export are the only I/O, wired last and exercised via the emulator, not unit tests.

- [ ] **Step 1: Write the failing test**

`functions/src/__tests__/processReminders.test.ts`:
```ts
// ABOUTME: Tests the reminder orchestration over injected deps with fake data.
import { describe, it, expect, vi } from 'vitest'
import { processReminders, type ReminderDeps, type UserRecord } from '../reminders/processReminders'
import { DEFAULT_REMINDER_CONFIG } from '../reminders/config'
import type { Credit } from '@domain/types'

const user = (over: Partial<UserRecord>): UserRecord => ({
  uid: 'u1', name: 'Maya Hoffman', email: 'maya@example.com', group: 2,
  currentPeriod: { start: '2024-02-01', end: '2027-03-29', reportBy: '2027-03-30' },
  requiredToReport: true, sentReminders: [], credits: [], ...over,
})

function fakeDeps(users: UserRecord[]) {
  const enqueued: { to: string[]; message: { subject: string; text: string } }[] = []
  const recorded: Record<string, string[]> = {}
  const deps: ReminderDeps = {
    listUsers: vi.fn(async () => users),
    enqueueEmail: vi.fn(async m => { enqueued.push(m) }),
    recordSent: vi.fn(async (uid, keys) => { recorded[uid] = keys }),
  }
  return { deps, enqueued, recorded }
}

describe('processReminders', () => {
  it('enqueues a deadline email and records the sent key', async () => {
    const { deps, enqueued, recorded } = fakeDeps([user({})]) // 20 days out on the test date below
    await processReminders(deps, '2027-03-10', DEFAULT_REMINDER_CONFIG)
    expect(enqueued).toHaveLength(2) // deadline-30 + noncompliant-30 (no credits => not compliant)
    expect(enqueued[0].to).toEqual(['maya@example.com'])
    expect(recorded['u1']).toEqual(['deadline-30', 'noncompliant-30'])
  })

  it('does not re-send an already-recorded reminder', async () => {
    const { deps, enqueued } = fakeDeps([user({ sentReminders: ['deadline-30', 'noncompliant-30'] })])
    await processReminders(deps, '2027-03-10', DEFAULT_REMINDER_CONFIG)
    expect(enqueued).toHaveLength(0)
  })

  it('suppresses users not required to report', async () => {
    const { deps, enqueued } = fakeDeps([user({ requiredToReport: false })])
    await processReminders(deps, '2027-03-10', DEFAULT_REMINDER_CONFIG)
    expect(enqueued).toHaveLength(0)
  })

  it('skips guests with no email', async () => {
    const { deps, enqueued } = fakeDeps([user({ email: '' })])
    await processReminders(deps, '2027-03-10', DEFAULT_REMINDER_CONFIG)
    expect(enqueued).toHaveLength(0)
  })

  it('stays quiet for a compliant user (no non-compliant key)', async () => {
    const fullCredit: Credit = {
      id: 'c', provider: 'p', activityTitle: 't', completionDate: '2026-01-01',
      totalHours: 25, participatory: true,
      categoryHours: { ethics: 4, competence: 2, competencePrevention: 1, bias: 2, biasImplicit: 1, technology: 1, civility: 1 },
    }
    const { deps, enqueued, recorded } = fakeDeps([user({ credits: [fullCredit] })])
    await processReminders(deps, '2027-03-10', DEFAULT_REMINDER_CONFIG)
    expect(enqueued).toHaveLength(1)             // deadline-30 only
    expect(recorded['u1']).toEqual(['deadline-30'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "/Users/shrut/Documents/GitHub/CLE tracker/functions" && npm test -- processReminders`
Expected: FAIL — `processReminders` not found.

- [ ] **Step 3: Write minimal implementation**

`functions/src/reminders/processReminders.ts`:
```ts
// ABOUTME: Orchestrates the daily reminder run over injected deps (fully unit-testable).
// ABOUTME: Reuses M1's calculateCompliance; delegates the decision to dueReminders.
import { calculateCompliance } from '@domain/complianceCalculator'
import { REQUIREMENT_RULES } from '@domain/requirements'
import type { Credit, Period } from '@domain/types'
import type { ReminderConfig } from './config'
import { dueReminders, daysUntil } from './dueReminders'
import { buildMessage } from './reminderMessages'

export interface UserRecord {
  uid: string
  name: string
  email: string
  group: number
  currentPeriod: Period
  requiredToReport: boolean
  sentReminders: string[]
  credits: Credit[]
}

export interface MailDoc { to: string[]; message: { subject: string; text: string } }

export interface ReminderDeps {
  listUsers(): Promise<UserRecord[]>
  enqueueEmail(mail: MailDoc): Promise<void>
  recordSent(uid: string, keys: string[]): Promise<void>
}

export async function processReminders(
  deps: ReminderDeps,
  today: string,
  cfg: ReminderConfig,
): Promise<void> {
  const users = await deps.listUsers()
  for (const u of users) {
    const result = calculateCompliance(REQUIREMENT_RULES, u.credits)
    const keys = dueReminders(
      {
        hasEmail: Boolean(u.email),
        requiredToReport: u.requiredToReport,
        compliant: result.compliant,
        reportBy: u.currentPeriod.reportBy,
        alreadySent: u.sentReminders,
      },
      today,
      cfg,
    )
    if (keys.length === 0) continue

    const ctx = {
      name: u.name,
      reportBy: u.currentPeriod.reportBy,
      daysLeft: daysUntil(today, u.currentPeriod.reportBy),
      remainingCount: result.totalCount - result.metCount,
    }
    for (const key of keys) {
      await deps.enqueueEmail({ to: [u.email], message: buildMessage(key, ctx) })
    }
    await deps.recordSent(u.uid, keys)
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd "/Users/shrut/Documents/GitHub/CLE tracker/functions" && npm test -- processReminders`
Expected: PASS (5 tests).

- [ ] **Step 5: Wire the real Firestore deps and the scheduled export (I/O — not unit-tested)**

`functions/src/reminders/firestoreDeps.ts` — builds `ReminderDeps` from firebase-admin. It reads `users/*`, loads each user's `credits` subcollection (reusing M4's collection paths and the shared `Credit` type), writes email docs to the Trigger Email extension's `mail` collection, and appends sent keys with `FieldValue.arrayUnion`.
```ts
// ABOUTME: Builds real ReminderDeps from firebase-admin (Firestore + Trigger Email mail collection).
// ABOUTME: I/O only — collection paths follow M4's data model; verify the extension shape at build time.
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import type { ReminderDeps, UserRecord } from './processReminders'
import type { Credit } from '@domain/types'

export function firestoreDeps(): ReminderDeps {
  const db = getFirestore()
  return {
    async listUsers(): Promise<UserRecord[]> {
      const snap = await db.collection('users').get()
      return Promise.all(snap.docs.map(async d => {
        const data = d.data()
        const credits = (await d.ref.collection('credits').get()).docs.map(c => c.data() as Credit)
        return {
          uid: d.id,
          name: data.name ?? '',
          email: data.email ?? '',                 // linked Google users; guests have none
          group: data.group,
          currentPeriod: data.currentPeriod,        // { start, end, reportBy } written in M1/M4
          requiredToReport: data.requiredToReport ?? true,
          sentReminders: data.sentReminders ?? [],  // idempotency record
          credits,
        }
      }))
    },
    async enqueueEmail(mail) {
      // The Firebase "Trigger Email" extension watches this collection and delivers the message.
      // SendGrid alternative: replace this with a direct API call using a Secret-Manager key.
      await db.collection('mail').add(mail)
    },
    async recordSent(uid, keys) {
      await db.collection('users').doc(uid).update({
        sentReminders: FieldValue.arrayUnion(...keys),
      })
    },
  }
}
```
`functions/src/index.ts` — the thin v2 scheduled wrapper:
```ts
// ABOUTME: Daily scheduled Cloud Function that runs the MCLE reminder sweep.
// ABOUTME: Thin wrapper — builds real deps and delegates to the tested processReminders.
import { initializeApp } from 'firebase-admin/app'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { processReminders } from './reminders/processReminders'
import { firestoreDeps } from './reminders/firestoreDeps'
import { DEFAULT_REMINDER_CONFIG } from './reminders/config'

initializeApp()

// VERIFY the v2 scheduler import path, schedule syntax, and options against current docs.
export const sendReminders = onSchedule(
  { schedule: 'every day 08:00', timeZone: 'America/Los_Angeles' },
  async () => {
    const today = new Date().toISOString().slice(0, 10)
    await processReminders(firestoreDeps(), today, DEFAULT_REMINDER_CONFIG)
  },
)
```
Notes: the `sentReminders` field and the `mail` collection are additions to M4's data model; keep `sentReminders` server-written only (Firestore rules already scope `users/{uid}` to its owner — do not expose write of this field to clients). Idempotency is best-effort — a crash after `enqueueEmail` but before `recordSent` could re-send once; acceptable, and noted.

- [ ] **Step 6: Verify build + full functions suite**

Run: `cd "/Users/shrut/Documents/GitHub/CLE tracker/functions" && npx tsc --noEmit`
Expected: no errors (if the `@domain/*` alias fails to resolve here, fix the tsconfig/bundling per Task 1 Step 2 before proceeding).
Run: `cd "/Users/shrut/Documents/GitHub/CLE tracker/functions" && npm test`
Expected: all functions tests green.

- [ ] **Step 7: Commit**

```bash
git add functions/src/reminders/processReminders.ts functions/src/reminders/firestoreDeps.ts functions/src/index.ts functions/src/__tests__/processReminders.test.ts
git commit -m "feat(functions): daily idempotent reminder sweep via scheduled function"
```

---

## Task 6: buildReportContent (pure report assembly)

**Files:**
- Create: `src/report/buildReportContent.ts`
- Test: `src/report/__tests__/buildReportContent.test.ts`

Assembles everything the PDF shows, as plain data: per-requirement earned/required/met (straight from the `ComplianceResult`), credits grouped by category, the overall verdict, the period dates, and the disclaimer. No jsPDF here.

- [ ] **Step 1: Write the failing test**

`src/report/__tests__/buildReportContent.test.ts`:
```ts
// ABOUTME: Tests assembly of the compliance report content from user + result + credits.
import { describe, it, expect } from 'vitest'
import { buildReportContent } from '../buildReportContent'
import { calculateCompliance } from '../../domain/complianceCalculator'
import { REQUIREMENT_RULES } from '../../domain/requirements'
import { DISCLAIMER_TEXT } from '../../domain/disclaimer'
import type { Credit } from '../../domain/types'

const ethics: Credit = {
  id: 'c1', provider: 'PLI', activityTitle: 'Ethics in the Age of AI', completionDate: '2026-03-04',
  totalHours: 4, participatory: true, categoryHours: { ethics: 4 },
}
const period = { start: '2024-02-01', end: '2027-03-29', reportBy: '2027-03-30' }

describe('buildReportContent', () => {
  it('lists every requirement with earned/required/met', () => {
    const result = calculateCompliance(REQUIREMENT_RULES, [ethics])
    const c = buildReportContent({ name: 'Maya Hoffman', group: 2, period, result, credits: [ethics], today: '2026-07-10' })
    const eth = c.requirements.find(r => r.label === 'Legal Ethics')!
    expect(eth).toMatchObject({ earned: 4, required: 4, met: true })
    expect(c.period.reportBy).toBe('2027-03-30')
  })

  it('groups credits under the categories they count toward', () => {
    const result = calculateCompliance(REQUIREMENT_RULES, [ethics])
    const c = buildReportContent({ name: 'Maya Hoffman', group: 2, period, result, credits: [ethics], today: '2026-07-10' })
    const ethicsGroup = c.categories.find(g => g.key === 'ethics')!
    expect(ethicsGroup.credits.map(x => x.title)).toEqual(['Ethics in the Age of AI'])
  })

  it('states a non-compliant verdict naming the count remaining', () => {
    const result = calculateCompliance(REQUIREMENT_RULES, [ethics])
    const c = buildReportContent({ name: 'Maya Hoffman', group: 2, period, result, credits: [ethics], today: '2026-07-10' })
    expect(c.verdict).toMatch(/not yet compliant/i)
    expect(c.verdict).toContain(String(result.totalCount - result.metCount))
    expect(c.disclaimer).toBe(DISCLAIMER_TEXT)
  })

  it('states a compliant verdict when everything is met', () => {
    const full: Credit = { ...ethics, totalHours: 25,
      categoryHours: { ethics: 4, competence: 2, competencePrevention: 1, bias: 2, biasImplicit: 1, technology: 1, civility: 1 } }
    const result = calculateCompliance(REQUIREMENT_RULES, [full])
    const c = buildReportContent({ name: 'Maya Hoffman', group: 2, period, result, credits: [full], today: '2026-07-10' })
    expect(c.verdict).toMatch(/^compliant/i)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "/Users/shrut/Documents/GitHub/CLE tracker" && npm test -- buildReportContent`
Expected: FAIL — `buildReportContent` not found.

- [ ] **Step 3: Write minimal implementation**

`src/report/buildReportContent.ts`:
```ts
// ABOUTME: Pure assembly of the compliance report content (no PDF, no I/O).
// ABOUTME: Credits grouped by category, per-requirement progress, verdict, period, disclaimer.
import { REQUIREMENT_RULES } from '../domain/requirements'
import { DISCLAIMER_TEXT } from '../domain/disclaimer'
import type { Credit, ComplianceResult, Period, CategoryKey } from '../domain/types'

export interface ReportCredit { provider: string; title: string; date: string; hours: number }
export interface ReportCategory { key: string; label: string; credits: ReportCredit[] }
export interface ReportRequirement { label: string; earned: number; required: number; met: boolean }

export interface ReportContent {
  name: string
  group: number
  period: Period
  generatedOn: string
  verdict: string
  requirements: ReportRequirement[]
  categories: ReportCategory[]
  disclaimer: string
}

export interface ReportInput {
  name: string
  group: number
  period: Period
  result: ComplianceResult
  credits: Credit[]
  today: string
}

// The category rules to group credits under (exclude the total/participatory roll-ups).
const CATEGORY_RULES = REQUIREMENT_RULES.filter(r => r.key !== 'total' && r.key !== 'participatory')

export function buildReportContent(input: ReportInput): ReportContent {
  const { result } = input
  const remaining = result.totalCount - result.metCount
  const verdict = result.compliant
    ? 'Compliant — all requirements met.'
    : `Not yet compliant — ${remaining} requirement(s) remaining.`

  const categories: ReportCategory[] = CATEGORY_RULES.map(rule => {
    const key = rule.key as CategoryKey
    const credits = input.credits
      .filter(c => (c.categoryHours[key] ?? 0) > 0)
      .map(c => ({ provider: c.provider, title: c.activityTitle, date: c.completionDate, hours: c.categoryHours[key]! }))
    return { key, label: rule.label, credits }
  })

  return {
    name: input.name,
    group: input.group,
    period: input.period,
    generatedOn: input.today,
    verdict,
    requirements: result.progress.map(p => ({ label: p.label, earned: p.earned, required: p.required, met: p.met })),
    categories,
    disclaimer: DISCLAIMER_TEXT,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd "/Users/shrut/Documents/GitHub/CLE tracker" && npm test -- buildReportContent`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/report/buildReportContent.ts src/report/__tests__/buildReportContent.test.ts
git commit -m "feat(report): pure compliance report content assembly"
```

---

## Task 7: renderReportPdf (jsPDF renderer)

**Files:**
- Create: `src/report/renderReportPdf.ts`
- Test: `src/report/__tests__/renderReportPdf.test.ts`

A thin renderer: `ReportContent` in, a jsPDF document out. Kept separate from assembly so content stays testable as data; this file's test is a smoke test that it produces a non-empty document without throwing.

- [ ] **Step 1: Install jsPDF**

Run: `cd "/Users/shrut/Documents/GitHub/CLE tracker" && npm install jspdf`
(Pin whatever npm resolves; jsPDF runs under jsdom, so the Vitest environment already covers it.)

- [ ] **Step 2: Write the failing test**

`src/report/__tests__/renderReportPdf.test.ts`:
```ts
// ABOUTME: Smoke-tests that the report renderer produces a valid PDF document.
import { describe, it, expect } from 'vitest'
import { renderReportPdf } from '../renderReportPdf'
import type { ReportContent } from '../buildReportContent'

const content: ReportContent = {
  name: 'Maya Hoffman', group: 2,
  period: { start: '2024-02-01', end: '2027-03-29', reportBy: '2027-03-30' },
  generatedOn: '2026-07-10',
  verdict: 'Not yet compliant — 4 requirement(s) remaining.',
  requirements: [{ label: 'Total hours', earned: 18, required: 25, met: false }],
  categories: [{ key: 'ethics', label: 'Legal Ethics', credits: [{ provider: 'PLI', title: 'Ethics in the Age of AI', date: '2026-03-04', hours: 4 }] }],
  disclaimer: 'Not legal advice — verify your compliance with the State Bar of California.',
}

describe('renderReportPdf', () => {
  it('produces a PDF document with at least one page', () => {
    const doc = renderReportPdf(content)
    expect(doc.getNumberOfPages()).toBeGreaterThanOrEqual(1)
    expect(doc.output('blob').size).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd "/Users/shrut/Documents/GitHub/CLE tracker" && npm test -- renderReportPdf`
Expected: FAIL — `renderReportPdf` not found.

- [ ] **Step 4: Write minimal implementation**

`src/report/renderReportPdf.ts`:
```ts
// ABOUTME: Renders assembled ReportContent to a jsPDF document (presentation only).
// ABOUTME: No data logic — every value comes from buildReportContent.
import { jsPDF } from 'jspdf'
import type { ReportContent } from './buildReportContent'

function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function renderReportPdf(content: ReportContent): jsPDF {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' })
  const left = 48
  let y = 56
  const line = (text: string, size = 11, gap = 16) => {
    doc.setFontSize(size)
    doc.text(text, left, y)
    y += gap
  }

  line('California MCLE Compliance Report', 18, 26)
  line(`${content.name} · Group ${content.group}`, 12, 18)
  line(`Compliance period: ${formatDate(content.period.start)} – ${formatDate(content.period.end)} · report by ${formatDate(content.period.reportBy)}`, 10, 16)
  line(`Generated ${formatDate(content.generatedOn)}`, 10, 22)
  line(content.verdict, 12, 24)

  line('Requirements', 13, 18)
  for (const r of content.requirements) {
    line(`${r.met ? '✓' : '•'} ${r.label}: ${r.earned} / ${r.required}`, 11, 15)
  }
  y += 8

  line('Credits by category', 13, 18)
  for (const cat of content.categories) {
    line(cat.label, 11, 15)
    if (cat.credits.length === 0) { line('  (none logged)', 10, 14); continue }
    for (const c of cat.credits) {
      line(`  ${c.title} — ${c.provider} · ${formatDate(c.date)} · ${c.hours} hr`, 10, 14)
    }
  }
  y += 10
  line(content.disclaimer, 9, 14)
  return doc
}
```
Note: the manual `y` cursor does not paginate a very long credit list; acceptable for v1 (YAGNI). If reports overflow, add `doc.addPage()` when `y` passes the page height — deferred until real data needs it.

- [ ] **Step 5: Run test to verify it passes**

Run: `cd "/Users/shrut/Documents/GitHub/CLE tracker" && npm test -- renderReportPdf`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/report/renderReportPdf.ts src/report/__tests__/renderReportPdf.test.ts package.json package-lock.json
git commit -m "feat(report): jsPDF renderer for the compliance report"
```

---

## Task 8: ExportButton + wire into the Dashboard

**Files:**
- Create: `src/ui/ExportButton.tsx`
- Test: `src/ui/__tests__/ExportButton.test.tsx`
- Modify: `src/ui/Dashboard.tsx` (add the export button + `<Disclaimer/>`)

The one-tap export. The button assembles content and renders the PDF on click, then triggers a download. Its test injects a fake renderer so it asserts wiring, not PDF bytes. Then wire it and the shared `<Disclaimer/>` into the Dashboard.

- [ ] **Step 1: Write the failing test**

`src/ui/__tests__/ExportButton.test.tsx`:
```tsx
// ABOUTME: Verifies the export button assembles content and hands it to the renderer on click.
import { render, screen, fireEvent } from '@testing-library/react'
import { ExportButton } from '../ExportButton'
import { calculateCompliance } from '../../domain/complianceCalculator'
import { REQUIREMENT_RULES } from '../../domain/requirements'

it('renders the report and downloads on click', () => {
  const result = calculateCompliance(REQUIREMENT_RULES, [])
  const onExport = vi.fn()
  render(
    <ExportButton
      name="Maya Hoffman" group={2}
      period={{ start: '2024-02-01', end: '2027-03-29', reportBy: '2027-03-30' }}
      result={result} credits={[]} today="2026-07-10" onExport={onExport}
    />,
  )
  fireEvent.click(screen.getByRole('button', { name: /export report/i }))
  expect(onExport).toHaveBeenCalledWith(expect.objectContaining({ verdict: expect.stringMatching(/not yet compliant/i) }))
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "/Users/shrut/Documents/GitHub/CLE tracker" && npm test -- ExportButton`
Expected: FAIL — `ExportButton` not found.

- [ ] **Step 3: Implement ExportButton**

`src/ui/ExportButton.tsx` — assembles content with `buildReportContent`, calls `onExport(content)` (test seam, defaults to the real save), and by default renders + saves the PDF via jsPDF's `doc.save(...)`. Port the `.btn` class from `mockups.html`.
```tsx
// ABOUTME: One-tap "Export report (PDF)" button — assembles content, renders, and downloads.
// ABOUTME: Client-side generation; injectable onExport seam keeps the render out of the unit test.
import { buildReportContent, type ReportContent, type ReportInput } from '../report/buildReportContent'
import { renderReportPdf } from '../report/renderReportPdf'

interface Props extends ReportInput {
  onExport?: (content: ReportContent) => void
}

export function ExportButton({ onExport, ...input }: Props) {
  const handleClick = () => {
    const content = buildReportContent(input)
    if (onExport) { onExport(content); return }
    renderReportPdf(content).save(`MCLE-report-${content.generatedOn}.pdf`)
  }
  return (
    <button className="btn" onClick={handleClick}>Export report (PDF)</button>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd "/Users/shrut/Documents/GitHub/CLE tracker" && npm test -- ExportButton`
Expected: PASS.

- [ ] **Step 5: Wire into the Dashboard**

Edit `src/ui/Dashboard.tsx`: below the primary action, render `<ExportButton .../>` (passing name, group, period, the `ComplianceResult`, credits, and today) and replace the inline disclaimer `.note` with `<Disclaimer/>` so the shared text is used. The empty-state dashboard keeps its existing note; the export button appears once credits exist (or always — cheap and harmless). Keep to the `mockups.html` layout: primary `.btn` for "Add a certificate", the export as a secondary action beneath it, then `<Disclaimer/>`.

- [ ] **Step 6: Full suite + manual check**

Run: `cd "/Users/shrut/Documents/GitHub/CLE tracker" && npm test` — expect ALL client tests green.
Run: `cd "/Users/shrut/Documents/GitHub/CLE tracker/functions" && npm test` — expect ALL functions tests green.
Run: `npm run dev` — open the dashboard, click "Export report (PDF)", confirm a PDF downloads with the requirements, credits by category, verdict, period dates, and disclaimer; confirm the disclaimer shows on the dashboard. Use the superpowers:verification-before-completion skill before claiming done.

- [ ] **Step 7: Commit**

```bash
git add src/ui/ExportButton.tsx src/ui/__tests__/ExportButton.test.tsx src/ui/Dashboard.tsx
git commit -m "feat(ui): one-tap PDF export and shared disclaimer on the dashboard"
```

---

## Done criteria for Milestone 5

- `npm test` (client) and `npm test` (functions) are both all green.
- Reminders: a daily v2 scheduled function loads each user, reuses `calculateCompliance`, and emails through the `mail` collection when a 90/30/7-day bucket is reached or a requirement is short near the deadline; suppressed for users not required to report or without an email; the same key never re-sends (`sentReminders` + `dueReminders` filter). The decision is a pure, exhaustively tested function.
- Export: one tap produces a PDF with per-requirement earned/required, credits grouped by category, the verdict, the period dates, and the disclaimer. Content assembly is a pure, tested function separate from the jsPDF renderer.
- A persistent disclaimer (single shared source) appears on the dashboard and in the report.
- No secrets in source; the email provider and all v2/extension APIs and versions are re-verified against current docs at build time; the `@domain/*` alias is confirmed to compile and bundle for deploy.
- Not in scope: SMS/push reminders, in-app notification center, storing generated PDFs, and multi-page report pagination (deferred until real data needs it).
```