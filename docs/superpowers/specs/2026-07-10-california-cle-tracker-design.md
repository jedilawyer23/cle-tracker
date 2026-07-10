# California CLE Tracker — Design

Status: Draft for review
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
- Upload a certificate (PDF or image), parse it, review, and log it.
- Track live progress per requirement category, with a plain-English compliance verdict.
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

- **Frontend:** React + Vite + Tailwind CSS. Apple/Tesla aesthetic — restraint,
  generous whitespace, one accent color, progress shown as rings.
- **Auth:** Firebase Authentication, Google sign-in.
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

## Data model (Firestore)

- `users/{uid}`
  - name, lastName, `group` (derived from lastName), admissionDate
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

### 1. Onboarding

Collect last name and bar admission date. Derive compliance group, current period
dates, and (if admitted mid-period) prorated targets. Show the user their group,
deadline, and personalized requirement table. Present the "not legal advice" disclaimer.

### 2. Upload -> parse -> confirm

1. User drops a PDF or photo of a certificate.
2. The file is sent to the parsing Cloud Function; Claude returns a `ParsedCredit`:
   the same fields as a stored credit (provider, title, completionDate, totalHours,
   participatory, category hours) plus, per field, a `confidence` of high | medium | low.
   Fields at `low` are treated as unconfirmed and flagged.
3. The Confirm screen shows the extracted values for the user to edit and approve.
   Low-confidence fields are flagged for attention.
4. On approval, a `credit` document is written and the dashboard updates.
5. The uploaded file is discarded.

### 3. Manual entry

The Confirm screen opened blank (no parsing step). This is the fallback when a
parse fails or there is no certificate. Same validation, same write path.

### 4. Dashboard

Rings/progress for total, participatory, and each sub-category; a plain-English
verdict ("You still need 1 hr of Civility and 0.5 hr participatory"); days until
`reportBy`; and a persistent disclaimer.

### 5. Reminders

A scheduled Cloud Function evaluates each user daily and sends email when the
deadline approaches or a category remains short. Uses a transactional email
provider (for example a Firebase email extension / SendGrid). Cadence tunable;
sensible defaults (e.g. 90/30/7 days out, and when still non-compliant near the deadline).

### 6. Export

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

Apple/Tesla: minimal, calm, high-contrast, one accent color, progress as rings,
large type, few controls per screen. **Self-contained HTML mockups will be built
and reviewed before any implementation begins** (per the build gate below).

## Build gate

Implementation does not start until HTML UI mockups are reviewed and approved.

## Open questions / risks

- Certificate formats vary widely; parser quality is the main product risk.
  Mitigated by the confirm step and manual-entry fallback.
- Requirement rules and cycle dates change; the config must be kept current, and
  re-verified against calbar.ca.gov at build time.
- Email deliverability and provider choice to be settled during implementation.

## Sources

- MCLE Requirements — State Bar of California: https://www.calbar.ca.gov/legal-professionals/maintaining-compliance/mcle/mcle-requirements
- Your MCLE reporting requirement — State Bar of California: https://info.calbar.ca.gov/knowledge/en/your-mcle-reporting-requirement
