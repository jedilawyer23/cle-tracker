# CLE Tracker — Milestone 1: Requirements Engine + Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A running web app where an attorney enters their name and sees their derived California MCLE compliance group, reporting deadline, and full requirement as an Apple/iOS-styled checklist (empty state) — backed by a pure, thoroughly tested requirements engine.

**Architecture:** A React + TypeScript + Vite single-page app. All MCLE domain logic lives in pure, side-effect-free TypeScript modules (`RequirementsConfig` data, `deriveGroup`, `resolvePeriod`, `ComplianceCalculator`) that take plain inputs and return plain data, so they are unit-tested without any UI or backend. The UI is a thin layer that renders the calculator's output, porting the approved markup and styles from `mockups.html`. No Firebase, no network in this milestone — state is in-memory React state.

**Tech Stack:** Vite, React 18, TypeScript, Tailwind CSS, Vitest + React Testing Library.

**Reference:** The approved UI is `mockups.html` (screens: "First run" / `#s-setup`, "Empty" / `#s-empty`). Verified MCLE rules and data model are in `docs/superpowers/specs/2026-07-10-california-cle-tracker-design.md`.

---

## File structure

```
package.json, vite.config.ts, tsconfig.json, index.html
src/
  index.css                     # Tailwind v4 entry: @import "tailwindcss"
  main.tsx                      # React entry
  App.tsx                       # top-level screen state (first-run | dashboard)
  domain/
    requirements.ts             # RequirementsConfig: rule set + group calendar (data + types)
    deriveGroup.ts              # lastName -> group (pure)
    resolvePeriod.ts            # (group, asOf, calendar) -> current period (pure)
    complianceCalculator.ts     # (requirement, credits) -> per-requirement progress + verdict (pure)
    types.ts                    # shared domain types (Group, Requirement, Credit, Progress...)
  domain/__tests__/
    deriveGroup.test.ts
    resolvePeriod.test.ts
    complianceCalculator.test.ts
  ui/
    tokens.css                  # ported CSS custom properties + base from mockups.html
    List.tsx, Row.tsx           # inset-grouped list primitives
    FirstRun.tsx                # name entry -> derived requirement
    Dashboard.tsx               # renders calculator output (empty + populated ready)
  ui/__tests__/
    FirstRun.test.tsx
    Dashboard.test.tsx
```

Each domain module has one responsibility and no imports from React or Firebase. The UI imports domain modules, never the reverse.

---

## Task 1: Scaffold the project

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.app.json` (edit), `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`, `src/ui/tokens.css`, `src/setupTests.ts`

Note: this uses **Tailwind v4** (what `npm install` resolves to in 2026). v4 has no
`tailwindcss init`, no `postcss.config.js`, and no `tailwind.config.js` — it is wired
through the `@tailwindcss/vite` plugin and a single `@import "tailwindcss";`. Do not
use any v3 instructions. The exact iOS look is carried by the ported CSS in
`tokens.css`; Tailwind is available for layout utilities.

- [ ] **Step 1: Scaffold Vite React-TS app**

Run:
```bash
cd "/Users/shrut/Documents/GitHub/CLE tracker"
npm create vite@latest . -- --template react-ts
```
If the directory is non-empty, choose "Ignore files and continue". Then:
```bash
npm install
npm install -D tailwindcss @tailwindcss/vite vitest @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 2: Wire Vite (React + Tailwind v4 + Vitest)**

`vite.config.ts`:
```ts
/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: { environment: 'jsdom', globals: true, setupFiles: './src/setupTests.ts' },
})
```

- [ ] **Step 3: Global CSS (Tailwind entry + ported tokens)**

`src/index.css`:
```css
@import "tailwindcss";
```
Create `src/ui/tokens.css` with the `:root` custom properties and base body styles
from `mockups.html` (the `--bg`, `--card`, `--ink`, `--muted`, `--faint`, `--sep`,
`--accent`, `--good`, `--warn`, `--track` variables; body font/background/
`font-variant-numeric`). In `src/main.tsx`, import both (Tailwind first):
`import './index.css'` then `import './ui/tokens.css'`.

- [ ] **Step 4: Vitest setup, scripts, and test types**

`src/setupTests.ts`:
```ts
// ABOUTME: Vitest setup — registers jest-dom matchers for all tests.
// ABOUTME: Loaded via vite.config.ts test.setupFiles.
import '@testing-library/jest-dom'
```
In `package.json` scripts: `"test": "vitest run --passWithNoTests"`, `"test:watch": "vitest"`
(the `--passWithNoTests` flag makes the pre-first-test run exit 0).
In the app tsconfig (`tsconfig.app.json` in current Vite scaffolds) `compilerOptions`,
add `"types": ["vitest/globals", "@testing-library/jest-dom"]` so `vi`/`it`/`expect`
and the jest-dom matchers type-check.

- [ ] **Step 5: Minimal App renders**

`src/App.tsx` returns a placeholder `<div>CLE Tracker</div>`. `src/main.tsx` renders
`<App/>` and imports the two CSS files from Step 3.

- [ ] **Step 6: Verify dev server and test runner**

Run: `npm run dev` — expect the app to serve with no errors (Ctrl-C to stop).
Run: `npm test` — expect exit 0 (no tests yet, passWithNoTests).

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite React-TS app with Tailwind v4 and Vitest"
```

---

## Task 2: Domain types

**Files:**
- Create: `src/domain/types.ts`

- [ ] **Step 1: Define the shared domain types**

```ts
// ABOUTME: Shared domain types for the MCLE requirements engine.
// ABOUTME: Plain data only — no React, Firebase, or I/O dependencies.

export type Group = 1 | 2 | 3

export type CategoryKey =
  | 'ethics' | 'competence' | 'competencePrevention'
  | 'bias' | 'biasImplicit' | 'technology' | 'civility'

// A single required minimum, in hours, for the compliance period.
export interface RequirementRule {
  key: 'total' | 'participatory' | CategoryKey
  label: string
  minimumHours: number
  // Optional parent for sub-minimums (e.g. competencePrevention -> competence).
  parent?: CategoryKey
}

export interface Period {
  start: string      // ISO date, inclusive
  end: string        // ISO date, compliance deadline
  reportBy: string   // ISO date, reporting deadline
}

// Hours a single logged credit contributes to each category (+ total/participatory).
export interface Credit {
  id: string
  provider: string
  activityTitle: string
  completionDate: string      // ISO date
  totalHours: number
  participatory: boolean
  categoryHours: Partial<Record<CategoryKey | 'general', number>>
}

export interface RequirementProgress {
  key: RequirementRule['key']
  label: string
  required: number
  earned: number
  remaining: number
  met: boolean
  parent?: CategoryKey
}

export interface ComplianceResult {
  progress: RequirementProgress[]   // one per rule, in config order
  metCount: number
  totalCount: number
  compliant: boolean
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/domain/types.ts
git commit -m "feat(domain): add shared MCLE domain types"
```

---

## Task 3: RequirementsConfig (rule set + group calendar)

**Files:**
- Create: `src/domain/requirements.ts`

This is data, effective-dated. The exact calendar dates MUST be re-verified against
calbar.ca.gov before release (noted in the spec); the values below are the ones
verified 2026-07-10 and are sufficient for M1.

- [ ] **Step 1: Write the requirement rules and calendar**

```ts
// ABOUTME: Effective-dated California MCLE rule set and per-group cycle calendar.
// ABOUTME: Data only. Re-verify dates and minimums against calbar.ca.gov before release.
import type { RequirementRule, Group, Period } from './types'

// Order here is the display order in the UI.
export const REQUIREMENT_RULES: RequirementRule[] = [
  { key: 'total', label: 'Total hours', minimumHours: 25 },
  { key: 'ethics', label: 'Legal Ethics', minimumHours: 4 },
  { key: 'competence', label: 'Competence', minimumHours: 2 },
  { key: 'competencePrevention', label: 'Prevention & Detection', minimumHours: 1, parent: 'competence' },
  { key: 'bias', label: 'Elimination of Bias', minimumHours: 2 },
  { key: 'biasImplicit', label: 'Implicit Bias', minimumHours: 1, parent: 'bias' },
  { key: 'technology', label: 'Technology', minimumHours: 1 },
  { key: 'civility', label: 'Civility', minimumHours: 1 },
  { key: 'participatory', label: 'Participatory', minimumHours: 12.5 },
]

// Explicit period rows per group. Extend as cycles roll. Verify against calbar.ca.gov.
export const GROUP_CALENDAR: Record<Group, Period[]> = {
  1: [
    { start: '2022-02-01', end: '2025-03-29', reportBy: '2025-03-30' },
    { start: '2025-02-01', end: '2028-03-29', reportBy: '2028-03-30' },
  ],
  2: [
    { start: '2024-02-01', end: '2027-03-29', reportBy: '2027-03-30' },
    { start: '2027-02-01', end: '2030-03-29', reportBy: '2030-03-30' },
  ],
  3: [
    { start: '2023-02-01', end: '2026-03-29', reportBy: '2026-03-30' },
    { start: '2026-02-01', end: '2029-03-29', reportBy: '2029-03-30' },
  ],
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/domain/requirements.ts
git commit -m "feat(domain): add MCLE requirement rules and group calendar"
```

---

## Task 4: deriveGroup

**Files:**
- Create: `src/domain/deriveGroup.ts`
- Test: `src/domain/__tests__/deriveGroup.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// ABOUTME: Tests that a last name maps to the correct permanent MCLE compliance group.
import { describe, it, expect } from 'vitest'
import { deriveGroup } from '../deriveGroup'

describe('deriveGroup', () => {
  it('maps A–G to group 1', () => {
    expect(deriveGroup('Adams')).toBe(1)
    expect(deriveGroup('Garcia')).toBe(1)
  })
  it('maps H–M to group 2', () => {
    expect(deriveGroup('Hoffman')).toBe(2)
    expect(deriveGroup('Martinez')).toBe(2)
  })
  it('maps N–Z to group 3', () => {
    expect(deriveGroup('Nguyen')).toBe(3)
    expect(deriveGroup('Zhang')).toBe(3)
  })
  it('is case-insensitive and ignores leading non-letters', () => {
    expect(deriveGroup('  o’brien')).toBe(3)
    expect(deriveGroup("d'Angelo")).toBe(1)
  })
  it('throws on a name with no letters', () => {
    expect(() => deriveGroup('123')).toThrow()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- deriveGroup`
Expected: FAIL — `deriveGroup` not found.

- [ ] **Step 3: Write minimal implementation**

```ts
// ABOUTME: Derives the permanent MCLE compliance group from an attorney's last name.
// ABOUTME: Group is set by the first letter: A–G=1, H–M=2, N–Z=3.
import type { Group } from './types'

export function deriveGroup(lastName: string): Group {
  const letter = lastName.toUpperCase().replace(/[^A-Z]/g, '')[0]
  if (!letter) throw new Error(`Cannot derive group: no letters in "${lastName}"`)
  if (letter <= 'G') return 1
  if (letter <= 'M') return 2
  return 3
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- deriveGroup`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/domain/deriveGroup.ts src/domain/__tests__/deriveGroup.test.ts
git commit -m "feat(domain): derive compliance group from last name"
```

---

## Task 5: resolvePeriod

**Files:**
- Create: `src/domain/resolvePeriod.ts`
- Test: `src/domain/__tests__/resolvePeriod.test.ts`

`resolvePeriod` picks the period for a group that contains `asOf` (between `start`
and `reportBy` inclusive); if `asOf` precedes all periods, it returns the earliest;
if it follows all, it returns the latest. Tests use a fixture calendar so they do
not depend on the real (re-verifiable) dates.

- [ ] **Step 1: Write the failing test**

```ts
// ABOUTME: Tests selection of the correct compliance period for a given date.
import { describe, it, expect } from 'vitest'
import { resolvePeriod } from '../resolvePeriod'
import { GROUP_CALENDAR } from '../requirements'
import type { Period } from '../types'

const cal: Period[] = [
  { start: '2024-02-01', end: '2027-03-29', reportBy: '2027-03-30' },
  { start: '2027-02-01', end: '2030-03-29', reportBy: '2030-03-30' },
]

// Guards the real seeded calendar data, per the spec's testing strategy.
describe('real GROUP_CALENDAR', () => {
  it('resolves Group 3 in early 2026 to the 2026-03-30 deadline', () => {
    expect(resolvePeriod(GROUP_CALENDAR[3], '2026-01-15').reportBy).toBe('2026-03-30')
  })
  it('resolves Group 2 as of 2026-07-10 to the 2027-03-30 deadline', () => {
    expect(resolvePeriod(GROUP_CALENDAR[2], '2026-07-10').reportBy).toBe('2027-03-30')
  })
})

describe('resolvePeriod', () => {
  it('returns the period containing the date', () => {
    expect(resolvePeriod(cal, '2026-07-10').reportBy).toBe('2027-03-30')
  })
  it('includes the start and reportBy boundaries', () => {
    expect(resolvePeriod(cal, '2024-02-01').reportBy).toBe('2027-03-30')
    expect(resolvePeriod(cal, '2027-03-30').reportBy).toBe('2027-03-30')
  })
  it('returns the next period once past the prior reportBy', () => {
    expect(resolvePeriod(cal, '2027-03-31').reportBy).toBe('2030-03-30')
  })
  it('returns the earliest period for a date before all periods', () => {
    expect(resolvePeriod(cal, '2020-01-01').reportBy).toBe('2027-03-30')
  })
  it('throws on an empty calendar', () => {
    expect(() => resolvePeriod([], '2026-07-10')).toThrow()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- resolvePeriod`
Expected: FAIL — `resolvePeriod` not found.

- [ ] **Step 3: Write minimal implementation**

```ts
// ABOUTME: Selects the compliance period covering a given date from a group's calendar.
// ABOUTME: Pure — compares ISO date strings lexicographically (valid for YYYY-MM-DD).
import type { Period } from './types'

export function resolvePeriod(calendar: Period[], asOf: string): Period {
  if (calendar.length === 0) throw new Error('resolvePeriod: empty calendar')
  const sorted = [...calendar].sort((a, b) => a.start.localeCompare(b.start))
  const containing = sorted.find(p => asOf >= p.start && asOf <= p.reportBy)
  if (containing) return containing
  if (asOf < sorted[0].start) return sorted[0]
  return sorted[sorted.length - 1]
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- resolvePeriod`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/domain/resolvePeriod.ts src/domain/__tests__/resolvePeriod.test.ts
git commit -m "feat(domain): resolve current compliance period from calendar"
```

---

## Task 6: ComplianceCalculator

**Files:**
- Create: `src/domain/complianceCalculator.ts`
- Test: `src/domain/__tests__/complianceCalculator.test.ts`

Given the requirement rules and a list of credits, compute earned/required/remaining
and met/compliant. Earned per rule:
- `total` = sum of `totalHours`.
- `participatory` = sum of `totalHours` where `participatory` is true.
- a `CategoryKey` = sum of that key in each credit's `categoryHours`.
`remaining = max(0, required - earned)`; `met = earned >= required`;
`compliant = every rule met`.

- [ ] **Step 1: Write the failing test**

```ts
// ABOUTME: Tests the core compliance calculation across all MCLE requirement rules.
import { describe, it, expect } from 'vitest'
import { calculateCompliance } from '../complianceCalculator'
import { REQUIREMENT_RULES } from '../requirements'
import type { Credit } from '../types'

const credit = (over: Partial<Credit>): Credit => ({
  id: 'x', provider: 'p', activityTitle: 't', completionDate: '2026-01-01',
  totalHours: 0, participatory: false, categoryHours: {}, ...over,
})

const byKey = (r: ReturnType<typeof calculateCompliance>, key: string) =>
  r.progress.find(p => p.key === key)!

describe('calculateCompliance', () => {
  it('reports everything unmet for no credits', () => {
    const r = calculateCompliance(REQUIREMENT_RULES, [])
    expect(byKey(r, 'total').earned).toBe(0)
    expect(byKey(r, 'total').remaining).toBe(25)
    expect(r.metCount).toBe(0)
    expect(r.compliant).toBe(false)
  })

  it('sums total and participatory hours', () => {
    const credits = [
      credit({ totalHours: 3, participatory: true }),
      credit({ totalHours: 2, participatory: false }),
    ]
    const r = calculateCompliance(REQUIREMENT_RULES, credits)
    expect(byKey(r, 'total').earned).toBe(5)
    expect(byKey(r, 'participatory').earned).toBe(3)
  })

  it('sums category hours and marks a category met', () => {
    const credits = [credit({ totalHours: 4, categoryHours: { ethics: 4 } })]
    const r = calculateCompliance(REQUIREMENT_RULES, credits)
    expect(byKey(r, 'ethics').earned).toBe(4)
    expect(byKey(r, 'ethics').met).toBe(true)
    expect(byKey(r, 'ethics').remaining).toBe(0)
  })

  it('tracks sub-minimums independently of their parent', () => {
    const credits = [credit({ totalHours: 2, categoryHours: { competence: 2 } })]
    const r = calculateCompliance(REQUIREMENT_RULES, credits)
    expect(byKey(r, 'competence').met).toBe(true)
    expect(byKey(r, 'competencePrevention').met).toBe(false)
    expect(byKey(r, 'competencePrevention').remaining).toBe(1)
  })

  it('is compliant only when every rule is met', () => {
    const credits = [credit({
      totalHours: 25, participatory: true,
      categoryHours: { ethics: 4, competence: 2, competencePrevention: 1, bias: 2, biasImplicit: 1, technology: 1, civility: 1 },
    })]
    const r = calculateCompliance(REQUIREMENT_RULES, credits)
    expect(r.compliant).toBe(true)
    expect(r.metCount).toBe(r.totalCount)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- complianceCalculator`
Expected: FAIL — `calculateCompliance` not found.

- [ ] **Step 3: Write minimal implementation**

```ts
// ABOUTME: Computes per-requirement progress and overall compliance from logged credits.
// ABOUTME: Pure — no I/O; the single source of truth for "what's still needed".
import type { RequirementRule, Credit, RequirementProgress, ComplianceResult } from './types'

function earnedFor(rule: RequirementRule, credits: Credit[]): number {
  if (rule.key === 'total') return credits.reduce((s, c) => s + c.totalHours, 0)
  if (rule.key === 'participatory')
    return credits.reduce((s, c) => s + (c.participatory ? c.totalHours : 0), 0)
  return credits.reduce((s, c) => s + (c.categoryHours[rule.key] ?? 0), 0)
}

export function calculateCompliance(rules: RequirementRule[], credits: Credit[]): ComplianceResult {
  const progress: RequirementProgress[] = rules.map(rule => {
    const earned = earnedFor(rule, credits)
    const met = earned >= rule.minimumHours
    return {
      key: rule.key, label: rule.label, required: rule.minimumHours,
      earned, remaining: Math.max(0, rule.minimumHours - earned), met, parent: rule.parent,
    }
  })
  const metCount = progress.filter(p => p.met).length
  return { progress, metCount, totalCount: progress.length, compliant: metCount === progress.length }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- complianceCalculator`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/domain/complianceCalculator.ts src/domain/__tests__/complianceCalculator.test.ts
git commit -m "feat(domain): compute per-requirement progress and compliance"
```

---

## Task 7: List/Row UI primitives

**Files:**
- Create: `src/ui/List.tsx`, `src/ui/Row.tsx`, and the component CSS (either a `src/ui/components.css` ported from `mockups.html` or Tailwind classes matching it)

Port the inset-grouped list look from `mockups.html`: `.list` (white card, radius 12,
no border, hairline separators inset to text) and `.row` (12px×16px padding, title +
trailing value). Keep these presentational and prop-driven.

- [ ] **Step 1: Write a render test for Row**

```tsx
// ABOUTME: Verifies Row renders its label and trailing content.
import { render, screen } from '@testing-library/react'
import { Row } from '../Row'

it('renders label and trailing value', () => {
  render(<Row label="Legal Ethics" trailing={<span>4/4</span>} />)
  expect(screen.getByText('Legal Ethics')).toBeInTheDocument()
  expect(screen.getByText('4/4')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- Row`
Expected: FAIL — `Row` not found.

- [ ] **Step 3: Implement List and Row**

Create `Row.tsx` (props: `label`, optional `meta`, optional `trailing`, optional `onClick`) and `List.tsx` (wraps children in the `.list` card). Match `mockups.html` markup/classes. Each file starts with the two `ABOUTME:` comment lines.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- Row`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/List.tsx src/ui/Row.tsx src/ui/*.css
git commit -m "feat(ui): inset-grouped List and Row primitives"
```

---

## Task 8: Dashboard (renders calculator output)

**Files:**
- Create: `src/ui/Dashboard.tsx`
- Test: `src/ui/__tests__/Dashboard.test.tsx`

The Dashboard takes a `ComplianceResult`, a `Period`, and a name, and renders the
"Your requirement" / empty state from `mockups.html#s-empty`: a large title, the
group + deadline sub, and the requirement rows (each label + `earned / required`).
Split rows into "Still needed" (`!met`) and "Complete" (`met`) once credits exist;
with zero credits show the single "Your requirement" list. Include the disclaimer.

- [ ] **Step 1: Write the failing test**

```tsx
// ABOUTME: Verifies the Dashboard renders derived requirement rows and the deadline.
import { render, screen } from '@testing-library/react'
import { Dashboard } from '../Dashboard'
import { calculateCompliance } from '../../domain/complianceCalculator'
import { REQUIREMENT_RULES } from '../../domain/requirements'

it('shows the empty requirement with the deadline', () => {
  const result = calculateCompliance(REQUIREMENT_RULES, [])
  render(<Dashboard name="Maya Hoffman" group={2}
    period={{ start: '2024-02-01', end: '2027-03-29', reportBy: '2027-03-30' }}
    result={result} />)
  expect(screen.getByText('Legal Ethics')).toBeInTheDocument()
  expect(screen.getByText(/Mar 30, 2027|2027-03-30/)).toBeInTheDocument()
  expect(screen.getByText(/0 \/ 25|0\/25/)).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- Dashboard`
Expected: FAIL — `Dashboard` not found.

- [ ] **Step 3: Implement Dashboard**

Render title, sub (`Group {group} · due {formatted reportBy}`), the requirement rows via `List`/`Row`, and the disclaimer. Port classes from `mockups.html#s-empty`.

Format the ISO `reportBy` to `Mon D, YYYY` with a timezone-safe helper — **never pass a
date-only ISO string to `new Date()`**, which parses as UTC midnight and renders a day
early in every US timezone (failing this task's own test). Build from parts:
```ts
function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- Dashboard`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/Dashboard.tsx src/ui/__tests__/Dashboard.test.tsx
git commit -m "feat(ui): dashboard rendering derived requirement (empty state)"
```

---

## Task 9: FirstRun (name → derived requirement)

**Files:**
- Create: `src/ui/FirstRun.tsx`
- Test: `src/ui/__tests__/FirstRun.test.tsx`

FirstRun renders the "Get started" screen (`mockups.html#s-setup`): a name input and,
as the name is entered, the derived group / deadline / 25-hour requirement. A
"Continue" button calls `onContinue({ name, group, period })`. Last name is the last
whitespace-separated token of the full name.

- [ ] **Step 1: Write the failing test**

```tsx
// ABOUTME: Verifies FirstRun derives and shows the requirement, and continues.
import { render, screen, fireEvent } from '@testing-library/react'
import { FirstRun } from '../FirstRun'

it('derives group from the entered name and continues', () => {
  const onContinue = vi.fn()
  render(<FirstRun onContinue={onContinue} />)
  fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Maya Hoffman' } })
  expect(screen.getByText(/Group 2/)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: /continue/i }))
  expect(onContinue).toHaveBeenCalledWith(expect.objectContaining({ group: 2, name: 'Maya Hoffman' }))
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- FirstRun`
Expected: FAIL — `FirstRun` not found.

- [ ] **Step 3: Implement FirstRun**

Use `deriveGroup(lastToken(name))`, `resolvePeriod(GROUP_CALENDAR[group], today)`. Guard against a name with no letters (no derived block, disabled Continue). `today` is `new Date().toISOString().slice(0,10)`, passed in as a prop defaulting to that so tests can pin it. Port classes from `mockups.html#s-setup`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- FirstRun`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ui/FirstRun.tsx src/ui/__tests__/FirstRun.test.tsx
git commit -m "feat(ui): first-run name entry deriving the requirement"
```

---

## Task 10: Wire the app together

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// ABOUTME: Verifies first-run -> dashboard navigation end to end.
import { render, screen, fireEvent } from '@testing-library/react'
import App from '../App'

it('goes from first run to the dashboard', () => {
  render(<App />)
  fireEvent.change(screen.getByLabelText(/full name/i), { target: { value: 'Maya Hoffman' } })
  fireEvent.click(screen.getByRole('button', { name: /continue/i }))
  expect(screen.getByText(/Legal Ethics/)).toBeInTheDocument()
})
```
(Place at `src/__tests__/App.test.tsx`.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- App`
Expected: FAIL.

- [ ] **Step 3: Implement App state**

Hold `screen` state (`'first-run' | 'dashboard'`) and the onboarding result. On Continue, compute `calculateCompliance(REQUIREMENT_RULES, [])` and show the Dashboard.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- App`
Expected: PASS.

- [ ] **Step 5: Full suite + manual check**

Run: `npm test` — expect ALL tests green.
Run: `npm run dev` — open the app, type "Maya Hoffman", Continue, confirm the empty dashboard shows Group 2, the deadline, and the requirement rows. Use the @superpowers:verification-before-completion skill before claiming done.

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx src/__tests__/App.test.tsx
git commit -m "feat: wire first-run to dashboard"
```

---

## Done criteria for Milestone 1

- `npm test` is all green; domain modules have exhaustive unit tests.
- `npm run dev` shows: name entry → derived group/deadline/requirement → empty dashboard, matching `mockups.html`.
- No Firebase, no network, no certificate handling yet (those are M2–M5).
- All domain logic is pure and isolated from the UI.
