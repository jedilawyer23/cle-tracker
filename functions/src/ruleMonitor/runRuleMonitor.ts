// ABOUTME: Orchestrates one rule-change-detection pass over injected deps (fully unit-testable).
// ABOUTME: Fetches each source, fingerprints it, and raises an alert when the fingerprint changed.
import { extractText, fingerprint } from './fingerprint'
import type { MonitoredSource } from './config'

export interface RuleAlert {
  source: MonitoredSource
  previous: string
  current: string
}

export interface RuleMonitorDeps {
  sources: MonitoredSource[]
  fetchText(url: string): Promise<string>
  getFingerprint(key: string): Promise<string | null>
  saveFingerprint(key: string, value: string): Promise<void>
  raiseAlert(alert: RuleAlert): Promise<void>
  log(level: 'info' | 'warn', message: string): void
}

export interface RuleRunSummary {
  checked: number
  changed: number
  baselined: number
  failed: number
}

export async function runRuleMonitor(deps: RuleMonitorDeps): Promise<RuleRunSummary> {
  const summary: RuleRunSummary = { checked: 0, changed: 0, baselined: 0, failed: 0 }

  for (const source of deps.sources) {
    let html: string
    try {
      html = await deps.fetchText(source.url)
    } catch (err) {
      // A fetch failure is not treated as a rule change — don't alert and don't overwrite the
      // stored fingerprint, so a transient outage can't mask a later real change.
      summary.failed++
      deps.log('warn', `rule-monitor: fetch failed for ${source.key} (${source.url}): ${String(err)}`)
      continue
    }

    const current = fingerprint(extractText(html))
    const previous = await deps.getFingerprint(source.key)
    await deps.saveFingerprint(source.key, current)
    summary.checked++

    if (previous === null) {
      // First time we've seen this source — record the baseline silently, never alert.
      summary.baselined++
      deps.log('info', `rule-monitor: baselined ${source.key}`)
      continue
    }
    if (previous !== current) {
      summary.changed++
      await deps.raiseAlert({ source, previous, current })
      deps.log('warn', `rule-monitor: CHANGE DETECTED in ${source.key} — a human must re-verify the rules`)
    }
  }

  return summary
}
