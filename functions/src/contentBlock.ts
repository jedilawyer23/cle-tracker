// ABOUTME: Maps an uploaded file's mime type to an Anthropic content block.
// ABOUTME: PDF -> document block, image/* -> image block; nothing is persisted.
const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] as const

export function buildFileBlock(mimeType: string, base64: string) {
  if (mimeType === 'application/pdf') {
    return { type: 'document', source: { type: 'base64', media_type: mimeType, data: base64 } } as const
  }
  if ((IMAGE_TYPES as readonly string[]).includes(mimeType)) {
    return { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64 } } as const
  }
  throw new Error(`Unsupported certificate type: ${mimeType}`)
}
