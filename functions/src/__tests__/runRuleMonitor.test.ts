// ABOUTME: Tests the rule-monitor orchestration over injected deps with fake fetch/store/alert.
// ABOUTME: No network, no Firestore — asserts baseline-silence, change-alerting, and fetch-failure.
import { describe, it, expect, vi } from 'vitest'
import { runRuleMonitor, type RuleMonitorDeps, type RuleAlert } from '../ruleMonitor/runRuleMonitor'
import type { MonitoredSource } from '../ruleMonitor/config'

const SRC: MonitoredSource = { key: 's1', url: 'https://x/s1', label: 'Source 1' }

function fakeDeps(over: Partial<RuleMonitorDeps> & { stored?: Record<string, string>; html?: string }) {
  const stored: Record<string, string> = over.stored ?? {}
  const alerts: RuleAlert[] = []
  const deps: RuleMonitorDeps = {
    sources: [SRC],
    fetchText: over.fetchText ?? vi.fn(async () => over.html ?? '<main>Total: 25 hours.</main>'),
    getFingerprint: vi.fn(async (k: string) => stored[k] ?? null),
    saveFingerprint: vi.fn(async (k: string, v: string) => { stored[k] = v }),
    raiseAlert: vi.fn(async (a: RuleAlert) => { alerts.push(a) }),
    log: vi.fn(),
  }
  return { deps, stored, alerts }
}

describe('runRuleMonitor', () => {
  it('records a baseline silently on first sight (no alert)', async () => {
    const { deps, stored, alerts } = fakeDeps({})
    const summary = await runRuleMonitor(deps)
    expect(alerts).toHaveLength(0)
    expect(summary).toMatchObject({ checked: 1, changed: 0, baselined: 1, failed: 0 })
    expect(stored['s1']).toMatch(/^[a-f0-9]{64}$/)
  })

  it('does not alert when the content is unchanged', async () => {
    const first = fakeDeps({})
    await runRuleMonitor(first.deps) // baseline
    // Re-run with the same stored fingerprint and same html.
    const { deps, alerts } = fakeDeps({ stored: first.stored })
    const summary = await runRuleMonitor(deps)
    expect(alerts).toHaveLength(0)
    expect(summary).toMatchObject({ checked: 1, changed: 0, baselined: 0 })
  })

  it('raises an alert and updates the stored fingerprint when the content changed', async () => {
    const baseline = fakeDeps({})
    await runRuleMonitor(baseline.deps)
    const before = baseline.stored['s1']

    const { deps, stored, alerts } = fakeDeps({
      stored: baseline.stored,
      html: '<main>Total: 30 hours.</main>', // rule text changed
    })
    const summary = await runRuleMonitor(deps)

    expect(summary).toMatchObject({ changed: 1 })
    expect(alerts).toHaveLength(1)
    expect(alerts[0].source.key).toBe('s1')
    expect(alerts[0].previous).toBe(before)
    expect(alerts[0].current).not.toBe(before)
    expect(stored['s1']).toBe(alerts[0].current) // stored so it won't re-alert next run
  })

  it('skips a source on fetch failure without alerting or overwriting its fingerprint', async () => {
    const { deps, stored, alerts } = fakeDeps({
      stored: { s1: 'previous-fingerprint' },
      fetchText: vi.fn(async () => { throw new Error('503') }),
    })
    const summary = await runRuleMonitor(deps)
    expect(summary).toMatchObject({ checked: 0, changed: 0, failed: 1 })
    expect(alerts).toHaveLength(0)
    expect(stored['s1']).toBe('previous-fingerprint') // untouched
    expect(deps.saveFingerprint).not.toHaveBeenCalled()
  })
})
