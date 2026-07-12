// ABOUTME: Real end-to-end parse of a real sample MCLE certificate via the real Anthropic API.
// ABOUTME: No mocks (spec requirement); self-skips when ANTHROPIC_API_KEY is unset so the normal suite stays green.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import Anthropic from '@anthropic-ai/sdk'
import { extractParsedCredit } from '../extract.js'

const here = dirname(fileURLToPath(import.meta.url))
const hasKey = !!process.env.ANTHROPIC_API_KEY
const CONFIDENCES = ['high', 'medium', 'low']

describe.skipIf(!hasKey)('extractParsedCredit (real API, real certificate)', () => {
  it(
    'extracts structured credit data from a real State Bar of California MCLE certificate',
    async () => {
      const png = readFileSync(join(here, 'fixtures', 'sample-certificate.png'))
      // Real client, same construction as index.ts's parseCertificate callable.
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

      const { parsed: result } = await extractParsedCredit(client, {
        fileBase64: png.toString('base64'),
        mimeType: 'image/png',
      })

      // Tolerant checks — this is a live model call, not a fixture-matched mock.
      expect(result.provider).toMatch(/practising law institute|PLI/i)

      expect(result.totalHours).toBeGreaterThanOrEqual(1.99)
      expect(result.totalHours).toBeLessThanOrEqual(2.01)

      expect(result.categoryHours.ethics).toBeGreaterThan(1)
      expect(result.categoryHours.ethics).toBeLessThan(2)

      expect(result.participatory).toBe(true)

      expect(result.completionDate).toContain('2026-03-04')

      // Every field must carry a real confidence rating.
      for (const field of Object.keys(result.confidence) as Array<keyof typeof result.confidence>) {
        expect(CONFIDENCES).toContain(result.confidence[field])
      }
    },
    60_000,
  )
})
