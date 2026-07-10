// ABOUTME: Reads a browser File into { fileBase64, mimeType } for the parse call.
// ABOUTME: Strips the data: URL prefix; the file itself is never stored anywhere.
export interface UploadPayload { fileBase64: string; mimeType: string }

export function fileToBase64(file: File): Promise<UploadPayload> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error ?? new Error('file read failed'))
    reader.onload = () => {
      const result = String(reader.result)
      const comma = result.indexOf(',')
      resolve({ fileBase64: comma >= 0 ? result.slice(comma + 1) : result, mimeType: file.type })
    }
    reader.readAsDataURL(file)
  })
}
