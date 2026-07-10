// ABOUTME: Cloud Functions entry point — the parseCertificate callable.
// ABOUTME: Reads the API key from a Functions secret at runtime; never persists the uploaded file.
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { defineSecret } from 'firebase-functions/params'
import Anthropic from '@anthropic-ai/sdk'
import { extractParsedCredit } from './extract.js'

const ANTHROPIC_API_KEY = defineSecret('ANTHROPIC_API_KEY')

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
