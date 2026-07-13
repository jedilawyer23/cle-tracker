# Bulk Certificate Upload Implementation Plan

> **For agentic workers:** Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Let a user upload many certificates at once; parse and categorize each; review and save the batch — with a per-user daily parse cap (10 anonymous / 25 signed-in) and clear messaging.

**Architecture:** Reuse the existing single-cert pipeline (`parseCertificate` callable → `ParsedCredit` → `Credit`). The `Credit` model already carries multi-category hours, and `isDuplicateCredit` already exists — no model changes. Add a signed-in-vs-anonymous quota split server-side, a multi-file orchestration hook client-side, a batch review screen, and a dashboard sub-requirement catch. `.ics` export is out of scope for this plan.

**Tech Stack:** React 18 + TS + Vite + Vitest/RTL; Firebase Functions v2 (onCall), Firestore.

**Key facts (verified against the code):**
- Quota: `parseQuota/{uid}_{date}` → `{ count }`, atomic transaction. `resolveParseDailyLimit()` in `functions/src/parseQuota/config.ts` (currently 25). `enforceParseQuota(deps, uid, today, limit)` throws `HttpsError('resource-exhausted','DAILY_LIMIT')`.
- Sign-in signal server-side: `request.auth.token.firebase?.sign_in_provider` (`'anonymous'` vs `'google.com'`). Treat missing/unknown as anonymous (safer/cheaper).
- Client sign-in signal: `auth.currentUser.isAnonymous`; profile `accountState: 'guest' | 'linked'`.
- Single-cert flow: `AddSheet` / `AddCredit` file inputs → `useParseFile.parseFile` → `parseCertificate` callable → `App` sets `confirmSeed`, `setScreen('confirm')` → `CreditForm` → `handleSaveCredit` (dedup via `isDuplicateCredit(c, credits)`) → `add(c)` (mints `crypto.randomUUID()`).
- Dedup: `isDuplicateCredit(candidate, existing: Credit[])` in `src/domain/creditSignature.ts`.
- Dashboard gaps: `buildDashboardRows(result, credits)` in `src/ui/dashboardRows.ts` (parents with `children: RequirementProgress[]`, each with `remaining`); rendered by `Dashboard.tsx` → `RequirementsList` → `BarRow`.
- `response.usage` is not read anywhere today.

---

### Task 1: Quota split by sign-in provider

**Files:**
- Modify: `functions/src/parseQuota/config.ts`
- Modify: `functions/src/index.ts:42-44` (the parse-quota call)
- Test: `functions/src/__tests__/resolveParseDailyLimit.test.ts`, `functions/src/__tests__/index.test.ts`

Anonymous users get 10/day, signed-in (any non-anonymous provider) get 25/day. Env override `PARSE_DAILY_LIMIT`, if set, applies to both (keeps the existing escape hatch).

- [ ] Write failing test: `resolveParseDailyLimit(env, isAnonymous)` returns 10 when `isAnonymous` true, 25 when false, and the env override when `PARSE_DAILY_LIMIT` is set (either case).
- [ ] Implement: `ANONYMOUS_PARSE_DAILY_LIMIT = 10`, `AUTHENTICATED_PARSE_DAILY_LIMIT = 25`; `resolveParseDailyLimit(env, isAnonymous)` returns env override if present, else the branch by `isAnonymous`. Keep `DEFAULT_PARSE_DAILY_LIMIT` as an alias for the authenticated value if referenced elsewhere.
- [ ] Write failing test in `index.test.ts`: an anonymous token (`sign_in_provider: 'anonymous'`) enforces limit 10; a `google.com` token enforces 25. (Assert the `limit` passed into a stubbed `enforceParseQuota`, following the existing stub pattern.)
- [ ] Implement in `index.ts`: `const isAnonymous = request.auth.token.firebase?.sign_in_provider !== 'google.com'` (unknown ⇒ anonymous), pass `resolveParseDailyLimit(process.env, isAnonymous)`.
- [ ] Run functions tests green. Commit.

### Task 2: Read-only parse-quota callable + usage logging

**Files:**
- Modify: `functions/src/parseQuota/firestoreDeps.ts` (add `getCount`), `functions/src/parseQuota/enforceParseQuota.ts` (export a `ParseQuotaReadDeps` or extend deps), `functions/src/index.ts`, `functions/src/extract.ts` (return `usage`)
- Create: client `src/parsing/getParseQuota.ts`
- Test: new `functions/src/__tests__/getParseQuota.test.ts`, extend `extract.test.ts`

Add a `getParseQuota` callable returning `{ used, limit, remaining }` for today (NO increment), so the bulk UI can show "X left today". Log each parse's token usage to `usage_logs` for real cost data.

- [ ] Test + implement `getCount(key)` dep (reads `parseQuota/{key}.count`, 0 if absent).
- [ ] Test + implement `getParseQuota` callable: requires auth; `isAnonymous` as in Task 1; `used = getCount(uid_today)`, `limit = resolveParseDailyLimit(...)`, `remaining = max(0, limit-used)`.
- [ ] Test + implement: `extractParsedCredit` returns `{ parsed, usage: { inputTokens, outputTokens } }` (extend the `MessagesClient` type to include `usage`). Keep `parseCertificate`'s response shape unchanged for the client (return `parsed`).
- [ ] Implement in `index.ts`: after a successful extract, `logger.info` + write `usage_logs/{auto}` `{ uid, date, model, inputTokens, outputTokens, createdAt: serverTimestamp() }`. Never let a logging failure fail the parse (wrap in try/catch).
- [ ] Client `getParseQuota.ts`: `httpsCallable` wrapper returning `{ used, limit, remaining }`.
- [ ] Tests green. Commit.

### Task 3: Multi-file parse orchestration hook

**Files:**
- Create: `src/parsing/useBulkParse.ts`, `src/parsing/bulkParseTypes.ts`
- Test: `src/parsing/__tests__/useBulkParse.test.tsx`

Given `File[]`, parse each SEQUENTIALLY through the existing `parseCertificate` path, tracking per-file status. Stop early when the daily limit is hit and mark the remainder.

- [ ] Define `BulkItem = { id, fileName, status: 'pending'|'parsing'|'parsed'|'skipped'|'error'|'limit', parsed?: ParsedCredit, error?: string }`.
- [ ] Write failing test (mock the parse fn): 3 files → 2 parse, 1 throws `NotACleCertificateError` ⇒ that one is `skipped`; a `DailyLimitReachedError` mid-batch ⇒ that file and all AFTER it become `limit` and no further parse calls happen.
- [ ] Implement `useBulkParse` iterating files, updating item state, honoring the stop-on-limit rule. Reuse `fileToBase64` + `parseCertificate` + the existing typed errors.
- [ ] Tests green. Commit.

### Task 4: Multi-file input + routing

**Files:**
- Modify: `src/ui/AddSheet.tsx` (add `multiple`, pass `File[]`), `src/App.tsx` (route by count)
- Test: `src/ui/__tests__/AddSheet.test.tsx`, `src/App` screen-routing test

- [ ] Test + implement: the file-upload input gets `multiple`; `handleChange` passes ALL selected files. Camera input stays single. `onFiles(files: File[])`.
- [ ] Test + implement App routing: 1 file ⇒ existing single confirm flow (unchanged); >1 file ⇒ new `setScreen('batch')` with the files handed to the batch screen. Keep `onFile` single path working.
- [ ] Tests green. Commit.

### Task 5: Batch review screen

**Files:**
- Create: `src/ui/BatchReview.tsx`
- Modify: `src/App.tsx` (render `batch` screen; batch save), `src/domain/creditSignature.ts` (batch dedup helper if needed)
- Test: `src/ui/__tests__/BatchReview.test.tsx`

- [ ] Test + implement: renders one editable row per file. Parsed rows show provider/title/date/hours + category chips and are editable (reuse `CreditForm` or a compact editor). `skipped`/`error`/`limit` files are listed in a clearly-separated section, each with a "Enter manually" / "retry" affordance (rescuable, not silently dropped).
- [ ] Test + implement quota message: "Free accounts scan up to 10 certificates a day, N left today" driven by `getParseQuota` (+ local decrement as items parse); friendly stop when items hit `limit`: "Your progress is saved — add the rest tomorrow."
- [ ] Test + implement "Save all": dedup within the batch AND against existing credits (`isDuplicateCredit` / signatures); duplicates are flagged in the row (not saved twice); saves the rest via `add`, returns to dashboard.
- [ ] Tests green. Commit.

### Task 6: Dashboard sub-requirement catch

**Files:**
- Modify: `src/ui/dashboardRows.ts` and/or `src/ui/Dashboard.tsx`
- Test: `src/ui/__tests__/dashboardRows.test.ts`, `Dashboard.test.tsx`

Surface the case where the 25 total is met but a small standalone/sub requirement is not (e.g. "You have the hours, but you're still missing 1 civility hour"), so it doesn't hide inside the list.

- [ ] Test + implement: a concise summary of the specific unmet small requirements when the total is otherwise met. Zero risk, copy-level.
- [ ] Tests green. Commit.

---

**After all tasks:** final code-reviewer pass over the whole feature, then finish the branch.
