// ABOUTME: Emulator rules test — a user reaches only their own data; requirements are read-only.
// ABOUTME: Uses @firebase/rules-unit-testing against the Firestore emulator.
/// <reference types="node" />
import { beforeAll, afterAll, describe, it } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  initializeTestEnvironment, assertSucceeds, assertFails,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore'

let env: RulesTestEnvironment

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-cle',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  })
})
afterAll(() => env.cleanup())

describe('firestore.rules', () => {
  it('lets a user read/write their own profile and credits', async () => {
    const db = env.authenticatedContext('alice').firestore()
    await assertSucceeds(setDoc(doc(db, 'users/alice'), { name: 'Alice' }))
    await assertSucceeds(getDoc(doc(db, 'users/alice')))
    await assertSucceeds(setDoc(doc(db, 'users/alice/credits/c1'), { totalHours: 1 }))
  })
  it("forbids reaching another user's data", async () => {
    const db = env.authenticatedContext('alice').firestore()
    await assertFails(getDoc(doc(db, 'users/bob')))
    await assertFails(setDoc(doc(db, 'users/bob/credits/c1'), { totalHours: 1 }))
  })
  it('forbids an unauthenticated user entirely', async () => {
    const db = env.unauthenticatedContext().firestore()
    await assertFails(getDoc(doc(db, 'users/alice')))
  })
  it('makes mcleRequirements read-only to clients', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), 'mcleRequirements/2026-07-10'), { total: 25 })
    })
    const db = env.authenticatedContext('alice').firestore()
    await assertSucceeds(getDoc(doc(db, 'mcleRequirements/2026-07-10')))
    await assertFails(setDoc(doc(db, 'mcleRequirements/2026-07-10'), { total: 1 }))
  })

  const wellFormedProfile = {
    name: 'Carol Diaz',
    lastName: 'Diaz',
    group: 2,
    admissionDate: '2019-05-01',
    accountState: 'guest',
    currentPeriod: { start: '2024-02-01', end: '2027-03-29', reportBy: '2027-03-30' },
    requirementsVersion: '2026-07-10',
  }

  const wellFormedCredit = {
    provider: 'PLI',
    activityTitle: 'AI and the Practice of Law',
    completionDate: '2026-06-18',
    totalHours: 1.5,
    participatory: true,
    categoryHours: { technology: 1, ethics: 0.5 },
  }

  it('allows a well-formed profile and credit write', async () => {
    const db = env.authenticatedContext('carol').firestore()
    await assertSucceeds(setDoc(doc(db, 'users/carol'), wellFormedProfile))
    await assertSucceeds(setDoc(doc(db, 'users/carol/credits/c1'), wellFormedCredit))
  })

  it('allows the accountState:"linked" merge write used when linking Google', async () => {
    const db = env.authenticatedContext('carol').firestore()
    await assertSucceeds(setDoc(doc(db, 'users/carol'), wellFormedProfile))
    await assertSucceeds(
      setDoc(doc(db, 'users/carol'), { accountState: 'linked', email: 'carol@example.com' }, { merge: true }),
    )
  })

  it('allows a credit at the totalHours upper boundary', async () => {
    const db = env.authenticatedContext('carol').firestore()
    await assertSucceeds(setDoc(doc(db, 'users/carol/credits/c2'), { ...wellFormedCredit, totalHours: 1000 }))
  })

  it('allows removing a credit', async () => {
    const db = env.authenticatedContext('carol').firestore()
    await assertSucceeds(setDoc(doc(db, 'users/carol/credits/c1'), wellFormedCredit))
    await assertSucceeds(deleteDoc(doc(db, 'users/carol/credits/c1')))
  })

  it('denies a profile write with an unexpected extra field', async () => {
    const db = env.authenticatedContext('dave').firestore()
    await assertFails(setDoc(doc(db, 'users/dave'), { ...wellFormedProfile, isAdmin: true }))
  })

  it('denies a profile write with an oversized name', async () => {
    const db = env.authenticatedContext('dave').firestore()
    await assertFails(setDoc(doc(db, 'users/dave'), { ...wellFormedProfile, name: 'x'.repeat(201) }))
  })

  it('denies a profile write with an out-of-range group', async () => {
    const db = env.authenticatedContext('dave').firestore()
    await assertFails(setDoc(doc(db, 'users/dave'), { ...wellFormedProfile, group: 4 }))
  })

  it('denies a profile write with an invalid accountState', async () => {
    const db = env.authenticatedContext('dave').firestore()
    await assertFails(setDoc(doc(db, 'users/dave'), { ...wellFormedProfile, accountState: 'admin' }))
  })

  it('denies a profile write with an oversized email', async () => {
    const db = env.authenticatedContext('dave').firestore()
    await assertFails(setDoc(doc(db, 'users/dave'), { ...wellFormedProfile, email: 'x'.repeat(321) }))
  })

  it('denies a credit write with an unexpected extra field', async () => {
    const db = env.authenticatedContext('dave').firestore()
    await assertFails(setDoc(doc(db, 'users/dave/credits/c1'), { ...wellFormedCredit, hacked: true }))
  })

  it('denies a credit write with an out-of-range totalHours', async () => {
    const db = env.authenticatedContext('dave').firestore()
    await assertFails(setDoc(doc(db, 'users/dave/credits/c1'), { ...wellFormedCredit, totalHours: -1 }))
    await assertFails(setDoc(doc(db, 'users/dave/credits/c1'), { ...wellFormedCredit, totalHours: 1001 }))
  })

  it('denies a credit write with a malformed completionDate', async () => {
    const db = env.authenticatedContext('dave').firestore()
    await assertFails(setDoc(doc(db, 'users/dave/credits/c1'), { ...wellFormedCredit, completionDate: '06/18/2026' }))
  })

  it('denies a credit write with an unknown categoryHours key', async () => {
    const db = env.authenticatedContext('dave').firestore()
    await assertFails(
      setDoc(doc(db, 'users/dave/credits/c1'), { ...wellFormedCredit, categoryHours: { madeUp: 1 } }),
    )
  })

  it('denies a credit write with a negative categoryHours value', async () => {
    const db = env.authenticatedContext('dave').firestore()
    await assertFails(
      setDoc(doc(db, 'users/dave/credits/c1'), { ...wellFormedCredit, categoryHours: { ethics: -1 } }),
    )
  })

  it("still forbids reaching another user's data with a well-formed write", async () => {
    const db = env.authenticatedContext('dave').firestore()
    await assertFails(setDoc(doc(db, 'users/erin'), wellFormedProfile))
    await assertFails(setDoc(doc(db, 'users/erin/credits/c1'), wellFormedCredit))
  })
})
