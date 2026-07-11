// ABOUTME: Cloud Functions entry point — the parseCertificate callable and the daily
// ABOUTME: sendReminders scheduled function. Both read secrets/data at call time only.
import { initializeApp } from 'firebase-admin/app'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { defineSecret } from 'firebase-functions/params'
import Anthropic from '@anthropic-ai/sdk'
import { extractParsedCredit } from './extract.js'
import { processReminders } from './reminders/processReminders.js'
import { firestoreDeps } from './reminders/firestoreDeps.js'
import { DEFAULT_REMINDER_CONFIG } from './reminders/config.js'

initializeApp()

const ANTHROPIC_API_KEY = defineSecret('ANTHROPIC_API_KEY')

export const parseCertificate = onCall(
  { secrets: [ANTHROPIC_API_KEY], memory: '512MiB', timeoutSeconds: 120 },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Sign in required to parse a certificate')
    }
    const { fileBase64, mimeType } = (request.data ?? {}) as { fileBase64?: string; mimeType?: string }
    if (!fileBase64 || !mimeType) {
      throw new HttpsError('invalid-argument', 'fileBase64 and mimeType are required')
    }

    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() })
    try {
      return await extractParsedCredit(client, { fileBase64, mimeType })
    } catch (err) {
      // Surface an unreadable/parse failure so the client can fall back to manual entry.
      throw new HttpsError('failed-precondition', 'Could not read this certificate', String(err))
    }
  },
)

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
