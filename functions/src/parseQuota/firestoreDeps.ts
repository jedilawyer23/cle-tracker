// ABOUTME: Builds real ParseQuotaDeps from firebase-admin — a Firestore transaction on
// ABOUTME: parseQuota/{uid}_{date} makes the check-and-increment atomic across concurrent calls.
import { getFirestore } from 'firebase-admin/firestore'
import type { ParseQuotaDeps } from './enforceParseQuota.js'
import { decideQuota } from './decideQuota.js'

export function parseQuotaDeps(): ParseQuotaDeps {
  const db = getFirestore()
  return {
    async checkAndIncrement(key, limit) {
      const ref = db.collection('parseQuota').doc(key)
      return db.runTransaction(async (tx) => {
        const snap = await tx.get(ref)
        const currentCount = snap.exists ? ((snap.data()?.count as number | undefined) ?? 0) : 0
        const { allowed, nextCount } = decideQuota(currentCount, limit)
        if (allowed) {
          tx.set(ref, { count: nextCount }, { merge: true })
        }
        return allowed
      })
    },
  }
}
