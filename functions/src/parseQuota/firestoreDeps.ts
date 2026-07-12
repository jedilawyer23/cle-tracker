// ABOUTME: Builds real ParseQuotaDeps from firebase-admin — a Firestore transaction on
// ABOUTME: parseQuota/{uid}_{date} makes the check-and-increment atomic across concurrent calls.
import { getFirestore, type DocumentSnapshot } from 'firebase-admin/firestore'
import type { ParseQuotaDeps } from './enforceParseQuota.js'
import { decideQuota } from './decideQuota.js'

function readCount(snap: DocumentSnapshot): number {
  return snap.exists ? ((snap.data()?.count as number | undefined) ?? 0) : 0
}

export function parseQuotaDeps(): ParseQuotaDeps {
  const db = getFirestore()
  return {
    async checkAndIncrement(key, limit) {
      const ref = db.collection('parseQuota').doc(key)
      return db.runTransaction(async (tx) => {
        const snap = await tx.get(ref)
        const { allowed, nextCount } = decideQuota(readCount(snap), limit)
        if (allowed) {
          tx.set(ref, { count: nextCount }, { merge: true })
        }
        return allowed
      })
    },
    async getCount(key) {
      return readCount(await db.collection('parseQuota').doc(key).get())
    },
  }
}
