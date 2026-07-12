// ABOUTME: Tests extractParsedCredit's orchestration using an injected fake Anthropic client.
// ABOUTME: No network, no API key — the real API call is isolated behind the MessagesClient seam.
import { describe, it, expect, vi } from 'vitest'
import { extractParsedCredit, NotACleCertificateError, type MessagesClient } from '../extract'

// Mirrors the default in extract.ts (PARSE_MODEL = process.env.PARSE_MODEL ?? this value).
const DEFAULT_PARSE_MODEL = 'claude-sonnet-5'

const validJson = JSON.stringify({
  isCleCertificate: true,
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
})

function fakeClient(
  content: Array<{ type: string; text?: string }>,
  usage: { input_tokens: number; output_tokens: number } = { input_tokens: 1200, output_tokens: 340 },
): MessagesClient {
  return {
    messages: {
      create: vi.fn().mockResolvedValue({ content, usage }),
    },
  }
}

describe('extractParsedCredit', () => {
  it('throws NotACleCertificateError for a non-certificate, before validating its empty fields', async () => {
    // A non-CLE upload comes back flagged false with empty placeholder fields that would otherwise
    // fail validation — the classification must win so the caller can explain it specifically.
    const notCert = JSON.stringify({
      isCleCertificate: false,
      provider: '', activityTitle: '', completionDate: '', totalHours: 0,
      participatory: false, categoryHours: {},
      confidence: { provider: 'low', activityTitle: 'low', completionDate: 'low', totalHours: 'low', participatory: 'low', categoryHours: 'low' },
    })
    const client = fakeClient([{ type: 'text', text: notCert }])
    await expect(extractParsedCredit(client, { fileBase64: 'QUJD', mimeType: 'image/png' }))
      .rejects.toBeInstanceOf(NotACleCertificateError)
  })

  it('builds a request, reads the text block, and returns a validated ParsedCredit', async () => {
    const client = fakeClient([{ type: 'text', text: validJson }])

    const { parsed } = await extractParsedCredit(client, { fileBase64: 'QUJD', mimeType: 'application/pdf' })

    expect(parsed.provider).toBe('Practising Law Institute')
    expect(parsed.confidence.participatory).toBe('low')
  })

  it('surfaces the token usage from the Anthropic response', async () => {
    const client = fakeClient([{ type: 'text', text: validJson }], { input_tokens: 1200, output_tokens: 340 })

    const { usage } = await extractParsedCredit(client, { fileBase64: 'QUJD', mimeType: 'application/pdf' })

    expect(usage.inputTokens).toBe(1200)
    expect(usage.outputTokens).toBe(340)
  })

  it('defaults token usage to zero when the response omits a usage field', async () => {
    const client: MessagesClient = {
      messages: { create: vi.fn().mockResolvedValue({ content: [{ type: 'text', text: validJson }] }) },
    }

    const { usage } = await extractParsedCredit(client, { fileBase64: 'QUJD', mimeType: 'application/pdf' })

    expect(usage.inputTokens).toBe(0)
    expect(usage.outputTokens).toBe(0)
  })

  it('passes the file as a content block and the schema in output_config', async () => {
    const client = fakeClient([{ type: 'text', text: validJson }])

    await extractParsedCredit(client, { fileBase64: 'QUJD', mimeType: 'application/pdf' })

    const createMock = client.messages.create as ReturnType<typeof vi.fn>
    const callArgs = createMock.mock.calls[0][0] as {
      model: string
      messages: Array<{ role: string; content: unknown[] }>
      output_config: { format: { type: string } }
    }
    expect(callArgs.model).toBe(DEFAULT_PARSE_MODEL)
    expect(callArgs.messages[0].content[0]).toEqual({
      type: 'document',
      source: { type: 'base64', media_type: 'application/pdf', data: 'QUJD' },
    })
    expect(callArgs.output_config.format.type).toBe('json_schema')
  })

  it('throws when the response has no text block', async () => {
    const client = fakeClient([{ type: 'thinking' }])

    await expect(
      extractParsedCredit(client, { fileBase64: 'QUJD', mimeType: 'application/pdf' }),
    ).rejects.toThrow()
  })

  it('throws when the text block is not valid ParsedCredit JSON', async () => {
    const client = fakeClient([{ type: 'text', text: '{"nonsense": true}' }])

    await expect(
      extractParsedCredit(client, { fileBase64: 'QUJD', mimeType: 'application/pdf' }),
    ).rejects.toThrow()
  })

  it('throws when the uploaded mime type is unsupported (content-block seam)', async () => {
    const client = fakeClient([{ type: 'text', text: validJson }])

    await expect(
      extractParsedCredit(client, { fileBase64: 'QUJD', mimeType: 'text/plain' }),
    ).rejects.toThrow()
    expect(client.messages.create).not.toHaveBeenCalled()
  })
})
