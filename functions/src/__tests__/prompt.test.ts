// ABOUTME: Tests the prompt/schema shaping used to request structured extraction.
import { describe, it, expect } from 'vitest'
import { SYSTEM_PROMPT, PARSED_CREDIT_SCHEMA, buildMessages } from '../prompt'

describe('prompt shaping', () => {
  it('system prompt names every category key and the confidence scale', () => {
    for (const key of ['ethics', 'competence', 'competencePrevention', 'bias', 'biasImplicit', 'technology', 'civility', 'general']) {
      expect(SYSTEM_PROMPT).toContain(key)
    }
    expect(SYSTEM_PROMPT).toMatch(/high|medium|low/)
  })

  it('schema requires the ParsedCredit top-level fields and forbids extras', () => {
    expect(PARSED_CREDIT_SCHEMA.type).toBe('object')
    expect(PARSED_CREDIT_SCHEMA.additionalProperties).toBe(false)
    expect(PARSED_CREDIT_SCHEMA.required).toEqual(
      expect.arrayContaining(['provider', 'activityTitle', 'completionDate', 'totalHours', 'participatory', 'categoryHours', 'confidence']),
    )
  })

  it('buildMessages puts the file block before the instruction text in a single user turn', () => {
    const fileBlock = { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: 'x' } }
    const messages = buildMessages(fileBlock as never)
    expect(messages).toHaveLength(1)
    expect(messages[0].role).toBe('user')
    expect(messages[0].content[0]).toBe(fileBlock)
    expect(messages[0].content[1].type).toBe('text')
  })
})
