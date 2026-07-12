// ABOUTME: Thin Anthropic orchestration: certificate bytes -> validated ParsedCredit.
// ABOUTME: Client is injectable (MessagesClient) so this is unit-testable with a fake; no file is ever persisted.
import { buildFileBlock } from './contentBlock.js'
import { SYSTEM_PROMPT, PARSED_CREDIT_SCHEMA, buildMessages } from './prompt.js'
import { validateParsedCredit } from './parsedCreditSchema.js'
import type { ParsedCredit } from './types.js'

// Thrown when the model judged the upload not to be a CLE certificate. Checked BEFORE field
// validation, because a non-certificate yields empty placeholder fields that would otherwise fail
// validation and be reported as a generic "couldn't read" error instead of this specific case.
export class NotACleCertificateError extends Error {}

// Overridable via env (e.g. for rollout to a different model); defaults to the
// model this parser's prompt and schema were built against.
export const PARSE_MODEL = process.env.PARSE_MODEL ?? 'claude-sonnet-5'

export interface ExtractInput {
  fileBase64: string
  mimeType: string
}

// Minimal shape of the Anthropic client this module needs. A real `Anthropic`
// instance (from @anthropic-ai/sdk) satisfies this structurally, and tests can
// inject a lightweight fake without constructing the full SDK client.
//
// Verified against the real Anthropic API by extract.e2e.test.ts: `client.messages.create(...)`
// accepts `output_config: { format: { type: 'json_schema', schema } }`, and the response
// `content` array's text blocks have this shape.
export interface MessagesClient {
  messages: {
    create(params: unknown): Promise<{
      content: Array<{ type: string; text?: string }>
      usage?: { input_tokens: number; output_tokens: number }
    }>
  }
}

export interface ParseUsage {
  inputTokens: number
  outputTokens: number
}

export async function extractParsedCredit(
  client: MessagesClient,
  input: ExtractInput,
): Promise<{ parsed: ParsedCredit; usage: ParseUsage }> {
  const fileBlock = buildFileBlock(input.mimeType, input.fileBase64)
  const response = await client.messages.create({
    model: PARSE_MODEL,
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: buildMessages(fileBlock),
    output_config: { format: { type: 'json_schema', schema: PARSED_CREDIT_SCHEMA } },
  })
  const text = response.content.find((b) => b.type === 'text')
  if (!text || typeof text.text !== 'string') {
    throw new Error('parseCertificate: model returned no text block')
  }
  const raw = JSON.parse(text.text)
  // Reject a non-certificate before validating the rest — its placeholder fields are expected to
  // be empty/invalid, and that must surface as "not a CLE certificate", not "couldn't read".
  if (raw && typeof raw === 'object' && raw.isCleCertificate === false) {
    throw new NotACleCertificateError()
  }
  const parsed = validateParsedCredit(raw)
  const usage: ParseUsage = {
    inputTokens: response.usage?.input_tokens ?? 0,
    outputTokens: response.usage?.output_tokens ?? 0,
  }
  return { parsed, usage }
}
