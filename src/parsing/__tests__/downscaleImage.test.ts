// ABOUTME: Verifies targetDimensions' pure aspect-preserving math and downscaleImageFile's guards:
// ABOUTME: PDFs pass through untouched, and a decode failure falls back to the original file.
import { describe, it, expect } from 'vitest'
import { targetDimensions, downscaleImageFile, MAX_IMAGE_EDGE } from '../downscaleImage'

describe('targetDimensions', () => {
  it('leaves a landscape image whose long edge is already within the cap unchanged', () => {
    expect(targetDimensions(1568, 900, MAX_IMAGE_EDGE)).toEqual({ width: 1568, height: 900 })
  })

  it('scales a large landscape image down, preserving aspect ratio', () => {
    expect(targetDimensions(4000, 3000, MAX_IMAGE_EDGE)).toEqual({ width: 1568, height: 1176 })
  })

  it('scales a large portrait image down, preserving aspect ratio', () => {
    expect(targetDimensions(3000, 4000, MAX_IMAGE_EDGE)).toEqual({ width: 1176, height: 1568 })
  })

  it('scales a large square image so both edges hit the cap', () => {
    expect(targetDimensions(2000, 2000, MAX_IMAGE_EDGE)).toEqual({ width: 1568, height: 1568 })
  })

  it('leaves a small image unchanged', () => {
    expect(targetDimensions(800, 600, MAX_IMAGE_EDGE)).toEqual({ width: 800, height: 600 })
  })
})

describe('downscaleImageFile', () => {
  it('returns a non-image file (PDF) unchanged', async () => {
    const pdf = new File([new Uint8Array([37, 80, 68, 70])], 'cert.pdf', { type: 'application/pdf' })
    expect(await downscaleImageFile(pdf)).toBe(pdf)
  })

  it('falls back to the original image file when decoding is unavailable', async () => {
    // jsdom has no real createImageBitmap/canvas, so the try/catch guard must return the input.
    const img = new File([new Uint8Array([1, 2, 3, 4])], 'cert.jpg', { type: 'image/jpeg' })
    expect(await downscaleImageFile(img)).toBe(img)
  })
})
