// ABOUTME: Tests the reminder orchestration over injected deps with fake data.
// ABOUTME: No Firebase, no email — deps are vi.fn() fakes; only the wiring is asserted.
import { describe, it, expect, vi } from 'vitest'
import { processReminders, type ReminderDeps, type UserRecord } from '../reminders/processReminders'
import { DEFAULT_REMINDER_CONFIG } from '../reminders/config'
import type { Credit } from '@domain/types'

const user = (over: Partial<UserRecord>): UserRecord => ({
  uid: 'u1', name: 'Maya Hoffman', email: 'maya@example.com', group: 2,
  currentPeriod: { start: '2024-02-01', end: '2027-03-29', reportBy: '2027-03-30' },
  requiredToReport: true, sentReminders: [], credits: [], ...over,
})

function fakeDeps(users: UserRecord[]) {
  const enqueued: { to: string[]; message: { subject: string; text: string } }[] = []
  const recorded: Record<string, string[]> = {}
  const deps: ReminderDeps = {
    listUsers: vi.fn(async () => users),
    enqueueEmail: vi.fn(async m => { enqueued.push(m) }),
    recordSent: vi.fn(async (uid, keys) => { recorded[uid] = keys }),
  }
  return { deps, enqueued, recorded }
}

describe('processReminders', () => {
  it('enqueues a deadline email and records the sent key', async () => {
    const { deps, enqueued, recorded } = fakeDeps([user({})]) // 20 days out on the test date below
    await processReminders(deps, '2027-03-10', DEFAULT_REMINDER_CONFIG)
    expect(enqueued).toHaveLength(2) // deadline-30 + noncompliant-30 (no credits => not compliant)
    expect(enqueued[0].to).toEqual(['maya@example.com'])
    expect(recorded['u1']).toEqual(['deadline-30', 'noncompliant-30'])
  })

  it('does not re-send an already-recorded reminder', async () => {
    const { deps, enqueued } = fakeDeps([user({ sentReminders: ['deadline-30', 'noncompliant-30'] })])
    await processReminders(deps, '2027-03-10', DEFAULT_REMINDER_CONFIG)
    expect(enqueued).toHaveLength(0)
  })

  it('suppresses users not required to report', async () => {
    const { deps, enqueued } = fakeDeps([user({ requiredToReport: false })])
    await processReminders(deps, '2027-03-10', DEFAULT_REMINDER_CONFIG)
    expect(enqueued).toHaveLength(0)
  })

  it('skips guests with no email', async () => {
    const { deps, enqueued } = fakeDeps([user({ email: '' })])
    await processReminders(deps, '2027-03-10', DEFAULT_REMINDER_CONFIG)
    expect(enqueued).toHaveLength(0)
  })

  it('stays quiet for a compliant user (no non-compliant key)', async () => {
    const fullCredit: Credit = {
      id: 'c', provider: 'p', activityTitle: 't', completionDate: '2026-01-01',
      totalHours: 25, participatory: true,
      categoryHours: { ethics: 4, competence: 2, competencePrevention: 1, bias: 2, biasImplicit: 1, technology: 1, civility: 1 },
    }
    const { deps, enqueued, recorded } = fakeDeps([user({ credits: [fullCredit] })])
    await processReminders(deps, '2027-03-10', DEFAULT_REMINDER_CONFIG)
    expect(enqueued).toHaveLength(1)             // deadline-30 only
    expect(recorded['u1']).toEqual(['deadline-30'])
  })
})
