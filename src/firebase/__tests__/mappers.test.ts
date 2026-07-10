// ABOUTME: Tests lossless conversion between domain objects and Firestore doc shapes.
// ABOUTME: Pure — no network, no emulator; part of the default `npm test` run.
import { describe, it, expect } from 'vitest'
import { profileToDoc, docToProfile, creditToDoc, docToCredit } from '../mappers'
import type { UserProfile } from '../../store/types'
import type { Credit } from '../../domain/types'

const profile: UserProfile = {
  name: 'Maya Hoffman', lastName: 'Hoffman', group: 2, admissionDate: null,
  accountState: 'guest',
  currentPeriod: { start: '2024-02-01', end: '2027-03-29', reportBy: '2027-03-30' },
  requirementsVersion: '2026-07-10',
}

const credit: Credit = {
  id: 'c1', provider: 'State Bar of CA', activityTitle: 'Ethics 101',
  completionDate: '2026-01-02', totalHours: 4, participatory: true,
  categoryHours: { ethics: 4 },
}

describe('mappers', () => {
  it('round-trips a profile', () => {
    expect(docToProfile(profileToDoc(profile))).toEqual(profile)
  })
  it('drops id from the credit doc and restores it from the doc id', () => {
    const doc = creditToDoc(credit)
    expect('id' in doc).toBe(false)
    expect(docToCredit('c1', doc)).toEqual(credit)
  })
})
