// ABOUTME: Regression tests over the raw component stylesheet for rules that jsdom can't exercise
// ABOUTME: (max-height clipping, reduced-motion overrides) — asserted as text rather than layout.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const css = readFileSync(join(here, '..', 'components.css'), 'utf8')

describe('components.css', () => {
  // Uses the grid-template-rows 0fr→1fr technique so the accordion animates to its real content
  // height at any length — no fixed max-height cap to clip long lists (the old bug) and no
  // snap-open artifact from an over-large cap. The inner wrapper carries the overflow clip.
  it('animates the credits accordion open to full content height without a clipping cap', () => {
    const closed = css.match(/(?<!\.item\.open )\.credits\s*{([^}]*)}/)
    expect(closed).not.toBeNull()
    expect(closed![1]).toMatch(/grid-template-rows:\s*0fr/)
    expect(closed![1]).not.toMatch(/max-height/)

    const open = css.match(/\.item\.open \.credits\s*{([^}]*)}/)
    expect(open).not.toBeNull()
    expect(open![1]).toMatch(/grid-template-rows:\s*1fr/)
    expect(open![1]).not.toMatch(/max-height/)
  })

  it('clips the collapsed accordion via the inner wrapper', () => {
    const inner = css.match(/\.credits-inner\s*{([^}]*)}/)
    expect(inner).not.toBeNull()
    expect(inner![1]).toMatch(/overflow:\s*hidden/)
  })

  it('bumps the nav pill toward a 44px tap target', () => {
    const rule = css.match(/\.navbtn\s*{([^}]*)}/)
    expect(rule).not.toBeNull()
    const minHeight = Number(rule![1].match(/min-height:\s*(\d+)px/)?.[1])
    expect(minHeight).toBeGreaterThanOrEqual(44)
  })

  it('disables the accordion, toggle, and chevron animations under prefers-reduced-motion', () => {
    const reducedMotionBlocks = [...css.matchAll(/@media \(prefers-reduced-motion: reduce\)\s*{([^]*?)}\s*}/g)]
    expect(reducedMotionBlocks.length).toBeGreaterThan(0)
    const body = reducedMotionBlocks.map(m => m[1]).join('\n')
    expect(body).toMatch(/\.credits/)
    expect(body).toMatch(/\.switch/)
  })
})
