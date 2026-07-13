// ABOUTME: Downscales camera photos in the browser before upload — caps the long edge at 1568px
// ABOUTME: (all Claude sees anyway) and re-encodes to JPEG, shrinking files and converting HEIC.
export const MAX_IMAGE_EDGE = 1568

export function targetDimensions(
  width: number,
  height: number,
  maxEdge: number,
): { width: number; height: number } {
  const longerSide = Math.max(width, height)
  if (longerSide <= maxEdge) return { width, height }
  const scale = maxEdge / longerSide
  return { width: Math.round(width * scale), height: Math.round(height * scale) }
}

function encodeJpeg(
  canvas: OffscreenCanvas | HTMLCanvasElement,
  quality: number,
): Promise<Blob> {
  if (canvas instanceof OffscreenCanvas) {
    return canvas.convertToBlob({ type: 'image/jpeg', quality })
  }
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('canvas encode failed'))),
      'image/jpeg',
      quality,
    )
  })
}

export async function downscaleImageFile(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
    const { width, height } = targetDimensions(bitmap.width, bitmap.height, MAX_IMAGE_EDGE)
    const canvas: OffscreenCanvas | HTMLCanvasElement =
      typeof OffscreenCanvas !== 'undefined'
        ? new OffscreenCanvas(width, height)
        : Object.assign(document.createElement('canvas'), { width, height })
    const ctx = canvas.getContext('2d') as
      | OffscreenCanvasRenderingContext2D
      | CanvasRenderingContext2D
      | null
    if (!ctx) return file
    ctx.drawImage(bitmap, 0, 0, width, height)
    const blob = await encodeJpeg(canvas, 0.85)
    const name = file.name.replace(/\.[^.]+$/, '') + '.jpg'
    const downscaled = new File([blob], name, { type: 'image/jpeg' })
    return downscaled.size < file.size ? downscaled : file
  } catch {
    return file
  }
}
