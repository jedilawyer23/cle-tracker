// ABOUTME: Verifies a browser File is read into base64 + mime type for upload.
// ABOUTME: The file itself is never stored anywhere; only the base64 payload leaves this module.
import { describe, it, expect } from 'vitest'
import { fileToBase64, isFileTooLarge, MAX_FILE_BYTES } from '../fileToBase64'

describe('fileToBase64', () => {
  it('returns base64 (no data: prefix) and the mime type', async () => {
    const file = new File([new Uint8Array([65, 66, 67])], 'cert.pdf', { type: 'application/pdf' })
    const result = await fileToBase64(file)
    expect(result.mimeType).toBe('application/pdf')
    expect(result.fileBase64).toBe('QUJD') // base64 of "ABC"
    expect(result.fileBase64).not.toContain(',')
  })
})

describe('isFileTooLarge', () => {
  it('is false for a file at or under the cap', () => {
    expect(isFileTooLarge({ size: MAX_FILE_BYTES } as File)).toBe(false)
    expect(isFileTooLarge({ size: MAX_FILE_BYTES - 1 } as File)).toBe(false)
  })

  it('is true for a file over the cap', () => {
    expect(isFileTooLarge({ size: MAX_FILE_BYTES + 1 } as File)).toBe(true)
  })
})
