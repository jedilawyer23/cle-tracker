// ABOUTME: Emulator test — mergeCreditsIntoAccount copies a source uid's credits into a target
// ABOUTME: uid's collection, skipping anything already present there (by creditSignature).
// This is pure Firestore I/O with no Google auth involved, so it's fully emulator-testable —
// unlike the real credential-already-in-use -> signInWithCredential path in linkGoogle.ts (see
// the NOTE in linkGoogle.emulator.test.ts on why that exact path can't be driven end-to-end
// here). We use `withSecurityRulesDisabled` because the merge is inherently a cross-uid
// operation (reads uid A's credits, writes into uid B's) that no single authenticated client
// session can perform under firestore.rules, which restrict each uid to its own subtree.
import { beforeAll, afterAll, describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  initializeTestEnvironment, type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { collection, doc, getDocs, setDoc, type Firestore } from 'firebase/firestore'
import { mergeCreditsIntoAccount } from '../mergeCreditsIntoAccount'
import type { Credit } from '../../domain/types'

let env: RulesTestEnvironment

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-cle-merge',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  })
})
afterAll(() => env.cleanup())

const credit = (over: Partial<Credit>): Credit => ({
  id: 'placeholder', provider: 'p', activityTitle: 't', completionDate: '2026-01-01',
  totalHours: 1, participatory: true, categoryHours: {}, ...over,
})

async function seedCredits(db: Firestore, uid: string, credits: Credit[]) {
  for (const c of credits) {
    const { id, ...rest } = c
    await setDoc(doc(db, 'users', uid, 'credits', id), rest)
  }
}

describe('mergeCreditsIntoAccount', () => {
  it('copies deduped source credits into the target, and is idempotent on re-run', async () => {
    await env.clearFirestore()
    const uidA = 'guest-a'
    const uidB = 'existing-b'

    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore() as unknown as Firestore

      const aCredits = [
        credit({ id: 'a1', provider: 'CEB', activityTitle: 'Conflicts of Interest', completionDate: '2026-01-22', totalHours: 4, categoryHours: { ethics: 4 } }),
        credit({ id: 'a2', provider: 'PLI', activityTitle: 'AI and the Practice of Law', completionDate: '2026-06-18', totalHours: 1.5, categoryHours: { technology: 1.5 } }),
        credit({ id: 'a3', provider: 'CLE Co', activityTitle: 'Implicit Bias', completionDate: '2026-03-01', totalHours: 2, categoryHours: { biasImplicit: 2 } }),
      ]
      // b1 duplicates a1 (same signature fields), just under a different doc id / different uid.
      const bCredits = [
        credit({ id: 'b1', provider: ' ceb ', activityTitle: 'CONFLICTS OF INTEREST', completionDate: '2026-01-22', totalHours: 4, categoryHours: { ethics: 4 } }),
      ]
      await seedCredits(db, uidA, aCredits)
      await seedCredits(db, uidB, bCredits)

      // The caller (linkGoogle) reads the guest credits before switching auth and passes them in.
      const copied = await mergeCreditsIntoAccount(db, uidB, aCredits)
      expect(copied).toBe(2) // a2 and a3 are new; a1 is a dup of b1

      const bSnap = await getDocs(collection(db, 'users', uidB, 'credits'))
      expect(bSnap.docs).toHaveLength(3) // b1 (original) + a2 + a3

      const titles = bSnap.docs.map((d) => d.data().activityTitle as string).sort()
      expect(titles).toEqual(['AI and the Practice of Law', 'CONFLICTS OF INTEREST', 'Implicit Bias'])

      // Re-running the merge must not duplicate anything further.
      const secondRun = await mergeCreditsIntoAccount(db, uidB, aCredits)
      expect(secondRun).toBe(0)
      const bSnapAgain = await getDocs(collection(db, 'users', uidB, 'credits'))
      expect(bSnapAgain.docs).toHaveLength(3)
    })
  })
})
