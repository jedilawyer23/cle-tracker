// ABOUTME: Cloud Functions entry point — the parseCertificate callable and the daily
// ABOUTME: sendReminders scheduled function. Both read secrets/data at call time only.
import { initializeApp } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { logger } from 'firebase-functions/v2'
import { defineSecret } from 'firebase-functions/params'
import Anthropic from '@anthropic-ai/sdk'
import { extractParsedCredit, NotACleCertificateError, PARSE_MODEL } from './extract.js'
import { processReminders } from './reminders/processReminders.js'
import { firestoreDeps } from './reminders/firestoreDeps.js'
import { DEFAULT_REMINDER_CONFIG } from './reminders/config.js'
import { runRuleMonitor } from './ruleMonitor/runRuleMonitor.js'
import { ruleMonitorDeps } from './ruleMonitor/firestoreDeps.js'
import { enforceParseQuota, parseQuotaKey } from './parseQuota/enforceParseQuota.js'
import { parseQuotaDeps } from './parseQuota/firestoreDeps.js'
import { resolveParseDailyLimit } from './parseQuota/config.js'

initializeApp()

const ANTHROPIC_API_KEY = defineSecret('ANTHROPIC_API_KEY')

// Anonymous auth is free and each call hits the paid Claude API, so an auth-only gate leaves
// this open to a denial-of-wallet attack (unlimited free callers, unbounded spend). These are
// interim mitigations — a size cap and a per-uid daily quota — cheap to check before ever
// constructing the Anthropic client. App Check is the real fix and is a tracked follow-up.
const MAX_FILE_BASE64_CHARS = 9_000_000 // ~6.7 MB raw file, base64-inflated

export const parseCertificate = onCall(
  { secrets: [ANTHROPIC_API_KEY], memory: '512MiB', timeoutSeconds: 120, maxInstances: 5 },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Sign in required to parse a certificate')
    }
    const { fileBase64, mimeType } = (request.data ?? {}) as { fileBase64?: string; mimeType?: string }
    if (!fileBase64 || !mimeType) {
      throw new HttpsError('invalid-argument', 'fileBase64 and mimeType are required')
    }
    if (fileBase64.length > MAX_FILE_BASE64_CHARS) {
      throw new HttpsError('invalid-argument', 'FILE_TOO_LARGE')
    }

    const today = new Date().toISOString().slice(0, 10)
    // Unknown/missing provider falls to the cheaper anonymous limit — only an explicit Google
    // sign-in earns the higher authenticated quota.
    const isAnonymous = request.auth.token.firebase?.sign_in_provider !== 'google.com'
    await enforceParseQuota(parseQuotaDeps(), request.auth.uid, today, resolveParseDailyLimit(isAnonymous))

    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() })
    try {
      const { parsed, usage } = await extractParsedCredit(client, { fileBase64, mimeType })
      // Best-effort cost accounting — a logging failure must never fail the parse itself.
      try {
        await getFirestore().collection('usage_logs').add({
          uid: request.auth.uid,
          date: today,
          model: PARSE_MODEL,
          inputTokens: usage.inputTokens,
          outputTokens: usage.outputTokens,
          createdAt: FieldValue.serverTimestamp(),
        })
      } catch (err) {
        logger.warn('usage log write failed', err)
      }
      return parsed
    } catch (err) {
      // The model judged the upload not to be a CLE certificate at all — a distinct case the
      // client maps to "this doesn't look like a CLE certificate" (vs. a generic parse failure).
      if (err instanceof NotACleCertificateError) {
        throw new HttpsError('failed-precondition', 'NOT_A_CLE_CERTIFICATE')
      }
      // Any other failure is an unreadable/parse error — the client falls back to manual entry.
      throw new HttpsError('failed-precondition', 'Could not read this certificate', String(err))
    }
  },
)

// Read-only companion to parseCertificate: lets the UI show "X parses left today" without
// spending a parse. Same auth gate and provider-based limit, but never increments the counter.
export const getParseQuota = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign in required to check parse quota')
  }
  const today = new Date().toISOString().slice(0, 10)
  const isAnonymous = request.auth.token.firebase?.sign_in_provider !== 'google.com'
  const used = await parseQuotaDeps().getCount(parseQuotaKey(request.auth.uid, today))
  const limit = resolveParseDailyLimit(isAnonymous)
  return { used, limit, remaining: Math.max(0, limit - used) }
})

// Daily sweep: loads every user via the Admin SDK (bypasses security rules by design — this
// is server-only, never callable by a client), reuses M1's calculateCompliance, and delegates
// the send/idempotency decision to the tested processReminders/dueReminders. VERIFY the v2
// scheduler import path, schedule syntax, and options against current docs before deploy.
export const sendReminders = onSchedule(
  { schedule: 'every day 08:00', timeZone: 'America/Los_Angeles' },
  async () => {
    const today = new Date().toISOString().slice(0, 10)
    await processReminders(firestoreDeps(), today, DEFAULT_REMINDER_CONFIG)
  },
)

// Weekly: fingerprint the State Bar's MCLE rule pages and alert a human if any changed, so the
// app's requirement config is never silently out of date. Detection only — it never edits the
// rules itself (a scrape must never drive compliance math for a legal tool).
export const checkMcleRules = onSchedule(
  { schedule: 'every monday 09:00', timeZone: 'America/Los_Angeles' },
  async () => {
    const summary = await runRuleMonitor(ruleMonitorDeps())
    logger.info('rule-monitor run complete', summary)
  },
)
