// ABOUTME: Thin Anthropic orchestration: certificate bytes -> validated ParsedCredit.
// ABOUTME: Client is injectable (MessagesClient) so this is unit-testable with a fake; no file is ever persisted.
import { buildFileBlock } from './contentBlock.js'
import { SYSTEM_PROMPT, PARSED_CREDIT_SCHEMA, buildMessages } from './prompt.js'
import { validateParsedCredit } from './parsedCreditSchema.js'
import type { ParsedCredit } from './types.js'

// Overridable via env (e.g. for rollout to a different model); defaults to the
// model this parser's prompt and schema were built against.
const PARSE_MODEL = process.env.PARSE_MODEL ?? 'claude-opus-4-8'

export interface ExtractInput {
  fileBase64: string
  mimeType: string
}

// Minimal shape of the Anthropic client this module needs. A real `Anthropic`
// instance (from @anthropic-ai/sdk) satisfies this structurally, and tests can
// inject a lightweight fake without constructing the full SDK client.
//
// NOTE: verify at build time against the installed @anthropic-ai/sdk that
// `client.messages.create(...)` accepts `output_config: { format: { type: 'json_schema', schema } }`
// and that the response `content` array's text blocks have this shape — see
// the extract.e2e.test.ts placeholder for the real-API check (Task 7, deferred).
export interface MessagesClient {
  messages: {
    create(params: unknown): Promise<{ content: Array<{ type: string; text?: string }> }>
  }
}

export async function extractParsedCredit(client: MessagesClient, input: ExtractInput): Promise<ParsedCredit> {
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
  return validateParsedCredit(JSON.parse(text.text))
}
