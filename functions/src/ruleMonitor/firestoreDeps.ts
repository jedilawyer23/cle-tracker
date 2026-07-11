// ABOUTME: Real deps for the MCLE rule-change detector — HTTP fetch, Firestore fingerprint store,
// ABOUTME: and alert delivery (a ruleAlerts doc always; an email via the mail collection if set).
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { logger } from 'firebase-functions/v2'
import { MONITORED_SOURCES } from './config'
import type { RuleMonitorDeps, RuleAlert } from './runRuleMonitor'

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { 'user-agent': 'clekeeper-mcle-rule-monitor (compliance change detection)' },
    signal: AbortSignal.timeout(20_000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.text()
}

export function ruleMonitorDeps(): RuleMonitorDeps {
  const db = getFirestore()
  return {
    sources: MONITORED_SOURCES,
    fetchText,
    async getFingerprint(key) {
      const snap = await db.collection('ruleMonitor').doc(key).get()
      return snap.exists ? (snap.data()?.fingerprint as string) ?? null : null
    },
    async saveFingerprint(key, value) {
      await db.collection('ruleMonitor').doc(key).set(
        { fingerprint: value, lastChecked: FieldValue.serverTimestamp() },
        { merge: true },
      )
    },
    async raiseAlert(alert: RuleAlert) {
      // Persistent record of the change (survives even if email isn't configured).
      await db.collection('ruleAlerts').add({
        key: alert.source.key,
        label: alert.source.label,
        url: alert.source.url,
        detectedAt: FieldValue.serverTimestamp(),
        acknowledged: false,
      })
      // Also stamp the source doc so its lastChanged is queryable.
      await db.collection('ruleMonitor').doc(alert.source.key).set(
        { lastChanged: FieldValue.serverTimestamp() },
        { merge: true },
      )
      // Email the owner if an address is configured (delivered by the "Trigger Email" extension,
      // the same mail collection reminders use). Until that's set up, the ruleAlerts doc + the
      // warn log below are the record.
      const to = process.env.RULE_ALERT_EMAIL
      if (to) {
        await db.collection('mail').add({
          to: [to],
          message: {
            subject: 'clekeeper: a California MCLE rules page changed — please verify',
            text:
              `The State Bar page "${alert.source.label}" changed since clekeeper last checked it:\n` +
              `${alert.source.url}\n\n` +
              `This is an automated change detector — it does NOT confirm the MCLE rules actually ` +
              `changed (the page edit may be cosmetic). Please review the page against the app's ` +
              `requirement config and update it only if a real rule change occurred.`,
          },
        })
      }
    },
    log(level, message) {
      if (level === 'warn') logger.warn(message)
      else logger.info(message)
    },
  }
}
