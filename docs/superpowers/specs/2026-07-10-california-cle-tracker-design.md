# California CLE Tracker — Design

Status: Design locked 2026-07-10 (UI mockups approved; see `mockups.html`)
Date: 2026-07-10
Author: Shrut + Claude

## Problem

California attorneys must complete Minimum Continuing Legal Education (MCLE) on a
rolling three-year cycle and self-report compliance to the State Bar. Tracking
credits by hand across many certificates, in several required sub-categories,
with a deadline that depends on the attorney's last name, is error-prone. A
missed category or a miscounted hour can mean non-compliance.

This app lets an attorney upload a CLE certificate, have it parsed automatically,
review the extracted credits, and see live progress against every California MCLE
requirement — including whether they need to report this cycle and exactly which
categories still fall short.

## Goals

- Know the current California MCLE requirements and the user's personal deadline.
- Add a certificate by uploading a PDF, choosing an image, or taking a photo with
  the device camera; parse it, review, and log it.
- Track live progress per requirement, shown as a checklist of what's still needed
  vs. complete, with a plain-English compliance verdict.
- Let a user try the app with no account (guest), then save with Google when they choose.
- Remind the user by email as the deadline nears or when a category is short.
- Export a compliance report for the user's records or a State Bar audit.

## Non-goals (v1)

- Storing certificate files. Certificates are parsed in memory and discarded.
- Multi-state support. California only; the requirements model is built to be extended later.
- Provider-accreditation lookup (verifying a provider is State-Bar-approved).
- Team/firm accounts, admin dashboards, or billing.

## Verified domain rules

Verified 2026-07-10 against the State Bar of California. **These must be
re-verified against calbar.ca.gov at build time and reviewed periodically —
they change, and a wrong number is a compliance liability.** They live in data
(an effective-dated config), never hard-coded in logic.

### Requirement totals (per three-year compliance period)

| Requirement | Minimum hours | Notes |
|---|---|---|
| Total | 25 | |
| Participatory | 12.5 of the 25 | remainder may be self-study |
| Legal Ethics | 4 | counts toward the 25 |
| Competence | 2 | includes >= 1 hr Prevention & Detection (substance use / mental health) |
| Elimination of Bias | 2 | includes >= 1 hr implicit bias & bias-reducing strategies |
| Technology in the practice of law | 1 | |
| Civility in the legal profession | 1 | |

Sub-category hours are carved out of the 25 total, not added on top.

### Compliance groups (by last name; permanent)

Assigned at licensure by last name; never changes even if the name changes.

- Group 1: A-G
- Group 2: H-M
- Group 3: N-Z

Each group reports on a staggered three-year cycle. Example current windows:
Group 3 (N-Z) 2023-02-01 to 2026-03-29, report by 2026-03-30. Cycle dates roll
every three years and are maintained in the config.

### New admittees and proration

- Licensed under four months within the first compliance period: not required to report that period.
- Otherwise the 25-hour requirement (and sub-categories) is reduced proportionally
  by the number of full months the attorney was not licensed, inactive, or exempt
  during the period.

Onboarding derives proration for the mid-period-admission case from the admission
date automatically. Mid-period inactive/exempt spans (which onboarding does not
collect) are entered via the `proration override` field in v1 rather than computed;
the app does not model status history. When a user is not required to report this
cycle, the dashboard shows an explicit "not required to report this period" state
instead of a `reportBy` countdown, and reminders are suppressed for that user.

### Exemptions

Certain attorneys are fully exempt (for example some full-time government roles
and retired judges). v1 models an exemption flag and a proration override; it
does not attempt to encode every exemption rule.

## Architecture

Single-page web app on Firebase, matching the stack already in use.

- **Frontend:** React + Vite + Tailwind CSS. Apple/iOS aesthetic — inset-grouped
  lists on a system-gray canvas, large titles, SF system font, system colors,
  one blue accent, content-first with chrome that recedes.
- **Auth:** Firebase Authentication. Guests get an **anonymous** session; signing
  in with Google **links** that anonymous account, which preserves the same uid
  and all its data — so no manual guest→account data migration is needed.
- **Data:** Cloud Firestore.
- **Server:** Cloud Functions (Node) for certificate parsing, scheduled reminders,
  and report generation.
- **Hosting:** Firebase Hosting.
- **Parsing:** Claude (via a Cloud Function) reads the uploaded file and returns
  structured credit data. The file is held in memory for the duration of the
  request and never written to storage.

### Component boundaries

- `RequirementsConfig` — the effective-dated rule set plus the group cycle calendar. Data.
- `ComplianceCalculator` — pure function: (user, credits, config) -> per-category
  progress + overall verdict + days-to-deadline. No I/O. Heavily unit-tested.
- `CertificateParser` — Cloud Function wrapping Claude; input: file bytes; output:
  a validated `ParsedCredit`. No persistence.
- `CreditStore` — Firestore reads/writes for a user's credits.
- `Reminders` — scheduled Cloud Function that evaluates each user against the
  calculator and sends email when thresholds are crossed.
- `ReportBuilder` — renders a compliance summary to PDF on demand.
- UI views — Onboarding, Dashboard, Review/Confirm, Credit list, Settings.

The calculator is the heart of the system and is deliberately isolated from
Firebase so it can be tested with plain data.

## Accounts and guest mode

The app is guest-first: a new user can enter their name, add certificates, and use
the full tracker without signing in. Sign-in is a save/sync convenience, never a gate.

- A first-time visitor is signed in **anonymously** (Firebase Anonymous Auth) and
  gets a real uid; their profile and credits are written to Firestore under it.
- A quiet "Sign in to save" affordance sits top-right on guest screens.
- Choosing Google **links** the Google credential to the existing anonymous uid.
  The uid and all data persist unchanged; the account simply gains durable,
  cross-device identity. `accountState` flips guest -> linked.
- Guest sessions are tied to the browser instance; if the user clears the browser
  or switches devices before linking, the anonymous account (and its data) is lost.
  This is what the "Sign in to save" prompt guards against.

## Data model (Firestore)

- `users/{uid}`
  - name, lastName, `group` (derived from lastName), admissionDate
  - `accountState`: guest | linked
  - status: active | inactive, exemptions/proration overrides
  - computed `currentPeriod { start, end, reportBy }`
  - `requirementsVersion` used for this user's current period
- `users/{uid}/credits/{creditId}`
  - provider, activityTitle, completionDate
  - totalHours, participatory (bool)
  - category hours: { ethics, competence, competencePrevention, bias, biasImplicit, technology, civility, general }
  - source: parsed | manual
  - No certificate file. No file URL.
- `mcleRequirements/{version}`
  - effective-dated rule set (the totals table above)
  - group cycle calendar (period start/end/reportBy per group per cycle)

## Compliance computation

`ComplianceCalculator` takes the user, their credits, and the active config and returns:

- Per category: earned vs required, remaining.
- Total and participatory progress.
- Applied proration (if the user was not licensed/active the full period).
- Overall verdict: compliant | not yet compliant, with the specific shortfalls named.
- Days until `reportBy`, and whether reporting is due this cycle.

Rules encoded: sub-category hours also count toward the 25 total; participatory
floor of 12.5; the >= 1 hr sub-minimums inside Competence and Elimination of Bias;
proration scales every minimum by the licensed fraction of the period.

## Core flows

The app has one home surface — the Dashboard. First run happens once; Add is a
button; credit detail and sign-in hang off the Dashboard. No tab bar, no
three-way navigation.

### 1. First run (guest, no login)

The user enters their name (heading: "Get started"). From the last name the app
derives the compliance group, current period dates, reporting deadline, and the
full requirement, shown back immediately. An optional "admitted in the last 3
years?" toggle reveals a date field for proration; most users skip it. No account
is created — the user is an anonymous guest. Disclaimer shown.

### 2. Empty dashboard

Before any credit is logged, the Dashboard shows the full requirement under "Your
requirement" (every category at 0 of its minimum, plus Total and Participatory)
and one primary action, "Add a certificate."

### 3. Add credit (upload / photo / manual)

The user adds a certificate by choosing a PDF, choosing an image, or **taking a
photo with the device camera**. Implemented as a file input accepting
`application/pdf,image/*` with `capture` so mobile offers Take Photo / Photo
Library / Files. The file is sent to the parsing Cloud Function; Claude returns a
`ParsedCredit` (provider, title, completionDate, totalHours, participatory,
category hours, plus a per-field `confidence` of high | medium | low). The file is
discarded. Manual entry is the same Confirm screen opened blank — the fallback
when a parse fails or there is no certificate.

### 4. Confirm & save

The Confirm screen shows the parsed values (heading: "Confirm & save"). Fields
read confidently are shown quietly; `low`-confidence fields (e.g. participatory)
are the only ones that actively ask. Every field is editable. On save a `credit`
document is written and the dashboard updates.

### 5. Dashboard (populated)

A checklist, not a meter. The heading states the binding constraint ("4
requirements left"), never just the hours remainder. Two grouped lists: **Still
needed** (each open requirement with the remaining amount, e.g. "Competence +1 hr"
with its sub-minimum noted) over **Complete** (met requirements with a green
check and count). Total hours and Participatory appear as roll-up rows. Tapping a
category **expands inline** to reveal the CLEs that count toward it; tapping a CLE
opens its Credit screen. Days until `reportBy` and a persistent disclaimer.

### 6. Credit detail

A single CLE's view: provider, date, hours, participatory, and which requirements
it counts toward (one certificate can count toward more than one). Edit or remove.

### 7. Save (guest -> account)

A quiet "Sign in to save" affordance sits top-right on guest screens. Google
sign-in links the anonymous account (see Accounts and guest mode) so data
persists and syncs. Never a gate.

### 8. Reminders

A scheduled Cloud Function evaluates each user daily and sends email when the
deadline approaches or a category remains short. Uses a transactional email
provider (for example a Firebase email extension / SendGrid). Cadence tunable;
sensible defaults (e.g. 90/30/7 days out, and when still non-compliant near the
deadline). Suppressed for users not required to report this cycle.

### 9. Export

One tap renders a compliance report (logged credits grouped by category, totals,
verdict, period dates) to PDF for the user's records or an audit.

## Security and privacy

- Firestore rules: a user can read/write only their own `users/{uid}` document and
  their own `credits` subcollection. `mcleRequirements` is read-only to clients.
- Certificate files are never persisted — parsed in memory, then discarded.
- Parsing happens server-side in a Cloud Function so no API key reaches the client.
- A clear, persistent "This is not legal advice; verify your compliance with the
  State Bar of California" disclaimer appears in onboarding, on the dashboard, and on exports.

## Error handling

- Parse failure or unreadable file: fall back to manual entry with a clear message; never guess silently.
- Low-confidence fields: surfaced on the Confirm screen for the user to correct before saving.
- Config missing for a user's period: block compliance verdicts with an explicit
  "requirements not available" state rather than compute against stale rules.

## Testing strategy

TDD throughout. Priorities:

- `ComplianceCalculator`: exhaustive unit tests — each sub-minimum, the participatory
  floor, the 25-hour total, proration, new-admittee exemption, and combined shortfalls.
- `RequirementsConfig`: seed and verify the full group-cycle calendar for all three
  groups (and the next roll) against calbar.ca.gov as an explicit task; test that
  group -> period mapping is correct for each group and cycle.
- `CertificateParser`: tested against real sample certificates from several providers
  (real files, no mocked parser behavior), asserting the structured output.
- Flows: onboarding derivation, confirm-then-save, manual entry, export contents.

## UI/UX direction

Apple/iOS, evaluated twice against Apple's design philosophy (clarity, deference,
depth) and settled in `mockups.html` (the approved reference):

- iOS inset-grouped lists: system-gray canvas (`#F2F2F7`), borderless white cards
  defined by fill contrast, 0.5px hairline separators inset to the text.
- Large titles (34px, SF), title-style headings of ~3 words, one blue accent
  (`#007AFF`), system green (`#34C759`) for met, system orange (`#FF9500`) for
  what's still needed; semantic color kept off decoration.
- One primary action per screen; content leads, chrome recedes.
- Dashboard progress is a **checklist** (Still needed / Complete), not rings or a
  bar — chosen because a compliance tool should say exactly what's left, and it
  avoids a meter implying "almost done" while specific gates remain open.
- Requirement rows **expand inline** (animated) to show contributing CLEs.
- SF-style SVG icons and controls (segmented control, 51×31 switch), 44px targets.

`mockups.html` is the approved static reference for all screens and states
(first run, empty dashboard, add/confirm, populated dashboard, credit detail).

## Build gate

Satisfied — UI mockups built and approved (`mockups.html`). Implementation may proceed.

## Open questions / risks

- Certificate formats vary widely; parser quality is the main product risk.
  Mitigated by the confirm step, per-field confidence, and manual-entry fallback.
- Requirement rules and cycle dates change; the config must be kept current, and
  re-verified against calbar.ca.gov at build time.
- Email deliverability and provider choice to be settled during implementation.
- Guest data lives only in the anonymous session until linked; the "Sign in to
  save" prompt is the only guard. Consider a milestone re-prompt cadence.

## Sources

- MCLE Requirements — State Bar of California: https://www.calbar.ca.gov/legal-professionals/maintaining-compliance/mcle/mcle-requirements
- Your MCLE reporting requirement — State Bar of California: https://info.calbar.ca.gov/knowledge/en/your-mcle-reporting-requirement
