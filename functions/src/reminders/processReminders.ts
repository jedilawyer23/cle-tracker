// ABOUTME: Orchestrates the daily reminder run over injected deps (fully unit-testable).
// ABOUTME: Reuses M1's calculateCompliance; delegates the send decision to dueReminders.
import { calculateCompliance } from '@domain/complianceCalculator'
import { REQUIREMENT_RULES } from '@domain/requirements'
import type { Credit, Period } from '@domain/types'
import type { ReminderConfig } from './config'
import { dueReminders, daysUntil } from './dueReminders'
import { buildMessage } from './reminderMessages'

export interface UserRecord {
  uid: string
  name: string
  email: string
  group: number
  currentPeriod: Period
  requiredToReport: boolean
  sentReminders: string[]
  credits: Credit[]
}

export interface MailDoc { to: string[]; message: { subject: string; text: string } }

export interface ReminderDeps {
  listUsers(): Promise<UserRecord[]>
  enqueueEmail(mail: MailDoc): Promise<void>
  recordSent(uid: string, keys: string[]): Promise<void>
}

export async function processReminders(
  deps: ReminderDeps,
  today: string,
  cfg: ReminderConfig,
): Promise<void> {
  const users = await deps.listUsers()
  for (const u of users) {
    const result = calculateCompliance(REQUIREMENT_RULES, u.credits)
    const keys = dueReminders(
      {
        hasEmail: Boolean(u.email),
        requiredToReport: u.requiredToReport,
        compliant: result.compliant,
        reportBy: u.currentPeriod.reportBy,
        alreadySent: u.sentReminders,
      },
      today,
      cfg,
    )
    if (keys.length === 0) continue

    const ctx = {
      name: u.name,
      reportBy: u.currentPeriod.reportBy,
      daysLeft: daysUntil(today, u.currentPeriod.reportBy),
      remainingCount: result.totalCount - result.metCount,
    }
    for (const key of keys) {
      await deps.enqueueEmail({ to: [u.email], message: buildMessage(key, ctx) })
    }
    await deps.recordSent(u.uid, keys)
  }
}
