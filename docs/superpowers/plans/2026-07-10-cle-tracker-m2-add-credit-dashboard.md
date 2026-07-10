# CLE Tracker — Milestone 2: Manual Credit Entry + Populated Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A running web app where an attorney logs MCLE credits by hand and watches their live compliance update. From the empty dashboard they open a blank "Confirm & save" form, enter a credit (provider, title, date, hours, participatory, per-category hours), and save it. The dashboard then shows the binding constraint ("N requirements left"), a **Still needed** list over a **Complete** list, Total and Participatory roll-up rows, each category expanding inline to reveal its contributing CLEs; tapping a CLE opens a detail screen to view, edit, or remove it. All state lives in a small client-side store persisted to `localStorage`.

**Architecture:** Continues the M1 React + TypeScript + Vite SPA. **M1's pure domain modules are reused unchanged** — `deriveGroup`, `resolvePeriod`, `calculateCompliance`, `REQUIREMENT_RULES`, `GROUP_CALENDAR`, and `types`. M2 adds (1) a `CreditStore` — a plain module with a `list/add/update/remove` interface backed by `localStorage`, wrapped by a `useCredits` hook so React re-renders; this interface is what a later milestone swaps for Firestore. (2) Two thin pure helpers over the domain (`creditContribution`, `dashboardRows`) so all "which credits count toward what" and "still-needed vs complete" logic is unit-tested without the UI. (3) UI screens porting `mockups.html` markup: the blank Add form, the populated Dashboard with the inline accordion, and the single Credit detail. No Firebase, no network, no certificate parsing — those are later milestones. Manual entry is the whole loop here.

**Tech Stack:** Vite, React 18, TypeScript, Tailwind CSS, Vitest + React Testing Library. External library versions must be verified at build (`npm install` resolves current majors; the M1 notes on Tailwind v4 still apply).

**Reference:** The approved UI is `mockups.html` (screens: "Confirm & save" / `#s-add`, "Dashboard" / `#s-dash`, "Single credit" / `#s-credit`; empty state / `#s-empty` from M1). Verified MCLE rules and the data model are in `docs/superpowers/specs/2026-07-10-california-cle-tracker-design.md`. This plan assumes **M1 is complete**: the domain modules, `List`/`Row` primitives, `src/ui/components.css` (ported list/field/toggle/switch styles), `FirstRun`, and the empty-state `Dashboard` all exist and pass.

---

## Carry-forward from the M1 code review (MUST address in this milestone)

The M1 final review flagged issues in the *populated* dashboard path that were
unreachable in M1 (credits were always empty) and become live here:

1. **Headline count must match the visible rows, and a met parent with an unmet
   sub-minimum is NOT complete.** The current empty-state `Dashboard` derived the
   "N requirements left" count from `result.totalCount - result.metCount` over all
   9 rules, but renders only the ~7 top-level rows. In the `dashboardRows` /
   Dashboard tasks below: (a) compute the headline count from the same top-level
   set that is rendered; (b) treat a top-level requirement as **complete only if it
   AND all its child sub-minimums are met** — e.g. Competence 2/2 but Prevention &
   Detection 0/1 must appear under **Still needed**, not Complete, with the sub-gap
   shown. Add a unit test for exactly this scenario (mockup's "4 requirements left").
2. **`formatDate` is duplicated** in `FirstRun.tsx` and `Dashboard.tsx` — extract to
   one shared `src/ui/formatDate.ts` (keep the timezone-safe from-parts logic) and
   import it from both while you are in these files.
3. **Onboarding disclaimer is missing.** The spec requires the "not legal advice —
   verify with the State Bar of California" notice in onboarding (it appears on the
   dashboard already). Add it to `FirstRun` and to `mockups.html#s-setup`.
4. **Test gaps to close:** `resolvePeriod` overlap tie-break (date inside two
   periods → earliest), and `FirstRun` no-letter gating (Continue disabled).

---

## File structure

```
src/
  store/
    creditStore.ts               # localStorage-backed CRUD (list/add/update/remove)
    useCredits.ts                # React hook mirroring the store into state
    __tests__/
      creditStore.test.ts
      useCredits.test.tsx
  domain/
    creditContribution.ts        # (pure) credits <-> requirements they count toward
    __tests__/
      creditContribution.test.ts
  ui/
    formatDate.ts                # (pure) timezone-safe ISO -> "Mon D, YYYY"
    creditForm.ts                # (pure) form values <-> Credit + validation
    dashboardRows.ts             # (pure) ComplianceResult -> Still-needed/Complete rows
    CreditForm.tsx               # shared editable form (Add + edit)
    AddCredit.tsx                # blank "Confirm & save" screen (#s-add)
    CategoryRow.tsx              # expandable requirement row w/ contributing CLEs (#s-dash)
    CreditDetail.tsx             # single credit view/edit/remove (#s-credit)
    Dashboard.tsx                # MODIFIED: populated state (Still needed / Complete)
    components.css               # MODIFIED: append accordion/detail classes from mockup
    __tests__/
      creditForm.test.ts
      dashboardRows.test.ts
      CreditForm.test.tsx
      AddCredit.test.tsx
      CategoryRow.test.tsx
      CreditDetail.test.tsx
      Dashboard.test.tsx          # MODIFIED: add populated case
  App.tsx                        # MODIFIED: wire dashboard <-> add <-> credit detail
  __tests__/App.test.tsx         # MODIFIED: add credit end to end
```

The store and pure helpers never import React; the UI imports them, never the reverse. Domain rules are **reused from M1, not re-derived**.

---

## Task 1: CreditStore (localStorage-backed CRUD)

**Files:**
- Create: `src/store/creditStore.ts`
- Test: `src/store/__tests__/creditStore.test.ts`

The store is a plain factory returning `{ list, add, update, remove }`. It reads/writes a JSON array under one key. `localStorage` is injectable so tests use an in-memory stand-in and never touch the real store. A later milestone re-implements this same interface over Firestore.

- [ ] **Step 1: Write the failing test**

```ts
// ABOUTME: Tests the localStorage-backed credit store CRUD interface.
import { describe, it, expect, beforeEach } from 'vitest'
import { createCreditStore, type CreditStore } from '../creditStore'
import type { Credit } from '../../domain/types'

const base: Omit<Credit, 'id'> = {
  provider: 'CEB', activityTitle: 'Conflicts of Interest', completionDate: '2026-01-22',
  totalHours: 1.5, participatory: true, categoryHours: { ethics: 1.5 },
}

// A minimal in-memory Storage stand-in so tests never touch the real localStorage.
function fakeStorage(): Storage {
  const map = new Map<string, string>()
  return {
    get length() { return map.size },
    clear: () => map.clear(),
    getItem: (k) => map.get(k) ?? null,
    key: (i) => [...map.keys()][i] ?? null,
    removeItem: (k) => { map.delete(k) },
    setItem: (k, v) => { map.set(k, v) },
  }
}

describe('createCreditStore', () => {
  let store: CreditStore
  beforeEach(() => { store = createCreditStore(fakeStorage(), 'credits') })

  it('starts empty', () => {
    expect(store.list()).toEqual([])
  })
  it('add returns the credit with a generated id and lists it', () => {
    const c = store.add(base)
    expect(c.id).toBeTruthy()
    expect(store.list()).toHaveLength(1)
    expect(store.list()[0].provider).toBe('CEB')
  })
  it('update patches a credit by id', () => {
    const c = store.add(base)
    const updated = store.update(c.id, { totalHours: 2 })
    expect(updated.totalHours).toBe(2)
    expect(store.list()[0].totalHours).toBe(2)
  })
  it('remove deletes a credit by id', () => {
    const c = store.add(base)
    store.remove(c.id)
    expect(store.list()).toEqual([])
  })
  it('persists across store instances sharing the same storage', () => {
    const storage = fakeStorage()
    createCreditStore(storage, 'credits').add(base)
    expect(createCreditStore(storage, 'credits').list()).toHaveLength(1)
  })
  it('throws when updating or removing an unknown id', () => {
    expect(() => store.update('nope', {})).toThrow()
    expect(() => store.remove('nope')).toThrow()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- creditStore`
Expected: FAIL — `createCreditStore` not found.

- [ ] **Step 3: Write minimal implementation**

```ts
// ABOUTME: localStorage-backed CRUD store for a user's logged MCLE credits.
// ABOUTME: The list/add/update/remove interface is what a later milestone swaps onto Firestore.
import type { Credit } from '../domain/types'

export interface CreditStore {
  list(): Credit[]
  add(input: Omit<Credit, 'id'>): Credit
  update(id: string, patch: Partial<Omit<Credit, 'id'>>): Credit
  remove(id: string): void
}

const DEFAULT_KEY = 'cle.credits'

export function createCreditStore(
  storage: Storage = localStorage,
  key: string = DEFAULT_KEY,
): CreditStore {
  const read = (): Credit[] => {
    const raw = storage.getItem(key)
    return raw ? (JSON.parse(raw) as Credit[]) : []
  }
  const write = (credits: Credit[]) => storage.setItem(key, JSON.stringify(credits))

  return {
    list: () => read(),
    add(input) {
      const credit: Credit = { ...input, id: crypto.randomUUID() }
      write([...read(), credit])
      return credit
    },
    update(id, patch) {
      const credits = read()
      const i = credits.findIndex(c => c.id === id)
      if (i === -1) throw new Error(`update: no credit with id ${id}`)
      const updated: Credit = { ...credits[i], ...patch, id }
      credits[i] = updated
      write(credits)
      return updated
    },
    remove(id) {
      const credits = read()
      if (!credits.some(c => c.id === id)) throw new Error(`remove: no credit with id ${id}`)
      write(credits.filter(c => c.id !== id))
    },
  }
}
```

Note: `crypto.randomUUID()` is a global in the Node/jsdom test environment and in every target browser; no import needed.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- creditStore`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/store/creditStore.ts src/store/__tests__/creditStore.test.ts
git commit -m "feat(store): localStorage-backed credit CRUD store"
```

---

## Task 2: useCredits hook

**Files:**
- Create: `src/store/useCredits.ts`
- Test: `src/store/__tests__/useCredits.test.tsx`

A thin React hook that holds the store's list in state and re-reads after each mutation so components re-render. The store is injectable (default = a module-level `localStorage` store).

- [ ] **Step 1: Write the failing test**

```tsx
// ABOUTME: Tests the React hook that mirrors the credit store into re-rendering state.
import { describe, it, expect } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useCredits } from '../useCredits'
import { createCreditStore } from '../creditStore'
import type { Credit } from '../../domain/types'

function fakeStorage(): Storage {
  const map = new Map<string, string>()
  return {
    get length() { return map.size }, clear: () => map.clear(),
    getItem: (k) => map.get(k) ?? null, key: (i) => [...map.keys()][i] ?? null,
    removeItem: (k) => { map.delete(k) }, setItem: (k, v) => { map.set(k, v) },
  }
}

const base: Omit<Credit, 'id'> = {
  provider: 'CEB', activityTitle: 'X', completionDate: '2026-01-22',
  totalHours: 1, participatory: true, categoryHours: {},
}

describe('useCredits', () => {
  it('exposes stored credits and re-renders on add/update/remove', () => {
    const store = createCreditStore(fakeStorage())
    const { result } = renderHook(() => useCredits(store))
    expect(result.current.credits).toEqual([])

    let id = ''
    act(() => { id = result.current.add(base).id })
    expect(result.current.credits).toHaveLength(1)

    act(() => { result.current.update(id, { totalHours: 3 }) })
    expect(result.current.credits[0].totalHours).toBe(3)

    act(() => { result.current.remove(id) })
    expect(result.current.credits).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- useCredits`
Expected: FAIL — `useCredits` not found.

- [ ] **Step 3: Write minimal implementation**

```ts
// ABOUTME: React hook wrapping a CreditStore so mutations re-render the UI.
// ABOUTME: Components depend on this surface; swapping the store keeps the hook unchanged.
import { useCallback, useState } from 'react'
import type { Credit } from '../domain/types'
import { createCreditStore, type CreditStore } from './creditStore'

const defaultStore = createCreditStore()

export function useCredits(store: CreditStore = defaultStore) {
  const [credits, setCredits] = useState<Credit[]>(() => store.list())
  const add = useCallback((input: Omit<Credit, 'id'>) => {
    const c = store.add(input); setCredits(store.list()); return c
  }, [store])
  const update = useCallback((id: string, patch: Partial<Omit<Credit, 'id'>>) => {
    const c = store.update(id, patch); setCredits(store.list()); return c
  }, [store])
  const remove = useCallback((id: string) => {
    store.remove(id); setCredits(store.list())
  }, [store])
  return { credits, add, update, remove }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- useCredits`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add src/store/useCredits.ts src/store/__tests__/useCredits.test.tsx
git commit -m "feat(store): useCredits hook mirroring the store into React state"
```

---

## Task 3: creditContribution (credits <-> requirements)

**Files:**
- Create: `src/domain/creditContribution.ts`
- Test: `src/domain/__tests__/creditContribution.test.ts`

Pure helpers, reused by the dashboard accordion and the credit-detail screen. They apply the **same** hours-attribution rules as M1's `calculateCompliance` (do not restate the rule set): `total` = every credit with hours; `participatory` = participatory credits; a category = credits with hours in that category.

- [ ] **Step 1: Write the failing test**

```ts
// ABOUTME: Tests the pure mappings between credits and the requirements they count toward.
import { describe, it, expect } from 'vitest'
import { hoursToward, creditsForRequirement, requirementsForCredit } from '../creditContribution'
import { REQUIREMENT_RULES } from '../requirements'
import type { Credit } from '../types'

const credit = (over: Partial<Credit>): Credit => ({
  id: 'x', provider: 'p', activityTitle: 't', completionDate: '2026-01-01',
  totalHours: 0, participatory: false, categoryHours: {}, ...over,
})

const ethics = credit({ id: 'a', totalHours: 4, participatory: true, categoryHours: { ethics: 4 } })
const tech = credit({ id: 'b', totalHours: 1, participatory: false, categoryHours: { technology: 1 } })
const credits = [ethics, tech]

describe('hoursToward', () => {
  it('returns hours the credit contributes to a key', () => {
    expect(hoursToward('total', ethics)).toBe(4)
    expect(hoursToward('participatory', tech)).toBe(0)
    expect(hoursToward('ethics', ethics)).toBe(4)
  })
})

describe('creditsForRequirement', () => {
  it('total includes every credit with hours', () => {
    expect(creditsForRequirement('total', credits).map(c => c.id)).toEqual(['a', 'b'])
  })
  it('participatory includes only participatory credits', () => {
    expect(creditsForRequirement('participatory', credits).map(c => c.id)).toEqual(['a'])
  })
  it('a category includes only credits with hours in that category', () => {
    expect(creditsForRequirement('ethics', credits).map(c => c.id)).toEqual(['a'])
    expect(creditsForRequirement('technology', credits).map(c => c.id)).toEqual(['b'])
  })
})

describe('requirementsForCredit', () => {
  it('lists every rule a credit contributes hours to', () => {
    const keys = requirementsForCredit(REQUIREMENT_RULES, ethics).map(r => r.key)
    expect(keys).toContain('total')
    expect(keys).toContain('participatory')
    expect(keys).toContain('ethics')
    expect(keys).not.toContain('civility')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- creditContribution`
Expected: FAIL — `hoursToward` not found.

- [ ] **Step 3: Write minimal implementation**

```ts
// ABOUTME: Pure mappings between credits and the requirements they count toward.
// ABOUTME: Drives the dashboard accordion and the credit-detail "counts toward" list.
import type { Credit, RequirementRule } from './types'

export function hoursToward(key: RequirementRule['key'], c: Credit): number {
  if (key === 'total') return c.totalHours
  if (key === 'participatory') return c.participatory ? c.totalHours : 0
  return c.categoryHours[key] ?? 0
}

export function creditsForRequirement(key: RequirementRule['key'], credits: Credit[]): Credit[] {
  return credits.filter(c => hoursToward(key, c) > 0)
}

export function requirementsForCredit(rules: RequirementRule[], credit: Credit): RequirementRule[] {
  return rules.filter(r => hoursToward(r.key, credit) > 0)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- creditContribution`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/domain/creditContribution.ts src/domain/__tests__/creditContribution.test.ts
git commit -m "feat(domain): map credits to the requirements they count toward"
```

---

## Task 4: creditForm helpers (form values <-> Credit + validation)

**Files:**
- Create: `src/ui/creditForm.ts`
- Test: `src/ui/__tests__/creditForm.test.ts`

Pure conversion and validation so the same logic backs both the Add screen and the detail edit form (DRY). Form fields are strings (input values); helpers convert to a typed `Credit` and validate. Categories include `general` per the spec's data model.

- [ ] **Step 1: Write the failing test**

```ts
// ABOUTME: Tests conversion and validation between the credit form fields and a Credit.
import { describe, it, expect } from 'vitest'
import { emptyCreditForm, creditToForm, formToCredit, validateCreditForm } from '../creditForm'
import type { Credit } from '../../domain/types'

describe('creditForm', () => {
  it('emptyCreditForm has blank fields and participatory true by default', () => {
    const f = emptyCreditForm()
    expect(f.provider).toBe('')
    expect(f.totalHours).toBe('')
    expect(f.participatory).toBe(true)
  })

  it('round-trips a Credit through creditToForm/formToCredit', () => {
    const c: Credit = {
      id: '1', provider: 'CEB', activityTitle: 'Ethics', completionDate: '2026-01-22',
      totalHours: 1.5, participatory: true, categoryHours: { ethics: 1.5 },
    }
    expect(formToCredit(creditToForm(c))).toEqual({
      provider: 'CEB', activityTitle: 'Ethics', completionDate: '2026-01-22',
      totalHours: 1.5, participatory: true, categoryHours: { ethics: 1.5 },
    })
  })

  it('flags missing required fields and non-positive hours', () => {
    const errors = validateCreditForm(emptyCreditForm())
    expect(errors.provider).toBeTruthy()
    expect(errors.activityTitle).toBeTruthy()
    expect(errors.completionDate).toBeTruthy()
    expect(errors.totalHours).toBeTruthy()
  })

  it('flags category hours that exceed the total', () => {
    const base = emptyCreditForm()
    const f = { ...base, provider: 'p', activityTitle: 't', completionDate: '2026-01-01',
      totalHours: '1', categoryHours: { ...base.categoryHours, ethics: '2' } }
    expect(validateCreditForm(f).categoryHours).toBeTruthy()
  })

  it('accepts a valid form with no errors', () => {
    const base = emptyCreditForm()
    const f = { ...base, provider: 'p', activityTitle: 't', completionDate: '2026-01-01',
      totalHours: '2', categoryHours: { ...base.categoryHours, ethics: '2' } }
    expect(validateCreditForm(f)).toEqual({})
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- creditForm`
Expected: FAIL — `emptyCreditForm` not found.

- [ ] **Step 3: Write minimal implementation**

```ts
// ABOUTME: Pure helpers converting/validating the credit form's string fields <-> a Credit.
// ABOUTME: Shared by the Add screen and the credit-detail edit form (single source of validation).
import type { Credit, CategoryKey } from '../domain/types'

export const FORM_CATEGORIES: (CategoryKey | 'general')[] = [
  'general', 'ethics', 'competence', 'competencePrevention',
  'bias', 'biasImplicit', 'technology', 'civility',
]

export const CATEGORY_LABELS: Record<CategoryKey | 'general', string> = {
  general: 'General', ethics: 'Legal Ethics', competence: 'Competence',
  competencePrevention: 'Prevention & Detection', bias: 'Elimination of Bias',
  biasImplicit: 'Implicit Bias', technology: 'Technology', civility: 'Civility',
}

export interface CreditFormValues {
  provider: string
  activityTitle: string
  completionDate: string
  totalHours: string
  participatory: boolean
  categoryHours: Record<CategoryKey | 'general', string>
}

const blankCategoryHours = (): Record<CategoryKey | 'general', string> =>
  Object.fromEntries(FORM_CATEGORIES.map(k => [k, ''])) as Record<CategoryKey | 'general', string>

export function emptyCreditForm(): CreditFormValues {
  return { provider: '', activityTitle: '', completionDate: '', totalHours: '',
    participatory: true, categoryHours: blankCategoryHours() }
}

export function creditToForm(c: Credit): CreditFormValues {
  const categoryHours = blankCategoryHours()
  for (const k of FORM_CATEGORIES) {
    const v = c.categoryHours[k]
    if (v !== undefined) categoryHours[k] = String(v)
  }
  return { provider: c.provider, activityTitle: c.activityTitle, completionDate: c.completionDate,
    totalHours: String(c.totalHours), participatory: c.participatory, categoryHours }
}

export function formToCredit(f: CreditFormValues): Omit<Credit, 'id'> {
  const categoryHours: Partial<Record<CategoryKey | 'general', number>> = {}
  for (const k of FORM_CATEGORIES) {
    const raw = f.categoryHours[k].trim()
    const n = Number(raw)
    if (raw !== '' && n > 0) categoryHours[k] = n
  }
  return { provider: f.provider.trim(), activityTitle: f.activityTitle.trim(),
    completionDate: f.completionDate, totalHours: Number(f.totalHours),
    participatory: f.participatory, categoryHours }
}

export function validateCreditForm(f: CreditFormValues): Record<string, string> {
  const errors: Record<string, string> = {}
  if (!f.provider.trim()) errors.provider = 'Provider is required'
  if (!f.activityTitle.trim()) errors.activityTitle = 'Title is required'
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.completionDate)) errors.completionDate = 'Enter a completion date'
  const total = Number(f.totalHours)
  if (!(total > 0)) errors.totalHours = 'Enter hours greater than 0'
  const catSum = FORM_CATEGORIES.reduce((s, k) => s + (Number(f.categoryHours[k]) || 0), 0)
  if (total > 0 && catSum > total) errors.categoryHours = 'Category hours exceed the total'
  return errors
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- creditForm`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/ui/creditForm.ts src/ui/__tests__/creditForm.test.ts
git commit -m "feat(ui): pure credit-form conversion and validation helpers"
```

---

## Task 5: CreditForm component (shared editable form)

**Files:**
- Create: `src/ui/CreditForm.tsx`
- Test: `src/ui/__tests__/CreditForm.test.tsx`
- Modify: `src/ui/components.css` (only if the `.seg2` / labelled `.field` styles are not already present from M1 — port from `mockups.html`)

The one editable form, used blank by Add and pre-filled by the detail edit. Ports the `.field`, `.toggle`, `.switch` markup from `mockups.html#s-add`/`#s-setup`. Renders provider, activity title, completion date, total hours, a participatory switch, and one hours input per category (including General). On submit it validates via `validateCreditForm`; if clean, calls `onSave(formToCredit(values))`.

- [ ] **Step 1: Write the failing test**

```tsx
// ABOUTME: Tests the shared editable credit form: validation gating and save payload.
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CreditForm } from '../CreditForm'

describe('CreditForm', () => {
  it('does not save while required fields are missing', () => {
    const onSave = vi.fn()
    render(<CreditForm submitLabel="Save credit" onSave={onSave} />)
    fireEvent.click(screen.getByRole('button', { name: /save credit/i }))
    expect(onSave).not.toHaveBeenCalled()
    expect(screen.getByText(/provider is required/i)).toBeInTheDocument()
  })

  it('saves a valid credit', () => {
    const onSave = vi.fn()
    render(<CreditForm submitLabel="Save credit" onSave={onSave} />)
    fireEvent.change(screen.getByLabelText(/provider/i), { target: { value: 'CEB' } })
    fireEvent.change(screen.getByLabelText(/activity title/i), { target: { value: 'Ethics' } })
    fireEvent.change(screen.getByLabelText(/completion date/i), { target: { value: '2026-01-22' } })
    fireEvent.change(screen.getByLabelText(/total hours/i), { target: { value: '1.5' } })
    fireEvent.change(screen.getByLabelText(/^legal ethics$/i), { target: { value: '1.5' } })
    fireEvent.click(screen.getByRole('button', { name: /save credit/i }))
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({
      provider: 'CEB', activityTitle: 'Ethics', completionDate: '2026-01-22',
      totalHours: 1.5, participatory: true, categoryHours: { ethics: 1.5 },
    }))
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- CreditForm`
Expected: FAIL — `CreditForm` not found.

- [ ] **Step 3: Write minimal implementation**

```tsx
// ABOUTME: Editable MCLE credit form shared by the Add and credit-detail edit flows.
// ABOUTME: Ports the field/toggle/switch markup from mockups.html #s-add.
import { useState } from 'react'
import type { Credit } from '../domain/types'
import {
  type CreditFormValues, emptyCreditForm, formToCredit, validateCreditForm,
  FORM_CATEGORIES, CATEGORY_LABELS,
} from './creditForm'

interface Props {
  submitLabel: string
  initial?: CreditFormValues
  onSave: (credit: Omit<Credit, 'id'>) => void
  onCancel?: () => void
}

export function CreditForm({ submitLabel, initial, onSave, onCancel }: Props) {
  const [values, setValues] = useState<CreditFormValues>(initial ?? emptyCreditForm())
  const [errors, setErrors] = useState<Record<string, string>>({})

  const set = (patch: Partial<CreditFormValues>) => setValues(v => ({ ...v, ...patch }))
  const setCat = (k: string, val: string) =>
    setValues(v => ({ ...v, categoryHours: { ...v.categoryHours, [k]: val } }))

  const submit = () => {
    const errs = validateCreditForm(values)
    setErrors(errs)
    if (Object.keys(errs).length === 0) onSave(formToCredit(values))
  }

  return (
    <>
      <div className="label">Activity</div>
      <div className="list">
        <div className="field">
          <label htmlFor="provider">Provider</label>
          <input id="provider" value={values.provider} onChange={e => set({ provider: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="activityTitle">Activity title</label>
          <input id="activityTitle" value={values.activityTitle} onChange={e => set({ activityTitle: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="completionDate">Completion date</label>
          <input id="completionDate" type="date" value={values.completionDate} onChange={e => set({ completionDate: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="totalHours">Total hours</label>
          <input id="totalHours" inputMode="decimal" value={values.totalHours} onChange={e => set({ totalHours: e.target.value })} />
        </div>
        <div className="toggle">
          <div className="t"><div className="n">Participatory</div><div className="m q">live hours, not self-study</div></div>
          <button type="button" className={`switch${values.participatory ? ' on' : ''}`}
            aria-pressed={values.participatory} aria-label="Participatory"
            onClick={() => set({ participatory: !values.participatory })} />
        </div>
      </div>

      <div className="label">Category hours</div>
      <div className="list">
        {FORM_CATEGORIES.map(k => (
          <div className="field" key={k}>
            <label htmlFor={`cat-${k}`}>{CATEGORY_LABELS[k]}</label>
            <input id={`cat-${k}`} inputMode="decimal" value={values.categoryHours[k]}
              onChange={e => setCat(k, e.target.value)} />
          </div>
        ))}
      </div>

      {Object.values(errors).length > 0 && (
        <div className="note" style={{ color: '#FF3B30', textAlign: 'left' }}>
          {Object.values(errors).map(msg => <div key={msg}>{msg}</div>)}
        </div>
      )}

      <button className="btn" onClick={submit}>{submitLabel}</button>
      {onCancel && <button className="link" onClick={onCancel}>Cancel</button>}
    </>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- CreditForm`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/ui/CreditForm.tsx src/ui/__tests__/CreditForm.test.tsx src/ui/components.css
git commit -m "feat(ui): shared editable credit form with validation"
```

---

## Task 6: AddCredit screen (blank "Confirm & save")

**Files:**
- Create: `src/ui/AddCredit.tsx`
- Test: `src/ui/__tests__/AddCredit.test.tsx`

The `#s-add` screen opened blank — the manual-entry path. A back control, the "Confirm & save" title, and the shared `CreditForm`. It is presentational: `onSave` (the store's `add`, wired in App) and `onBack` come from the parent.

- [ ] **Step 1: Write the failing test**

```tsx
// ABOUTME: Tests that the Add screen saves an entered credit via onSave.
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AddCredit } from '../AddCredit'

it('saves an entered credit', () => {
  const onSave = vi.fn(); const onBack = vi.fn()
  render(<AddCredit onSave={onSave} onBack={onBack} />)
  fireEvent.change(screen.getByLabelText(/provider/i), { target: { value: 'CEB' } })
  fireEvent.change(screen.getByLabelText(/activity title/i), { target: { value: 'Ethics' } })
  fireEvent.change(screen.getByLabelText(/completion date/i), { target: { value: '2026-01-22' } })
  fireEvent.change(screen.getByLabelText(/total hours/i), { target: { value: '2' } })
  fireEvent.click(screen.getByRole('button', { name: /save credit/i }))
  expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ provider: 'CEB', totalHours: 2 }))
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- AddCredit`
Expected: FAIL — `AddCredit` not found.

- [ ] **Step 3: Write minimal implementation**

```tsx
// ABOUTME: The blank manual "Confirm & save" screen for adding a credit by hand.
// ABOUTME: Ports mockups.html #s-add; writes via the injected onSave (the credit store).
import type { Credit } from '../domain/types'
import { CreditForm } from './CreditForm'

interface Props {
  onSave: (credit: Omit<Credit, 'id'>) => void
  onBack: () => void
}

export function AddCredit({ onSave, onBack }: Props) {
  return (
    <div className="wrap">
      <div className="topline">
        <button className="back" onClick={onBack}>‹ Back</button>
        <div className="sp" />
      </div>
      <h1 className="h1">Confirm &amp; save</h1>
      <div className="sub">Enter your credit details. Nothing is uploaded.</div>
      <CreditForm submitLabel="Save credit" onSave={onSave} onCancel={onBack} />
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- AddCredit`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add src/ui/AddCredit.tsx src/ui/__tests__/AddCredit.test.tsx
git commit -m "feat(ui): blank Add-credit screen wrapping the shared form"
```

---

## Task 7: dashboardRows (group progress into Still-needed / Complete)

**Files:**
- Create: `src/ui/dashboardRows.ts`
- Test: `src/ui/__tests__/dashboardRows.test.ts`

A pure helper turning M1's flat `ComplianceResult` into display rows. It **folds sub-minimum rules** (those with a `parent`, e.g. `competencePrevention`, `biasImplicit`) into their parent row rather than listing them separately, matching the mockup ("Competence … incl. 1 hr Prevention & Detection"). A parent is complete only when it and all its children are met; its remaining is the largest outstanding amount. Each row carries its contributing credits (via `creditsForRequirement`) for the accordion.

- [ ] **Step 1: Write the failing test**

```ts
// ABOUTME: Tests grouping requirement progress into Still-needed / Complete display rows.
import { describe, it, expect } from 'vitest'
import { buildDashboardRows } from '../dashboardRows'
import { calculateCompliance } from '../../domain/complianceCalculator'
import { REQUIREMENT_RULES } from '../../domain/requirements'
import type { Credit } from '../../domain/types'

const credit = (over: Partial<Credit>): Credit => ({
  id: 'x', provider: 'p', activityTitle: 't', completionDate: '2026-01-01',
  totalHours: 0, participatory: false, categoryHours: {}, ...over,
})

describe('buildDashboardRows', () => {
  it('puts unmet requirements in stillNeeded and hides sub-minimum rows', () => {
    const result = calculateCompliance(REQUIREMENT_RULES, [])
    const { stillNeeded, complete } = buildDashboardRows(result, [])
    expect(complete).toEqual([])
    const keys = stillNeeded.map(r => r.key)
    expect(keys).toContain('total')
    expect(keys).not.toContain('competencePrevention') // folded into Competence
  })

  it('marks a parent incomplete when its sub-minimum is unmet', () => {
    const credits = [credit({ id: 'a', totalHours: 2, categoryHours: { competence: 2 } })]
    const result = calculateCompliance(REQUIREMENT_RULES, credits)
    const comp = buildDashboardRows(result, credits).stillNeeded.find(r => r.key === 'competence')!
    expect(comp.met).toBe(false)
    expect(comp.remaining).toBe(1) // still needs the 1 hr Prevention & Detection sub-minimum
  })

  it('lists contributing credits on a completed row', () => {
    const credits = [credit({ id: 'a', totalHours: 4, participatory: true, categoryHours: { ethics: 4 } })]
    const result = calculateCompliance(REQUIREMENT_RULES, credits)
    const ethics = buildDashboardRows(result, credits).complete.find(r => r.key === 'ethics')!
    expect(ethics.credits.map(c => c.id)).toEqual(['a'])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- dashboardRows`
Expected: FAIL — `buildDashboardRows` not found.

- [ ] **Step 3: Write minimal implementation**

```ts
// ABOUTME: Pure grouping of a ComplianceResult into Still-needed / Complete dashboard rows.
// ABOUTME: Folds sub-minimum rules into their parent; attaches each row's contributing credits.
import type { Credit, ComplianceResult, RequirementProgress, RequirementRule } from '../domain/types'
import { creditsForRequirement } from '../domain/creditContribution'

export interface DashboardRow {
  key: RequirementRule['key']
  label: string
  met: boolean
  remaining: number
  earned: number
  required: number
  children: RequirementProgress[] // sub-minimums, for meta text
  credits: Credit[]               // contributing credits, for the accordion
}

export function buildDashboardRows(result: ComplianceResult, credits: Credit[]): {
  stillNeeded: DashboardRow[]
  complete: DashboardRow[]
} {
  const rows: DashboardRow[] = result.progress
    .filter(p => !p.parent)
    .map(p => {
      const children = result.progress.filter(c => c.parent === p.key)
      const met = p.met && children.every(c => c.met)
      const remaining = met ? 0 : Math.max(p.remaining, ...children.map(c => c.remaining), 0)
      return { key: p.key, label: p.label, met, remaining, earned: p.earned,
        required: p.required, children, credits: creditsForRequirement(p.key, credits) }
    })
  return { stillNeeded: rows.filter(r => !r.met), complete: rows.filter(r => r.met) }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- dashboardRows`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/ui/dashboardRows.ts src/ui/__tests__/dashboardRows.test.ts
git commit -m "feat(ui): group compliance progress into still-needed/complete rows"
```

---

## Task 8: CategoryRow (inline-expand accordion) + shared formatDate

**Files:**
- Create: `src/ui/formatDate.ts`, `src/ui/CategoryRow.tsx`
- Test: `src/ui/__tests__/CategoryRow.test.tsx`
- Modify: `src/ui/components.css` (append the `.item`/`.credits`/`.crow`/`.ck`/`.empty` accordion classes and the `.item.open` / `.chev` rotation transition, ported verbatim from `mockups.html`)

An expandable requirement row. Collapsed: label, a meta line, and either the remaining amount (`+N hr`) when unmet or a `N/M` value with a green check when met. Tapping toggles `.item.open`, animating the `.credits` panel (CSS `max-height`/`opacity` transition from the mockup) to reveal contributing `.crow` credits, or a per-category empty state. `formatDate` is extracted to its own module so CategoryRow, CreditDetail, and Dashboard share one timezone-safe formatter (never pass a date-only ISO string to `new Date()`).

- [ ] **Step 1: Write the failing test**

```tsx
// ABOUTME: Tests the expandable category row: trailing state, reveal, and empty state.
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CategoryRow } from '../CategoryRow'
import type { DashboardRow } from '../dashboardRows'

const row = (over: Partial<DashboardRow>): DashboardRow => ({
  key: 'ethics', label: 'Legal Ethics', met: true, remaining: 0, earned: 4, required: 4,
  children: [], credits: [], ...over,
})

describe('CategoryRow', () => {
  it('shows a check and value when met', () => {
    render(<CategoryRow row={row({})} onOpenCredit={() => {}} />)
    expect(screen.getByText('4/4')).toBeInTheDocument()
  })

  it('shows the remaining amount when unmet', () => {
    render(<CategoryRow row={row({ key: 'civility', label: 'Civility', met: false, remaining: 1, earned: 0, required: 1 })} onOpenCredit={() => {}} />)
    expect(screen.getByText('+1 hr')).toBeInTheDocument()
  })

  it('expands to reveal contributing credits and opens one', () => {
    const onOpen = vi.fn()
    const credits = [{ id: 'a', provider: 'CEB', activityTitle: 'Ethics', completionDate: '2026-01-22', totalHours: 2, participatory: true, categoryHours: { ethics: 2 } }]
    render(<CategoryRow row={row({ credits })} onOpenCredit={onOpen} />)
    fireEvent.click(screen.getByText('Legal Ethics'))
    fireEvent.click(screen.getByText('Ethics'))
    expect(onOpen).toHaveBeenCalledWith('a')
  })

  it('shows a per-category empty state when no credits contribute', () => {
    render(<CategoryRow row={row({ key: 'civility', label: 'Civility', met: false, remaining: 1, earned: 0, required: 1, credits: [] })} onOpenCredit={() => {}} />)
    fireEvent.click(screen.getByText('Civility'))
    expect(screen.getByText(/no civility cle/i)).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- CategoryRow`
Expected: FAIL — `CategoryRow` not found.

- [ ] **Step 3: Write minimal implementation**

Create `src/ui/formatDate.ts`:
```ts
// ABOUTME: Timezone-safe formatter for date-only ISO strings (YYYY-MM-DD).
// ABOUTME: Builds the Date from parts so it never shifts a day in US timezones.
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
```

Create `src/ui/CategoryRow.tsx`:
```tsx
// ABOUTME: An expandable dashboard requirement row revealing its contributing CLEs.
// ABOUTME: Ports the item/row/credits/crow accordion markup from mockups.html #s-dash.
import { useState } from 'react'
import type { DashboardRow } from './dashboardRows'
import { hoursToward } from '../domain/creditContribution'
import { formatDate } from './formatDate'

const ChevDown = () => (
  <svg className="chev" width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M3.25 6 8 10.75 12.75 6" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
const ChevRight = () => (
  <svg className="chev" width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="M6 3.25 10.75 8 6 12.75" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

function remainingLabel(hrs: number) { return `+${hrs} hr${hrs === 1 ? '' : 's'}` }

function metaText(row: DashboardRow): string {
  if (row.key === 'participatory') return `live hours, not self-study · ${row.earned} of ${row.required}`
  if (row.children.length) return row.children.map(c => `incl. ${c.required} hr ${c.label}`).join(' · ')
  return `${row.earned} of ${row.required}`
}

interface Props { row: DashboardRow; onOpenCredit: (id: string) => void }

export function CategoryRow({ row, onOpenCredit }: Props) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`item${open ? ' open' : ''}`}>
      <div className="row tap" onClick={() => setOpen(o => !o)}>
        <div className="t">
          <div className="n">{row.label}</div>
          <div className="m q">{metaText(row)}</div>
        </div>
        {row.met
          ? <><div className="val">{row.earned}/{row.required}</div><div className="ck">✓</div></>
          : <div className="need">{remainingLabel(row.remaining)}</div>}
        <ChevDown />
      </div>
      <div className="credits">
        {row.credits.length === 0
          ? <div className="empty">No {row.label.toLowerCase()} CLE yet — add one to close this.</div>
          : row.credits.map(c => (
              <div className="crow" key={c.id} onClick={() => onOpenCredit(c.id)}>
                <div className="t">
                  <div className="cn">{c.activityTitle}</div>
                  <div className="cm">{c.provider} · {formatDate(c.completionDate)}</div>
                </div>
                <div className="chn">{hoursToward(row.key, c).toFixed(1)} hr</div>
                <ChevRight />
              </div>
            ))}
      </div>
    </div>
  )
}
```

Append to `src/ui/components.css` (from `mockups.html`): the `.item .chev` rotation, `.item.open .credits` transition, `.credits`, `.crow`, `.ck`, `.empty`, `.need`, `.val`/`.val.met`, `.chev` rules — copy the exact declarations from the mockup so the look and animation match.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- CategoryRow`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/ui/formatDate.ts src/ui/CategoryRow.tsx src/ui/__tests__/CategoryRow.test.tsx src/ui/components.css
git commit -m "feat(ui): expandable category row with contributing-credit accordion"
```

---

## Task 9: Dashboard — populated state

**Files:**
- Modify: `src/ui/Dashboard.tsx`
- Modify: `src/ui/__tests__/Dashboard.test.tsx`

Extend the M1 Dashboard. With **no** credits it keeps rendering the M1 empty state (`#s-empty`). With credits it renders `#s-dash`: heading = the binding constraint (`N requirements left`, from `stillNeeded.length`), a sub line (`Group G · D days left · E of T hours logged`), a **Still needed** list then a **Complete** list of `CategoryRow`s, the "Add a certificate" button, and the disclaimer. New props: `credits`, `today` (pinnable for tests), `onAddCredit`, `onOpenCredit`.

- [ ] **Step 1: Extend the test (add a populated case)**

Add to `src/ui/__tests__/Dashboard.test.tsx` (keep the M1 empty-state test; update its props to pass `credits={[]}` and the new callbacks):
```tsx
import { calculateCompliance } from '../../domain/complianceCalculator'
import { REQUIREMENT_RULES } from '../../domain/requirements'
import type { Credit } from '../../domain/types'

it('shows the binding constraint and grouped lists when credits exist', () => {
  const credits: Credit[] = [{
    id: 'a', provider: 'CEB', activityTitle: 'Conflicts of Interest', completionDate: '2026-01-22',
    totalHours: 4, participatory: true, categoryHours: { ethics: 4 },
  }]
  const result = calculateCompliance(REQUIREMENT_RULES, credits)
  render(<Dashboard name="Maya Hoffman" group={2}
    period={{ start: '2024-02-01', end: '2027-03-29', reportBy: '2027-03-30' }}
    result={result} credits={credits} today="2026-07-10"
    onAddCredit={() => {}} onOpenCredit={() => {}} />)
  expect(screen.getByText(/requirements left/i)).toBeInTheDocument()
  expect(screen.getByText('Still needed')).toBeInTheDocument()
  expect(screen.getByText('Complete')).toBeInTheDocument()
  expect(screen.getByText('Legal Ethics')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- Dashboard`
Expected: FAIL — Dashboard does not yet accept `credits`/`onOpenCredit` or render "Still needed".

- [ ] **Step 3: Implement the populated branch**

In `Dashboard.tsx`, add `credits`, `today`, `onAddCredit`, `onOpenCredit` to the props. Keep the existing empty-state render when `credits.length === 0`. Otherwise compute `const { stillNeeded, complete } = buildDashboardRows(result, credits)`, the logged-hours total (`result.progress.find(p => p.key === 'total')!.earned`), and days-to-deadline with a timezone-safe diff:
```ts
function daysUntil(iso: string, today: string): number {
  const [ty, tm, td] = today.split('-').map(Number)
  const [y, m, d] = iso.split('-').map(Number)
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(ty, tm - 1, td)) / 86_400_000)
}
```
Render:
- `<h1 className="h1">{n} requirement{n === 1 ? '' : 's'} left</h1>` where `n = stillNeeded.length` (fall back to `You're compliant` when `n === 0`).
- `<div className="sub">Group {group} · {daysUntil(period.reportBy, today)} days left · {earned} of {total} hours logged</div>`.
- `<div className="label">Still needed</div>` + a `.list` of `<CategoryRow>` over `stillNeeded` (render the list only when non-empty).
- `<div className="label">Complete</div>` + a `.list` of `<CategoryRow>` over `complete` (only when non-empty).
- The `Add a certificate` button calling `onAddCredit`, and the existing disclaimer `.note`.

Pass `onOpenCredit` through to each `CategoryRow`. Port classes from `mockups.html#s-dash`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- Dashboard`
Expected: PASS (both empty and populated tests).

- [ ] **Step 5: Commit**

```bash
git add src/ui/Dashboard.tsx src/ui/__tests__/Dashboard.test.tsx
git commit -m "feat(ui): populated dashboard with still-needed/complete lists"
```

---

## Task 10: CreditDetail (view / edit / remove)

**Files:**
- Create: `src/ui/CreditDetail.tsx`
- Test: `src/ui/__tests__/CreditDetail.test.tsx`

The `#s-credit` screen for one CLE: title, provider · date, a Details list (Hours, Participatory Yes/No, and "Counts toward" listing the requirements via `requirementsForCredit`). "Edit credit" swaps in the shared `CreditForm` pre-filled with `creditToForm(credit)`; saving calls `onUpdate(id, patch)`. "Remove credit" calls `onRemove(id)`. "‹ Back" calls `onBack`. `rules` defaults to `REQUIREMENT_RULES`.

- [ ] **Step 1: Write the failing test**

```tsx
// ABOUTME: Tests viewing, editing, and removing a single credit.
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CreditDetail } from '../CreditDetail'
import type { Credit } from '../../domain/types'

const ethics: Credit = {
  id: '1', provider: 'Practising Law Institute', activityTitle: 'Ethics in the Age of AI',
  completionDate: '2026-03-04', totalHours: 2, participatory: true, categoryHours: { ethics: 2 },
}

describe('CreditDetail', () => {
  it('shows details and which requirements it counts toward', () => {
    render(<CreditDetail credit={ethics} onUpdate={vi.fn()} onRemove={vi.fn()} onBack={vi.fn()} />)
    expect(screen.getByText('Ethics in the Age of AI')).toBeInTheDocument()
    expect(screen.getByText('Yes')).toBeInTheDocument()
    expect(screen.getByText(/legal ethics/i)).toBeInTheDocument()
  })

  it('edits and saves via onUpdate', () => {
    const onUpdate = vi.fn()
    render(<CreditDetail credit={ethics} onUpdate={onUpdate} onRemove={vi.fn()} onBack={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /edit credit/i }))
    fireEvent.change(screen.getByLabelText(/total hours/i), { target: { value: '3' } })
    fireEvent.click(screen.getByRole('button', { name: /save credit/i }))
    expect(onUpdate).toHaveBeenCalledWith('1', expect.objectContaining({ totalHours: 3 }))
  })

  it('removes via onRemove', () => {
    const onRemove = vi.fn()
    render(<CreditDetail credit={ethics} onUpdate={vi.fn()} onRemove={onRemove} onBack={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: /remove credit/i }))
    expect(onRemove).toHaveBeenCalledWith('1')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- CreditDetail`
Expected: FAIL — `CreditDetail` not found.

- [ ] **Step 3: Write minimal implementation**

```tsx
// ABOUTME: Single-credit screen: view details, edit via the shared form, or remove.
// ABOUTME: Ports mockups.html #s-credit; shows which requirements the credit counts toward.
import { useState } from 'react'
import type { Credit, RequirementRule } from '../domain/types'
import { REQUIREMENT_RULES } from '../domain/requirements'
import { requirementsForCredit, hoursToward } from '../domain/creditContribution'
import { creditToForm } from './creditForm'
import { CreditForm } from './CreditForm'
import { formatDate } from './formatDate'

interface Props {
  credit: Credit
  rules?: RequirementRule[]
  onUpdate: (id: string, patch: Omit<Credit, 'id'>) => void
  onRemove: (id: string) => void
  onBack: () => void
}

export function CreditDetail({ credit, rules = REQUIREMENT_RULES, onUpdate, onRemove, onBack }: Props) {
  const [editing, setEditing] = useState(false)

  if (editing) {
    return (
      <div className="wrap">
        <div className="topline"><button className="back" onClick={() => setEditing(false)}>‹ Back</button><div className="sp" /></div>
        <h1 className="h1">Edit credit</h1>
        <CreditForm submitLabel="Save credit" initial={creditToForm(credit)}
          onSave={patch => { onUpdate(credit.id, patch); setEditing(false) }}
          onCancel={() => setEditing(false)} />
      </div>
    )
  }

  const counts = requirementsForCredit(rules, credit)
  return (
    <div className="wrap">
      <div className="topline"><button className="back" onClick={onBack}>‹ Back</button><div className="sp" /></div>
      <h1 className="h1">{credit.activityTitle}</h1>
      <div className="sub">{credit.provider} · {formatDate(credit.completionDate)}</div>

      <div className="label">Details</div>
      <div className="list">
        <div className="row"><div className="t"><div className="n">Hours</div></div><div className="val">{credit.totalHours.toFixed(1)}</div></div>
        <div className="row"><div className="t"><div className="n">Participatory</div></div><div className={`val${credit.participatory ? ' met' : ''}`}>{credit.participatory ? 'Yes' : 'No'}</div></div>
        <div className="row"><div className="t"><div className="n">Counts toward</div><div className="m q">{counts.map(r => `${r.label} · ${hoursToward(r.key, credit).toFixed(1)} hrs`).join(' · ')}</div></div></div>
      </div>

      <button className="btn" onClick={() => setEditing(true)}>Edit credit</button>
      <button className="link" style={{ color: '#FF3B30' }} onClick={() => onRemove(credit.id)}>Remove credit</button>
      <div className="note">One certificate can count toward more than one requirement.</div>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- CreditDetail`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/ui/CreditDetail.tsx src/ui/__tests__/CreditDetail.test.tsx
git commit -m "feat(ui): single-credit view/edit/remove screen"
```

---

## Task 11: Wire the app (Dashboard <-> Add <-> Credit detail)

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/__tests__/App.test.tsx`

Give App a single home surface with screen state `'first-run' | 'dashboard' | 'add' | 'credit'` and a selected credit id. Use `useCredits` for storage, recompute compliance with `useMemo(() => calculateCompliance(REQUIREMENT_RULES, credits), [credits])`, and route the callbacks. App accepts an optional `store` and `today` prop (defaults preserve M1 behavior) so tests are deterministic. No tab bar — Add is a button; credit detail opens from a row; Back returns to the dashboard.

- [ ] **Step 1: Extend the test (add-credit end to end)**

Keep the M1 first-run→dashboard test. Add (injecting a fresh in-memory store so the test is isolated):
```tsx
import { createCreditStore } from '../store/creditStore'

function fakeStorage(): Storage {
  const map = new Map<string, string>()
  return {
    get length() { return map.size }, clear: () => map.clear(),
    getItem: (k) => map.get(k) ?? null, key: (i) => [...map.keys()][i] ?? null,
    removeItem: (k) => { map.delete(k) }, setItem: (k, v) => { map.set(k, v) },
  }
}

it('adds a credit from the dashboard and reflects it', () => {
  render(<App store={createCreditStore(fakeStorage())} today="2026-07-10" />)
  fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Maya Hoffman' } })
  fireEvent.click(screen.getByRole('button', { name: /continue/i }))
  fireEvent.click(screen.getByRole('button', { name: /add a certificate/i }))
  fireEvent.change(screen.getByLabelText(/provider/i), { target: { value: 'CEB' } })
  fireEvent.change(screen.getByLabelText(/activity title/i), { target: { value: 'Conflicts of Interest' } })
  fireEvent.change(screen.getByLabelText(/completion date/i), { target: { value: '2026-01-22' } })
  fireEvent.change(screen.getByLabelText(/total hours/i), { target: { value: '4' } })
  fireEvent.change(screen.getByLabelText(/^legal ethics$/i), { target: { value: '4' } })
  fireEvent.click(screen.getByRole('button', { name: /save credit/i }))
  expect(screen.getByText('Complete')).toBeInTheDocument()
  expect(screen.getByText('Legal Ethics')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- App`
Expected: FAIL — App does not accept `store` or route to Add.

- [ ] **Step 3: Implement App routing**

Hold `screen` state and `selectedId`. Use `const { credits, add, update, remove } = useCredits(store)`. On first-run Continue, store the onboarding `{ name, group, period }` and go to `'dashboard'`. Render:
- `'first-run'` → `<FirstRun onContinue={...} />` (M1).
- `'dashboard'` → `<Dashboard ... result={result} credits={credits} today={today} onAddCredit={() => setScreen('add')} onOpenCredit={id => { setSelectedId(id); setScreen('credit') }} />`.
- `'add'` → `<AddCredit onSave={c => { add(c); setScreen('dashboard') }} onBack={() => setScreen('dashboard')} />`.
- `'credit'` → look up the credit by `selectedId`; render `<CreditDetail credit={found} onUpdate={(id, patch) => { update(id, patch) }} onRemove={id => { remove(id); setScreen('dashboard') }} onBack={() => setScreen('dashboard')} />`. If the credit is gone, fall back to the dashboard.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- App`
Expected: PASS.

- [ ] **Step 5: Full suite + manual check**

Run: `npm test` — expect ALL tests green.
Run: `npm run dev` — type "Maya Hoffman", Continue; on the empty dashboard tap "Add a certificate"; enter CEB / a title / a date / 4 total hours / 4 Legal Ethics hours; Save. Confirm the dashboard now shows the binding-constraint heading, Legal Ethics under **Complete**, the row expands to reveal the CLE, and opening it shows the detail screen where edit and remove work. Use the @superpowers:verification-before-completion skill before claiming done.

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx src/__tests__/App.test.tsx
git commit -m "feat: wire dashboard, add-credit, and credit-detail navigation"
```

---

## Done criteria for Milestone 2

- `npm test` is all green; the store, `creditContribution`, `creditForm`, and `dashboardRows` have unit tests, and every screen has a render/interaction test.
- `npm run dev` shows the full manual loop: empty dashboard → blank Add form → save → populated dashboard (Still needed / Complete, roll-up Total & Participatory, binding-constraint heading) → expand a category → open a credit → edit/remove — matching `mockups.html`.
- Credits persist to `localStorage` and survive reload; the store's `list/add/update/remove` interface is the only persistence surface (ready to swap for Firestore).
- M1 domain modules are reused unchanged; no MCLE rule is re-implemented in the UI.
- No Firebase, no network, no certificate parsing, no proration UI yet (those are later milestones).
</content>
</invoke>
