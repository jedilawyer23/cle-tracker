// ABOUTME: Contrast regression tests over the design tokens — computes WCAG relative-luminance
// ABOUTME: contrast ratios for text colors read straight out of tokens.css/components.css.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const tokens = readFileSync(join(here, '..', 'tokens.css'), 'utf8')
const components = readFileSync(join(here, '..', 'components.css'), 'utf8')

function srgbToLinear(c: number) {
  const v = c / 255
  return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
}
function luminance(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16)
  return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b)
}
function contrastRatio(hex1: string, hex2: string) {
  const [l1, l2] = [luminance(hex1), luminance(hex2)].sort((a, b) => b - a)
  return (l1 + 0.05) / (l2 + 0.05)
}

function token(name: string): string {
  const match = tokens.match(new RegExp(`--${name}:\\s*(#[0-9A-Fa-f]{6})`))
  if (!match) throw new Error(`token --${name} not found`)
  return match[1]
}

const WHITE = '#FFFFFF'

describe('token contrast on the card background', () => {
  it('keeps --muted body text at or near AA (>= 4.3:1)', () => {
    expect(contrastRatio(token('muted'), WHITE)).toBeGreaterThanOrEqual(4.3)
  })

  // A selector can appear in more than one rule block (e.g. a layout-only `.rowbar .rv { grid-area:
  // rv }` plus a separate styling rule) — search every block for the first that sets `color`.
  function colorVarFor(selector: string): string {
    const blocks = [...components.matchAll(new RegExp(`${selector}\\s*{([^}]*)}`, 'g'))]
    expect(blocks.length, `no rule blocks found for ${selector}`).toBeGreaterThan(0)
    for (const block of blocks) {
      const colorVar = block[1].match(/color:\s*var\((--[\w-]+)\)/)?.[1]
      if (colorVar) return colorVar
    }
    throw new Error(`no block for ${selector} sets color`)
  }

  it('gives the "/ required" number (.rowbar .rv) at least AA contrast', () => {
    const hex = token(colorVarFor('\\.rowbar \\.rv').replace('--', ''))
    expect(contrastRatio(hex, WHITE)).toBeGreaterThanOrEqual(4.5)
  })

  it('gives the met/short status text (not just the bar/check) at least AA contrast', () => {
    for (const selector of ['\\.rowbar \\.ev\\.met', '\\.rowbar \\.ev\\.short', '\\.val\\.met']) {
      const hex = token(colorVarFor(selector).replace('--', ''))
      expect(contrastRatio(hex, WHITE), `${selector} (${hex})`).toBeGreaterThanOrEqual(4.5)
    }
  })
})
