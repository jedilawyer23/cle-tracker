// ABOUTME: Tests mime-type routing to Anthropic document vs image content blocks.
import { describe, it, expect } from 'vitest'
import { buildFileBlock } from '../contentBlock'

describe('buildFileBlock', () => {
  it('builds a base64 document block for a PDF', () => {
    const block = buildFileBlock('application/pdf', 'QUJD')
    expect(block).toEqual({
      type: 'document',
      source: { type: 'base64', media_type: 'application/pdf', data: 'QUJD' },
    })
  })
  it('builds a base64 image block for a PNG', () => {
    const block = buildFileBlock('image/png', 'QUJD')
    expect(block).toEqual({
      type: 'image',
      source: { type: 'base64', media_type: 'image/png', data: 'QUJD' },
    })
  })
  it('accepts jpeg/webp/gif images', () => {
    expect(buildFileBlock('image/jpeg', 'x').type).toBe('image')
    expect(buildFileBlock('image/webp', 'x').type).toBe('image')
  })
  it('throws on an unsupported mime type', () => {
    expect(() => buildFileBlock('text/plain', 'x')).toThrow()
  })
})
