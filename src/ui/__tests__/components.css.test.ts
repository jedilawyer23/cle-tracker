// ABOUTME: Regression tests over the raw component stylesheet for rules that jsdom can't exercise
// ABOUTME: (max-height clipping, reduced-motion overrides) — asserted as text rather than layout.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const css = readFileSync(join(here, '..', 'components.css'), 'utf8')

describe('components.css', () => {
  it('lets an open credits accordion grow well past a handful of rows instead of clipping at 340px', () => {
    const rule = css.match(/\.item\.open \.credits\s*{([^}]*)}/)
    expect(rule).not.toBeNull()
    const body = rule![1]
    const maxHeight = Number(body.match(/max-height:\s*(\d+)px/)?.[1])
    expect(maxHeight).toBeGreaterThanOrEqual(2000)
    expect(body).toMatch(/overflow-y:\s*auto/)
  })

  it('still collapses a closed accordion to zero height', () => {
    const rule = css.match(/(?<!\.item\.open )\.credits\s*{([^}]*)}/)
    expect(rule).not.toBeNull()
    expect(rule![1]).toMatch(/max-height:\s*0/)
  })
})
