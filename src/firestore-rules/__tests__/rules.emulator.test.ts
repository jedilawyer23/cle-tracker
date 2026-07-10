// ABOUTME: Emulator rules test — a user reaches only their own data; requirements are read-only.
// ABOUTME: Uses @firebase/rules-unit-testing against the Firestore emulator.
/// <reference types="node" />
import { beforeAll, afterAll, describe, it } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  initializeTestEnvironment, assertSucceeds, assertFails,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { doc, getDoc, setDoc } from 'firebase/firestore'

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
})
