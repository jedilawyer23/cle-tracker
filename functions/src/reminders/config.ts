// ABOUTME: Tunable reminder cadence — deadline thresholds and the near-deadline cutoff.
// ABOUTME: Data only; defaults match the spec (90/30/7 days out, non-compliant within 30).
export interface ReminderConfig {
  thresholds: number[]      // days-out buckets, any order
  nearDeadlineDays: number  // non-compliant reminders fire only within this many days
}

export const DEFAULT_REMINDER_CONFIG: ReminderConfig = {
  thresholds: [90, 30, 7],
  nearDeadlineDays: 30,
}
