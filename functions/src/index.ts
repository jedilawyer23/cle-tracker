// ABOUTME: Cloud Functions entry point — the parseCertificate callable.
// ABOUTME: Reads the API key from a Functions secret at runtime; never persists the uploaded file.
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { defineSecret } from 'firebase-functions/params'
import Anthropic from '@anthropic-ai/sdk'
import { extractParsedCredit } from './extract.js'

const ANTHROPIC_API_KEY = defineSecret('ANTHROPIC_API_KEY')

// TODO(Task 7, deferred): the real end-to-end test — extractParsedCredit(client, ...)
// against a genuine Anthropic client and a real sample MCLE certificate PDF, gated on
// ANTHROPIC_API_KEY being present — is intentionally not implemented yet. It needs a
// live Anthropic API key and a real sample certificate fixture, neither of which is
// available in this offline batch. Task 6 (this file + extract.ts) is fully covered by
// unit tests against an injected fake MessagesClient instead — see
// src/__tests__/extract.test.ts. When the API key and a sample certificate are
// available, add src/__tests__/extract.e2e.test.ts per the plan (Task 7) and verify the
// exact @anthropic-ai/sdk request/response shape used below against the real API.
export const parseCertificate = onCall(
  { secrets: [ANTHROPIC_API_KEY], memory: '512MiB', timeoutSeconds: 120 },
  async (request) => {
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
