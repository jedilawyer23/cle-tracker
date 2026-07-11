// ABOUTME: Tests the HTML-to-text fingerprint used by the MCLE rule-change detector.
import { describe, it, expect } from 'vitest'
import { extractText, fingerprint } from '../ruleMonitor/fingerprint'

describe('extractText', () => {
  it('drops scripts, nav/header/footer chrome and tags, collapsing whitespace', () => {
    const html = `
      <header>site nav</header>
      <script>var x = 1</script>
      <style>.a{color:red}</style>
      <main><h1>MCLE Requirements</h1><p>25 hours,  including 4 &amp; ethics.</p></main>
      <footer>© 2026</footer>`
    expect(extractText(html)).toBe('MCLE Requirements 25 hours, including 4 & ethics.')
  })

  it('is stable across boilerplate-only changes (footer year, script contents)', () => {
    const a = `<footer>© 2025</footer><script>track(1)</script><main>Total: 25 hours.</main>`
    const b = `<footer>© 2026</footer><script>track(999)</script><main>Total: 25 hours.</main>`
    expect(extractText(a)).toBe(extractText(b))
  })

  it('changes when the meaningful body text changes', () => {
    const a = `<main>Total: 25 hours.</main>`
    const b = `<main>Total: 30 hours.</main>`
    expect(extractText(a)).not.toBe(extractText(b))
  })
})

describe('fingerprint', () => {
  it('is deterministic and differs on different input', () => {
    expect(fingerprint('abc')).toBe(fingerprint('abc'))
    expect(fingerprint('abc')).not.toBe(fingerprint('abd'))
    expect(fingerprint('abc')).toMatch(/^[a-f0-9]{64}$/)
  })
})
