// ABOUTME: Builds real ReminderDeps from firebase-admin (Firestore + Trigger Email mail collection).
// ABOUTME: I/O only — collection paths follow M4's data model; verify the extension shape at build time.
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import type { ReminderDeps, UserRecord } from './processReminders'
import type { Credit } from '@domain/types'

export function firestoreDeps(): ReminderDeps {
  const db = getFirestore()
  return {
    async listUsers(): Promise<UserRecord[]> {
      const snap = await db.collection('users').get()
      return Promise.all(snap.docs.map(async d => {
        const data = d.data()
        const credits = (await d.ref.collection('credits').get()).docs.map(c => c.data() as Credit)
        return {
          uid: d.id,
          name: data.name ?? '',
          // Reminders only ever target linked (Google-backed) accounts with a stored email —
          // guests have accountState 'guest' and no email, so this always yields hasEmail=false
          // for them in dueReminders without needing a separate accountState check downstream.
          email: data.accountState === 'linked' && data.email ? (data.email as string) : '',
          group: data.group,
          currentPeriod: data.currentPeriod,        // { start, end, reportBy } written in M1/M4
          // No exemption rule exists yet (e.g. a new-admittee grace period keyed off
          // admissionDate) — every user with a currentPeriod is required to report until one
          // is added. Revisit if/when that domain rule lands (YAGNI for now).
          requiredToReport: true,
          sentReminders: data.sentReminders ?? [],  // idempotency record, server-written only
          credits,
        }
      }))
    },
    async enqueueEmail(mail) {
      // The Firebase "Trigger Email" extension watches this collection and delivers the
      // message per its documented schema ({ to, message: { subject, text } }). The extension
      // itself is NOT installed as part of this milestone — installing it (with its SMTP/API
      // config via Secret Manager) is a deploy-time follow-up. Writing here is inert until then.
      await db.collection('mail').add(mail)
    },
    async recordSent(uid, keys) {
      // sentReminders is written only from this server-side path; Firestore rules currently
      // scope users/{uid} read/write to its owner (no field-level restriction), so a client
      // could in principle also write this field — no client code does, but tightening the
      // rule to reject client writes to sentReminders is a follow-up if that matters.
      await db.collection('users').doc(uid).update({
        sentReminders: FieldValue.arrayUnion(...keys),
      })
    },
  }
}
