# CLE Tracker — Milestone 3: Certificate Parser (Cloud Function + Add Screen) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A Firebase Cloud Function `parseCertificate` that accepts an uploaded certificate (PDF or image, base64), asks the Anthropic Claude API to extract a structured `ParsedCredit` (provider, activityTitle, completionDate, totalHours, participatory, categoryHours, and a per-field `confidence` of high | medium | low), validates it against a schema, and **never persists the file** — plus a frontend **Add** screen that captures a file (Take Photo / Photo Library / Files), uploads it to the function, and routes the result into the existing M2 **Confirm** screen with low-confidence fields flagged, falling back to blank manual entry on failure.

**Architecture:** Parsing is server-side so the Anthropic API key never reaches the client. The function is a thin wrapper around **pure, unit-testable helpers** — media-type/content-block building, prompt shaping, and JSON-schema validation — so the extraction logic is tested without calling the real API. The one test that *does* call the real API is a true end-to-end test against a **real sample certificate file** (no mocking, per the spec's testing strategy). The certificate bytes live only in the function invocation's memory for the duration of the request; nothing is written to Firestore or Firebase Storage. The frontend adds a file input and a mapping layer; it reuses the M2 Confirm screen unchanged.

**Tech Stack:** Firebase Cloud Functions v2 (`firebase-functions`), TypeScript + Node, `@anthropic-ai/sdk`, Vitest (functions package). Frontend: existing Vite + React + TypeScript app, `firebase/functions` client SDK, Vitest + React Testing Library.

> ⚠️ **Verify at build time.** The exact Anthropic SDK surface (`client.messages.create`, `output_config.format`, content-block shapes), the model id (`claude-opus-4-8`), the Firebase Functions v2 APIs (`onCall`, `defineSecret`), and every package version below **MUST be re-checked against the installed packages and current docs when this is implemented** — treat the code here as the intended shape, not a frozen contract. Load the `claude-api` skill before writing any Anthropic call. Never hardcode secrets; the API key comes only from a Cloud Functions secret.

**Reference:** The approved UI is `mockups.html` (`#s-add` — "Confirm & save", built in M2). Verified rules, the data model, and the no-storage constraint are in `docs/superpowers/specs/2026-07-10-california-cle-tracker-design.md`. M1 domain types (`Credit`, `CategoryKey`) live in `src/domain/types.ts`; the M2 Confirm screen and Firebase app init are assumed complete.

---

## File structure

```
firebase.json                        # Firebase config: functions + (existing) hosting/firestore
.firebaserc                          # project alias (created by `firebase use`)
functions/
  package.json                       # separate Node/TS package for Cloud Functions
  tsconfig.json
  vitest.config.ts
  .gitignore                         # node_modules, lib/
  src/
    index.ts                         # exports the parseCertificate callable
    types.ts                         # ParsedCredit, Confidence (mirror of frontend shape)
    parsedCreditSchema.ts            # JSON schema + validateParsedCredit (pure)
    contentBlock.ts                  # mimeType -> document/image content block (pure)
    prompt.ts                        # SYSTEM_PROMPT + buildMessages (pure)
    extract.ts                       # extractParsedCredit(client, input): thin API orchestration
    __tests__/
      contentBlock.test.ts
      prompt.test.ts
      parsedCreditSchema.test.ts
      extract.e2e.test.ts            # REAL sample cert, REAL API — no mocks (gated on API key)
      fixtures/
        sample-certificate.pdf       # a real MCLE certificate (added by hand)
src/
  firebase.ts                        # (M2) app init — add functions export
  domain/types.ts                    # (M1) add shared ParsedCredit type
  parsing/
    fileToBase64.ts                  # File -> { fileBase64, mimeType } (pure-ish)
    parsedCreditToConfirmState.ts    # ParsedCredit -> Confirm initial state + low-confidence flags (pure)
    parseCertificate.ts             # client-side wrapper over the callable
  parsing/__tests__/
    fileToBase64.test.ts
    parsedCreditToConfirmState.test.ts
  ui/
    AddCertificate.tsx               # file input + upload + route to Confirm / manual fallback
  ui/__tests__/
    AddCertificate.test.tsx
```

The `functions/` package is fully separate from the Vite app (its own `package.json`, `tsconfig`, `node_modules`). Domain types are duplicated intentionally across the boundary — `functions/src/types.ts` mirrors the `ParsedCredit` shape added to `src/domain/types.ts`; keep the two field lists identical.

---

## Task 1: Scaffold Firebase Cloud Functions

**Files:**
- Create: `firebase.json`, `functions/package.json`, `functions/tsconfig.json`, `functions/vitest.config.ts`, `functions/.gitignore`, `functions/src/index.ts`

This uses **Firebase Functions v2** and the **Anthropic TypeScript SDK**. No test in this task — it is scaffolding, mirroring M1 Task 1.

- [ ] **Step 1: Note the one-time Firebase CLI + project setup (manual, run by the human)**

These are prerequisites, not committed code. Record them in the task but expect the human to have run them:
```bash
npm install -g firebase-tools     # or: npx firebase-tools@latest
firebase login
cd "/Users/shrut/Documents/GitHub/CLE tracker"
firebase use --add                # pick/alias the project -> writes .firebaserc
```
The Anthropic key is stored as a **Cloud Functions secret**, never in code or env files:
```bash
firebase functions:secrets:set ANTHROPIC_API_KEY   # paste the key when prompted
```
Local emulator/e2e runs read the same key from the shell env (`export ANTHROPIC_API_KEY=...`).

- [ ] **Step 2: Create the functions package**

`functions/package.json` (verify versions at build time):
```json
{
  "name": "cle-tracker-functions",
  "type": "module",
  "engines": { "node": "20" },
  "main": "lib/index.js",
  "scripts": {
    "build": "tsc",
    "test": "vitest run --passWithNoTests",
    "test:watch": "vitest",
    "deploy": "firebase deploy --only functions"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "*",
    "firebase-admin": "*",
    "firebase-functions": "*"
  },
  "devDependencies": {
    "typescript": "*",
    "vitest": "*"
  }
}
```
Then:
```bash
cd "/Users/shrut/Documents/GitHub/CLE tracker/functions"
npm install
```
Pin the `*` versions to whatever `npm install` resolves (record them back into `package.json`).

- [ ] **Step 3: Configure TypeScript and Vitest for the functions package**

`functions/tsconfig.json`:
```json
{
  "compilerOptions": {
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "target": "ES2022",
    "outDir": "lib",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src"],
  "exclude": ["src/**/*.test.ts", "src/**/*.e2e.test.ts"]
}
```
`functions/vitest.config.ts`:
```ts
/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: { environment: 'node', globals: true },
})
```
`functions/.gitignore`:
```
node_modules/
lib/
```

- [ ] **Step 4: Wire firebase.json to the functions codebase**

`firebase.json` (merge with any M2 hosting/firestore config already present — do not clobber it):
```json
{
  "functions": [
    {
      "source": "functions",
      "codebase": "default",
      "predeploy": ["npm --prefix \"$RESOURCE_DIR\" run build"]
    }
  ]
}
```

- [ ] **Step 5: Minimal index so the package builds**

`functions/src/index.ts`:
```ts
// ABOUTME: Cloud Functions entry point — exports the parseCertificate callable.
// ABOUTME: Populated in Task 6; kept minimal here so the package compiles.
export {}
```

- [ ] **Step 6: Verify build and test runner**

Run: `cd "/Users/shrut/Documents/GitHub/CLE tracker/functions" && npm run build` — expect no TypeScript errors.
Run: `npm test` — expect exit 0 (no tests yet, `--passWithNoTests`).

- [ ] **Step 7: Commit**

```bash
git add firebase.json functions/package.json functions/tsconfig.json functions/vitest.config.ts functions/.gitignore functions/src/index.ts
git commit -m "chore(functions): scaffold Firebase Cloud Functions v2 (TypeScript, Vitest)"
```

---

## Task 2: ParsedCredit domain types

**Files:**
- Create: `functions/src/types.ts`
- Modify: `src/domain/types.ts` (add the shared `ParsedCredit` shape for the frontend)

The `ParsedCredit` field list mirrors the M1 `Credit` (minus `id`, plus per-field `confidence`). Keep the two copies identical.

- [ ] **Step 1: Define the functions-side types**

```ts
// ABOUTME: Structured certificate-extraction types returned by parseCertificate.
// ABOUTME: Plain data — mirrors src/domain/types.ts ParsedCredit; keep in sync.

export type Confidence = 'high' | 'medium' | 'low'

export type CategoryKey =
  | 'ethics' | 'competence' | 'competencePrevention'
  | 'bias' | 'biasImplicit' | 'technology' | 'civility'

export type CategoryHours = Partial<Record<CategoryKey | 'general', number>>

// One extracted credit. Field shape matches M1 Credit (no id) plus per-field confidence.
export interface ParsedCredit {
  provider: string
  activityTitle: string
  completionDate: string   // ISO date, YYYY-MM-DD
  totalHours: number
  participatory: boolean
  categoryHours: CategoryHours
  confidence: {
    provider: Confidence
    activityTitle: Confidence
    completionDate: Confidence
    totalHours: Confidence
    participatory: Confidence
    categoryHours: Confidence
  }
}
```

- [ ] **Step 2: Add the same `ParsedCredit` type to the frontend domain types**

In `src/domain/types.ts`, add `Confidence` and `ParsedCredit` reusing the existing `CategoryKey`. Do not re-declare `CategoryKey` — import/extend the one already there:
```ts
export type Confidence = 'high' | 'medium' | 'low'

export interface ParsedCredit {
  provider: string
  activityTitle: string
  completionDate: string
  totalHours: number
  participatory: boolean
  categoryHours: Partial<Record<CategoryKey | 'general', number>>
  confidence: {
    provider: Confidence
    activityTitle: Confidence
    completionDate: Confidence
    totalHours: Confidence
    participatory: Confidence
    categoryHours: Confidence
  }
}
```

- [ ] **Step 3: Verify both compile**

Run: `cd "/Users/shrut/Documents/GitHub/CLE tracker/functions" && npx tsc --noEmit`
Run: `cd "/Users/shrut/Documents/GitHub/CLE tracker" && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add functions/src/types.ts src/domain/types.ts
git commit -m "feat(domain): add ParsedCredit + Confidence types (functions + frontend)"
```

---

## Task 3: Content-block builder (mime type → document/image block)

**Files:**
- Create: `functions/src/contentBlock.ts`
- Test: `functions/src/__tests__/contentBlock.test.ts`

Pure helper: maps an uploaded `mimeType` + base64 to the correct Anthropic content block — a `document` block for `application/pdf`, an `image` block for `image/*` — and rejects unsupported types.

- [ ] **Step 1: Write the failing test**

```ts
// ABOUTME: Tests mime-type routing to Anthropic document vs image content blocks.
import { describe, it, expect } from 'vitest'
import { buildFileBlock } from '../contentBlock'

describe('buildFileBlock', () => {
  it('builds a base64 document block for a PDF', () => {
    const block = buildFileBlock('application/pdf', 'QUJD')
    expect(block).toEqual({
      type: 'document',
      source: { type: 'base64', media_type: 'application/pdf', data: 'QUJD' },
    })
  })
  it('builds a base64 image block for a PNG', () => {
    const block = buildFileBlock('image/png', 'QUJD')
    expect(block).toEqual({
      type: 'image',
      source: { type: 'base64', media_type: 'image/png', data: 'QUJD' },
    })
  })
  it('accepts jpeg/webp/gif images', () => {
    expect(buildFileBlock('image/jpeg', 'x').type).toBe('image')
    expect(buildFileBlock('image/webp', 'x').type).toBe('image')
  })
  it('throws on an unsupported mime type', () => {
    expect(() => buildFileBlock('text/plain', 'x')).toThrow()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "/Users/shrut/Documents/GitHub/CLE tracker/functions" && npm test -- contentBlock`
Expected: FAIL — `buildFileBlock` not found.

- [ ] **Step 3: Write minimal implementation**

```ts
// ABOUTME: Maps an uploaded file's mime type to an Anthropic content block.
// ABOUTME: PDF -> document block, image/* -> image block; nothing is persisted.
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] as const

export function buildFileBlock(mimeType: string, base64: string) {
  if (mimeType === 'application/pdf') {
    return { type: 'document', source: { type: 'base64', media_type: mimeType, data: base64 } } as const
  }
  if ((IMAGE_TYPES as readonly string[]).includes(mimeType)) {
    return { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64 } } as const
  }
  throw new Error(`Unsupported certificate type: ${mimeType}`)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd "/Users/shrut/Documents/GitHub/CLE tracker/functions" && npm test -- contentBlock`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add functions/src/contentBlock.ts functions/src/__tests__/contentBlock.test.ts
git commit -m "feat(functions): content-block builder for PDF/image uploads"
```

---

## Task 4: Prompt shaping + extraction schema

**Files:**
- Create: `functions/src/prompt.ts`
- Test: `functions/src/__tests__/prompt.test.ts`

Pure helpers: a stable `SYSTEM_PROMPT` describing the extraction task and the exact category keys, a `PARSED_CREDIT_SCHEMA` (JSON schema used for the request's structured-output format), and `buildMessages(fileBlock)` assembling the user turn (file block + instruction text).

- [ ] **Step 1: Write the failing test**

```ts
// ABOUTME: Tests the prompt/schema shaping used to request structured extraction.
import { describe, it, expect } from 'vitest'
import { SYSTEM_PROMPT, PARSED_CREDIT_SCHEMA, buildMessages } from '../prompt'

describe('prompt shaping', () => {
  it('system prompt names every category key and the confidence scale', () => {
    for (const key of ['ethics', 'competence', 'competencePrevention', 'bias', 'biasImplicit', 'technology', 'civility', 'general']) {
      expect(SYSTEM_PROMPT).toContain(key)
    }
    expect(SYSTEM_PROMPT).toMatch(/high|medium|low/)
  })

  it('schema requires the ParsedCredit top-level fields and forbids extras', () => {
    expect(PARSED_CREDIT_SCHEMA.type).toBe('object')
    expect(PARSED_CREDIT_SCHEMA.additionalProperties).toBe(false)
    expect(PARSED_CREDIT_SCHEMA.required).toEqual(
      expect.arrayContaining(['provider', 'activityTitle', 'completionDate', 'totalHours', 'participatory', 'categoryHours', 'confidence']),
    )
  })

  it('buildMessages puts the file block before the instruction text in a single user turn', () => {
    const fileBlock = { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: 'x' } }
    const messages = buildMessages(fileBlock as never)
    expect(messages).toHaveLength(1)
    expect(messages[0].role).toBe('user')
    expect(messages[0].content[0]).toBe(fileBlock)
    expect(messages[0].content[1].type).toBe('text')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "/Users/shrut/Documents/GitHub/CLE tracker/functions" && npm test -- prompt`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
// ABOUTME: Stable system prompt, JSON schema, and message assembly for extraction.
// ABOUTME: Pure — no I/O; keeps prompt/schema deterministic for prompt caching.
export const SYSTEM_PROMPT = `You extract California MCLE credit data from a single certificate of completion.
Return ONLY the structured fields requested. Use these category keys for categoryHours (hours only, omit a key if zero):
- ethics, competence, competencePrevention (>=1hr substance-use/mental-health subset of competence),
- bias, biasImplicit (implicit-bias subset of bias), technology, civility, general (uncategorized hours).
completionDate must be an ISO date (YYYY-MM-DD). participatory is true unless the certificate says self-study/on-demand.
For every field, also report a confidence of "high", "medium", or "low" — use "low" when the certificate is ambiguous or unreadable for that field (participatory is often low). Do not guess silently; low confidence is expected and useful.`

const CONFIDENCE = { type: 'string', enum: ['high', 'medium', 'low'] } as const

export const PARSED_CREDIT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['provider', 'activityTitle', 'completionDate', 'totalHours', 'participatory', 'categoryHours', 'confidence'],
  properties: {
    provider: { type: 'string' },
    activityTitle: { type: 'string' },
    completionDate: { type: 'string' },
    totalHours: { type: 'number' },
    participatory: { type: 'boolean' },
    categoryHours: {
      type: 'object',
      additionalProperties: false,
      properties: {
        ethics: { type: 'number' }, competence: { type: 'number' }, competencePrevention: { type: 'number' },
        bias: { type: 'number' }, biasImplicit: { type: 'number' }, technology: { type: 'number' },
        civility: { type: 'number' }, general: { type: 'number' },
      },
    },
    confidence: {
      type: 'object',
      additionalProperties: false,
      required: ['provider', 'activityTitle', 'completionDate', 'totalHours', 'participatory', 'categoryHours'],
      properties: {
        provider: CONFIDENCE, activityTitle: CONFIDENCE, completionDate: CONFIDENCE,
        totalHours: CONFIDENCE, participatory: CONFIDENCE, categoryHours: CONFIDENCE,
      },
    },
  },
} as const

export function buildMessages(fileBlock: unknown) {
  return [
    {
      role: 'user' as const,
      content: [
        fileBlock,
        { type: 'text', text: 'Extract the MCLE credit from this certificate.' },
      ],
    },
  ]
}
```

> Verify at build time that `output_config.format` accepts this schema shape on the chosen model (structured outputs disallow numeric/length constraints — this schema uses none).

- [ ] **Step 4: Run test to verify it passes**

Run: `cd "/Users/shrut/Documents/GitHub/CLE tracker/functions" && npm test -- prompt`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add functions/src/prompt.ts functions/src/__tests__/prompt.test.ts
git commit -m "feat(functions): extraction system prompt, JSON schema, and message assembly"
```

---

## Task 5: validateParsedCredit (schema validation)

**Files:**
- Create: `functions/src/parsedCreditSchema.ts`
- Test: `functions/src/__tests__/parsedCreditSchema.test.ts`

Pure runtime validator: takes the model's parsed JSON and returns a typed `ParsedCredit`, throwing on anything malformed. This is the belt-and-suspenders guard behind structured outputs and the unit-testable "validate against a schema" piece.

- [ ] **Step 1: Write the failing test**

```ts
// ABOUTME: Tests runtime validation of the model's JSON into a typed ParsedCredit.
import { describe, it, expect } from 'vitest'
import { validateParsedCredit } from '../parsedCreditSchema'

const valid = {
  provider: 'Practising Law Institute',
  activityTitle: 'AI and the Practice of Law',
  completionDate: '2026-06-18',
  totalHours: 1.5,
  participatory: true,
  categoryHours: { technology: 1, general: 0.5 },
  confidence: {
    provider: 'high', activityTitle: 'high', completionDate: 'high',
    totalHours: 'high', participatory: 'low', categoryHours: 'medium',
  },
}

describe('validateParsedCredit', () => {
  it('returns a typed ParsedCredit for well-formed input', () => {
    const result = validateParsedCredit(valid)
    expect(result.provider).toBe('Practising Law Institute')
    expect(result.categoryHours.technology).toBe(1)
    expect(result.confidence.participatory).toBe('low')
  })
  it('throws when a required field is missing', () => {
    const { totalHours, ...missing } = valid
    expect(() => validateParsedCredit(missing)).toThrow()
  })
  it('throws on a bad confidence value', () => {
    expect(() => validateParsedCredit({ ...valid, confidence: { ...valid.confidence, provider: 'certain' } })).toThrow()
  })
  it('throws on an unknown category key', () => {
    expect(() => validateParsedCredit({ ...valid, categoryHours: { golf: 2 } })).toThrow()
  })
  it('throws on a non-string / non-parsed input', () => {
    expect(() => validateParsedCredit(null)).toThrow()
    expect(() => validateParsedCredit('{"x":1}')).toThrow()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "/Users/shrut/Documents/GitHub/CLE tracker/functions" && npm test -- parsedCreditSchema`
Expected: FAIL — `validateParsedCredit` not found.

- [ ] **Step 3: Write minimal implementation**

```ts
// ABOUTME: Runtime validation of extracted JSON into a typed ParsedCredit.
// ABOUTME: Pure — throws on anything the model returned that doesn't match the schema.
import type { ParsedCredit, Confidence, CategoryKey } from './types'

const CONFIDENCES: Confidence[] = ['high', 'medium', 'low']
const CATEGORY_KEYS: (CategoryKey | 'general')[] = [
  'ethics', 'competence', 'competencePrevention', 'bias', 'biasImplicit', 'technology', 'civility', 'general',
]
const CONF_FIELDS = ['provider', 'activityTitle', 'completionDate', 'totalHours', 'participatory', 'categoryHours'] as const

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}
function isConf(v: unknown): v is Confidence {
  return typeof v === 'string' && (CONFIDENCES as string[]).includes(v)
}

export function validateParsedCredit(input: unknown): ParsedCredit {
  if (!isObj(input)) throw new Error('ParsedCredit: not an object')
  const { provider, activityTitle, completionDate, totalHours, participatory, categoryHours, confidence } = input

  if (typeof provider !== 'string') throw new Error('ParsedCredit.provider must be a string')
  if (typeof activityTitle !== 'string') throw new Error('ParsedCredit.activityTitle must be a string')
  if (typeof completionDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(completionDate))
    throw new Error('ParsedCredit.completionDate must be YYYY-MM-DD')
  if (typeof totalHours !== 'number' || Number.isNaN(totalHours)) throw new Error('ParsedCredit.totalHours must be a number')
  if (typeof participatory !== 'boolean') throw new Error('ParsedCredit.participatory must be a boolean')

  if (!isObj(categoryHours)) throw new Error('ParsedCredit.categoryHours must be an object')
  for (const [k, v] of Object.entries(categoryHours)) {
    if (!(CATEGORY_KEYS as string[]).includes(k)) throw new Error(`ParsedCredit.categoryHours: unknown key ${k}`)
    if (typeof v !== 'number') throw new Error(`ParsedCredit.categoryHours.${k} must be a number`)
  }

  if (!isObj(confidence)) throw new Error('ParsedCredit.confidence must be an object')
  for (const f of CONF_FIELDS) {
    if (!isConf(confidence[f])) throw new Error(`ParsedCredit.confidence.${f} must be high|medium|low`)
  }

  return input as unknown as ParsedCredit
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd "/Users/shrut/Documents/GitHub/CLE tracker/functions" && npm test -- parsedCreditSchema`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add functions/src/parsedCreditSchema.ts functions/src/__tests__/parsedCreditSchema.test.ts
git commit -m "feat(functions): runtime ParsedCredit validation"
```

---

## Task 6: extractParsedCredit + parseCertificate callable

**Files:**
- Create: `functions/src/extract.ts`
- Modify: `functions/src/index.ts`

`extractParsedCredit(client, { fileBase64, mimeType })` is the thin orchestration: build the content block, assemble messages, call the Anthropic Messages API requesting structured output, parse the text block, and `validateParsedCredit` it. The callable `parseCertificate` reads the secret, constructs the client, and delegates — it holds the file only in memory and never writes it anywhere. There is **no unit test with a fake client here** — the helpers are already covered, and the real behavior is exercised end-to-end in Task 7 (the spec forbids mocking the parser).

> **Load the `claude-api` skill and verify the SDK surface before writing this.** Model `claude-opus-4-8`; `client.messages.create` with `output_config: { format: { type: 'json_schema', schema: PARSED_CREDIT_SCHEMA } }`; read the first `text` block, `JSON.parse`, then validate. Confirm the exact parameter names against the installed `@anthropic-ai/sdk`.

- [ ] **Step 1: Write extractParsedCredit**

```ts
// ABOUTME: Thin Anthropic orchestration: certificate bytes -> validated ParsedCredit.
// ABOUTME: Holds the file in memory only; nothing is persisted.
import type Anthropic from '@anthropic-ai/sdk'
import { buildFileBlock } from './contentBlock'
import { SYSTEM_PROMPT, PARSED_CREDIT_SCHEMA, buildMessages } from './prompt'
import { validateParsedCredit } from './parsedCreditSchema'
import type { ParsedCredit } from './types'

export interface ExtractInput { fileBase64: string; mimeType: string }

export async function extractParsedCredit(client: Anthropic, input: ExtractInput): Promise<ParsedCredit> {
  const fileBlock = buildFileBlock(input.mimeType, input.fileBase64)
  const response = await client.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: buildMessages(fileBlock) as never,
    output_config: { format: { type: 'json_schema', schema: PARSED_CREDIT_SCHEMA } } as never,
  })
  const text = response.content.find((b) => b.type === 'text')
  if (!text || text.type !== 'text') throw new Error('parseCertificate: model returned no text block')
  return validateParsedCredit(JSON.parse(text.text))
}
```

- [ ] **Step 2: Write the callable wrapper**

`functions/src/index.ts`:
```ts
// ABOUTME: Cloud Functions entry point — the parseCertificate callable.
// ABOUTME: Reads the API key from a secret; never persists the uploaded file.
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { defineSecret } from 'firebase-functions/params'
import Anthropic from '@anthropic-ai/sdk'
import { extractParsedCredit } from './extract'

const ANTHROPIC_API_KEY = defineSecret('ANTHROPIC_API_KEY')

export const parseCertificate = onCall(
  { secrets: [ANTHROPIC_API_KEY], memory: '512MiB', timeoutSeconds: 120 },
  async (request) => {
    const { fileBase64, mimeType } = (request.data ?? {}) as { fileBase64?: string; mimeType?: string }
    if (!fileBase64 || !mimeType) throw new HttpsError('invalid-argument', 'fileBase64 and mimeType are required')

    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() })
    try {
      return await extractParsedCredit(client, { fileBase64, mimeType })
    } catch (err) {
      // Surface an unreadable/parse failure so the client can fall back to manual entry.
      throw new HttpsError('failed-precondition', 'Could not read this certificate', String(err))
    }
  },
)
```

> The file bytes exist only in `request.data` and the local `fileBase64` for the request's lifetime. Do **not** add any `firebase-admin` Storage or Firestore write here.

- [ ] **Step 3: Verify it compiles**

Run: `cd "/Users/shrut/Documents/GitHub/CLE tracker/functions" && npm run build`
Expected: no errors. (Adjust `as never` casts only if the real SDK types require it — verify against the installed SDK.)

- [ ] **Step 4: Commit**

```bash
git add functions/src/extract.ts functions/src/index.ts
git commit -m "feat(functions): parseCertificate callable + Anthropic extraction orchestration"
```

---

## Task 7: End-to-end test with a real certificate (no mocks)

**Files:**
- Create: `functions/src/__tests__/extract.e2e.test.ts`
- Add (by hand): `functions/src/__tests__/fixtures/sample-certificate.pdf` — a **real** MCLE certificate of completion

Per the spec's testing strategy, the parser is tested against a real sample certificate with the real API — no mocked parser behavior. The test is gated on `ANTHROPIC_API_KEY` being present in the environment so it does not run (or fail) without credentials.

- [ ] **Step 1: Add a real sample certificate**

Place a genuine MCLE certificate PDF at `functions/src/__tests__/fixtures/sample-certificate.pdf` (e.g. a PLI or Bar-association certificate). This file is test-only input, not something the app stores.

- [ ] **Step 2: Write the end-to-end test**

```ts
// ABOUTME: Real end-to-end parse of a real sample certificate via the real API.
// ABOUTME: No mocks (spec requirement); skipped when ANTHROPIC_API_KEY is unset.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import Anthropic from '@anthropic-ai/sdk'
import { extractParsedCredit } from '../extract'

const here = dirname(fileURLToPath(import.meta.url))
const hasKey = !!process.env.ANTHROPIC_API_KEY

describe.skipIf(!hasKey)('extractParsedCredit (real API)', () => {
  it('extracts structured credit data from a real certificate', async () => {
    const pdf = readFileSync(join(here, 'fixtures', 'sample-certificate.pdf'))
    const client = new Anthropic() // reads ANTHROPIC_API_KEY from env
    const result = await extractParsedCredit(client, {
      fileBase64: pdf.toString('base64'),
      mimeType: 'application/pdf',
    })
    expect(result.provider.length).toBeGreaterThan(0)
    expect(result.activityTitle.length).toBeGreaterThan(0)
    expect(result.completionDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(result.totalHours).toBeGreaterThan(0)
    expect(typeof result.participatory).toBe('boolean')
    expect(['high', 'medium', 'low']).toContain(result.confidence.totalHours)
  }, 60_000)
})
```

- [ ] **Step 3: Run the test with a key**

Run: `cd "/Users/shrut/Documents/GitHub/CLE tracker/functions" && ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY npm test -- extract.e2e`
Expected: PASS with a key present; the suite is **skipped** (still exit 0) when the key is unset. Use the @superpowers:verification-before-completion skill to confirm the assertions actually ran against the real certificate.

- [ ] **Step 4: Commit**

```bash
git add functions/src/__tests__/extract.e2e.test.ts functions/src/__tests__/fixtures/sample-certificate.pdf
git commit -m "test(functions): real end-to-end parse of a real sample certificate"
```

---

## Task 8: Frontend Firebase client + fileToBase64

**Files:**
- Modify: `src/firebase.ts` (add the Functions export — assumes M2 initialized the app)
- Create: `src/parsing/fileToBase64.ts`
- Test: `src/parsing/__tests__/fileToBase64.test.ts`

`fileToBase64` reads a browser `File` into `{ fileBase64, mimeType }` (base64 without the `data:` prefix) for upload to the callable.

- [ ] **Step 1: Add the Functions export to the Firebase client**

In `src/firebase.ts` (reuse the existing `app` from M2):
```ts
import { getFunctions } from 'firebase/functions'
// ...existing app init...
export const functions = getFunctions(app)
```

- [ ] **Step 2: Write the failing test**

```tsx
// ABOUTME: Verifies a browser File is read into base64 + mime type for upload.
import { describe, it, expect } from 'vitest'
import { fileToBase64 } from '../fileToBase64'

describe('fileToBase64', () => {
  it('returns base64 (no data: prefix) and the mime type', async () => {
    const file = new File([new Uint8Array([65, 66, 67])], 'cert.pdf', { type: 'application/pdf' })
    const result = await fileToBase64(file)
    expect(result.mimeType).toBe('application/pdf')
    expect(result.fileBase64).toBe('QUJD') // base64 of "ABC"
    expect(result.fileBase64).not.toContain(',')
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd "/Users/shrut/Documents/GitHub/CLE tracker" && npm test -- fileToBase64`
Expected: FAIL — `fileToBase64` not found.

- [ ] **Step 4: Write minimal implementation**

```ts
// ABOUTME: Reads a browser File into { fileBase64, mimeType } for the parse call.
// ABOUTME: Strips the data: URL prefix; the file itself is never stored anywhere.
export interface UploadPayload { fileBase64: string; mimeType: string }

export function fileToBase64(file: File): Promise<UploadPayload> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error ?? new Error('file read failed'))
    reader.onload = () => {
      const result = String(reader.result)
      const comma = result.indexOf(',')
      resolve({ fileBase64: comma >= 0 ? result.slice(comma + 1) : result, mimeType: file.type })
    }
    reader.readAsDataURL(file)
  })
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd "/Users/shrut/Documents/GitHub/CLE tracker" && npm test -- fileToBase64`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/firebase.ts src/parsing/fileToBase64.ts src/parsing/__tests__/fileToBase64.test.ts
git commit -m "feat(parsing): Firebase Functions client + fileToBase64 helper"
```

---

## Task 9: ParsedCredit → Confirm initial state (+ low-confidence flags)

**Files:**
- Create: `src/parsing/parsedCreditToConfirmState.ts`
- Test: `src/parsing/__tests__/parsedCreditToConfirmState.test.ts`

Pure mapping from a `ParsedCredit` into the initial state the M2 Confirm screen already consumes — the M1 `Credit` fields (minus `id`) plus the set of field names whose confidence is `low`, so the Confirm screen can actively flag them (e.g. Participatory "couldn't read — please confirm").

> Verify the exact prop shape the M2 Confirm screen expects; the interface below is the integration contract — adjust field names to match M2 if they differ.

- [ ] **Step 1: Write the failing test**

```ts
// ABOUTME: Tests mapping ParsedCredit into M2 Confirm-screen initial state.
import { describe, it, expect } from 'vitest'
import { parsedCreditToConfirmState } from '../parsedCreditToConfirmState'
import type { ParsedCredit } from '../../domain/types'

const parsed: ParsedCredit = {
  provider: 'Practising Law Institute',
  activityTitle: 'AI and the Practice of Law',
  completionDate: '2026-06-18',
  totalHours: 1.5,
  participatory: true,
  categoryHours: { technology: 1, general: 0.5 },
  confidence: {
    provider: 'high', activityTitle: 'high', completionDate: 'high',
    totalHours: 'high', participatory: 'low', categoryHours: 'medium',
  },
}

describe('parsedCreditToConfirmState', () => {
  it('copies the credit fields (no id) into the initial draft', () => {
    const state = parsedCreditToConfirmState(parsed)
    expect(state.draft).toMatchObject({
      provider: 'Practising Law Institute',
      activityTitle: 'AI and the Practice of Law',
      completionDate: '2026-06-18',
      totalHours: 1.5,
      participatory: true,
      categoryHours: { technology: 1, general: 0.5 },
    })
    expect('id' in state.draft).toBe(false)
  })
  it('flags only the low-confidence fields', () => {
    const state = parsedCreditToConfirmState(parsed)
    expect(state.lowConfidenceFields).toEqual(['participatory'])
  })
  it('flags nothing for an all-high-confidence parse', () => {
    const allHigh = { ...parsed, confidence: { ...parsed.confidence, participatory: 'high' as const } }
    expect(parsedCreditToConfirmState(allHigh).lowConfidenceFields).toEqual([])
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "/Users/shrut/Documents/GitHub/CLE tracker" && npm test -- parsedCreditToConfirmState`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
// ABOUTME: Maps a ParsedCredit into the M2 Confirm-screen initial state.
// ABOUTME: Pure — surfaces low-confidence fields so the Confirm screen can flag them.
import type { ParsedCredit } from '../domain/types'

export type ConfirmDraft = Omit<ParsedCredit, 'confidence'>

export interface ConfirmState {
  draft: ConfirmDraft
  lowConfidenceFields: (keyof ParsedCredit['confidence'])[]
}

export function parsedCreditToConfirmState(parsed: ParsedCredit): ConfirmState {
  const { confidence, ...draft } = parsed
  const lowConfidenceFields = (Object.keys(confidence) as (keyof ParsedCredit['confidence'])[])
    .filter((k) => confidence[k] === 'low')
  return { draft, lowConfidenceFields }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd "/Users/shrut/Documents/GitHub/CLE tracker" && npm test -- parsedCreditToConfirmState`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/parsing/parsedCreditToConfirmState.ts src/parsing/__tests__/parsedCreditToConfirmState.test.ts
git commit -m "feat(parsing): map ParsedCredit to Confirm state with low-confidence flags"
```

---

## Task 10: AddCertificate screen (upload → Confirm / manual fallback)

**Files:**
- Create: `src/parsing/parseCertificate.ts` (client-side callable wrapper)
- Create: `src/ui/AddCertificate.tsx`
- Test: `src/ui/__tests__/AddCertificate.test.tsx`

The Add screen renders a file input accepting `application/pdf,image/*` with `capture` (so mobile offers Take Photo / Photo Library / Files, per the spec), uploads the chosen file to the callable, and calls `onParsed(confirmState)` on success or `onManual(message)` on parse failure / unreadable file. Component tests may mock the callable wrapper (the no-mock rule applies only to the parser e2e test in Task 7).

- [ ] **Step 1: Write the client-side callable wrapper**

```ts
// ABOUTME: Client wrapper over the parseCertificate callable.
// ABOUTME: Sends base64 + mime type; returns a validated ParsedCredit.
import { httpsCallable } from 'firebase/functions'
import { functions } from '../firebase'
import type { ParsedCredit } from '../domain/types'
import type { UploadPayload } from './fileToBase64'

const callable = httpsCallable<UploadPayload, ParsedCredit>(functions, 'parseCertificate')

export async function parseCertificate(payload: UploadPayload): Promise<ParsedCredit> {
  const { data } = await callable(payload)
  return data
}
```

- [ ] **Step 2: Write the failing test**

```tsx
// ABOUTME: Verifies AddCertificate uploads, routes to Confirm, and falls back on failure.
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { AddCertificate } from '../AddCertificate'

vi.mock('../../parsing/parseCertificate', () => ({ parseCertificate: vi.fn() }))
vi.mock('../../parsing/fileToBase64', () => ({
  fileToBase64: vi.fn(async () => ({ fileBase64: 'QUJD', mimeType: 'application/pdf' })),
}))
import { parseCertificate } from '../../parsing/parseCertificate'

const parsed = {
  provider: 'PLI', activityTitle: 'AI Law', completionDate: '2026-06-18',
  totalHours: 1.5, participatory: true, categoryHours: { technology: 1 },
  confidence: { provider: 'high', activityTitle: 'high', completionDate: 'high', totalHours: 'high', participatory: 'low', categoryHours: 'high' },
}

function pickFile() {
  const input = screen.getByLabelText(/certificate/i) as HTMLInputElement
  const file = new File([new Uint8Array([65, 66, 67])], 'cert.pdf', { type: 'application/pdf' })
  fireEvent.change(input, { target: { files: [file] } })
}

it('accepts pdf and images and offers device capture', () => {
  render(<AddCertificate onParsed={vi.fn()} onManual={vi.fn()} />)
  const input = screen.getByLabelText(/certificate/i) as HTMLInputElement
  expect(input.accept).toBe('application/pdf,image/*')
  expect(input.hasAttribute('capture')).toBe(true)
})

it('routes a successful parse into Confirm state with low-confidence flags', async () => {
  ;(parseCertificate as ReturnType<typeof vi.fn>).mockResolvedValue(parsed)
  const onParsed = vi.fn()
  render(<AddCertificate onParsed={onParsed} onManual={vi.fn()} />)
  pickFile()
  await waitFor(() => expect(onParsed).toHaveBeenCalled())
  expect(onParsed.mock.calls[0][0].lowConfidenceFields).toEqual(['participatory'])
})

it('falls back to manual entry with a message on parse failure', async () => {
  ;(parseCertificate as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('unreadable'))
  const onManual = vi.fn()
  render(<AddCertificate onParsed={vi.fn()} onManual={onManual} />)
  pickFile()
  await waitFor(() => expect(onManual).toHaveBeenCalled())
  expect(onManual.mock.calls[0][0]).toMatch(/couldn.?t read|enter.*manually/i)
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd "/Users/shrut/Documents/GitHub/CLE tracker" && npm test -- AddCertificate`
Expected: FAIL — `AddCertificate` not found.

- [ ] **Step 4: Implement AddCertificate**

```tsx
// ABOUTME: Add screen — capture a certificate, parse it, route to Confirm or manual entry.
// ABOUTME: Uploads base64 to the parseCertificate callable; the file is never stored.
import { useState } from 'react'
import { fileToBase64 } from '../parsing/fileToBase64'
import { parseCertificate } from '../parsing/parseCertificate'
import { parsedCreditToConfirmState, type ConfirmState } from '../parsing/parsedCreditToConfirmState'

interface Props {
  onParsed: (state: ConfirmState) => void
  onManual: (message: string) => void
}

export function AddCertificate({ onParsed, onManual }: Props) {
  const [busy, setBusy] = useState(false)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true)
    try {
      const payload = await fileToBase64(file)
      const parsed = await parseCertificate(payload)
      onParsed(parsedCreditToConfirmState(parsed))
    } catch {
      onManual("We couldn't read that certificate. Enter the details manually.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="wrap">
      <h1 className="h1">Add a certificate</h1>
      <label className="btn" htmlFor="cert-input">Add certificate</label>
      <input
        id="cert-input"
        aria-label="Certificate"
        type="file"
        accept="application/pdf,image/*"
        capture="environment"
        onChange={handleFile}
        disabled={busy}
        hidden
      />
      <button className="link" onClick={() => onManual('')}>Enter manually instead</button>
      {busy && <div className="note">Reading the certificate…</div>}
    </div>
  )
}
```

> Port the exact Add-screen classes/markup from `mockups.html#s-add` where they differ; keep the file input `accept`/`capture` attributes as written.

- [ ] **Step 5: Run test to verify it passes**

Run: `cd "/Users/shrut/Documents/GitHub/CLE tracker" && npm test -- AddCertificate`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add src/parsing/parseCertificate.ts src/ui/AddCertificate.tsx src/ui/__tests__/AddCertificate.test.tsx
git commit -m "feat(ui): Add screen — capture, parse, route to Confirm or manual entry"
```

---

## Task 11: Wire Add → Confirm into the app + verify

**Files:**
- Modify: `src/App.tsx` (add the `'add'` screen state and route its outputs into the M2 Confirm screen)

- [ ] **Step 1: Wire the flow**

Add an `'add'` screen. From the dashboard's "Add a certificate" action, show `<AddCertificate>`. On `onParsed(state)`, show the M2 Confirm screen seeded with `state.draft` and `state.lowConfidenceFields`. On `onManual(message)`, show the M2 Confirm screen blank with the message. Saving from Confirm writes the credit and returns to the dashboard (M2 behavior — do not reimplement it).

- [ ] **Step 2: Full suite**

Run: `cd "/Users/shrut/Documents/GitHub/CLE tracker" && npm test` — expect all frontend tests green.
Run: `cd "/Users/shrut/Documents/GitHub/CLE tracker/functions" && npm test` — expect all functions tests green (the e2e test skips without a key).

- [ ] **Step 3: Manual end-to-end check (emulator)**

```bash
cd "/Users/shrut/Documents/GitHub/CLE tracker/functions" && npm run build
cd "/Users/shrut/Documents/GitHub/CLE tracker" && ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY firebase emulators:start --only functions
```
In another shell, run the app (`npm run dev`), open Add, choose the sample certificate, and confirm the parsed values land on the Confirm screen with Participatory flagged, then that a bad/blank file falls back to manual entry. Use the @superpowers:verification-before-completion skill before claiming done.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wire Add -> Confirm certificate flow"
```

---

## Done criteria for Milestone 3

- `parseCertificate` accepts a base64 PDF or image, calls the Anthropic Messages API with a document/image block, and returns a schema-validated `ParsedCredit` with per-field confidence.
- The Anthropic API key comes only from a Cloud Functions secret; it never reaches the client.
- The certificate file is parsed in memory and never written to Firestore or Firebase Storage.
- Pure helpers (content-block, prompt/schema, validation) are unit-tested; the parser is proven end-to-end against a **real** sample certificate with the real API (no mocks), skipped only when no key is present.
- The Add screen captures a PDF/image (Take Photo / Photo Library / Files), routes a successful parse into the M2 Confirm screen with low-confidence fields flagged, and falls back to blank manual entry with a clear message on failure.
