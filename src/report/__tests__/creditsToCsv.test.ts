// ABOUTME: Verifies creditsToCsv's column layout (one column per requirement category, 0 when a
// ABOUTME: credit doesn't touch it) and CSV escaping for fields containing commas/quotes/newlines.
import { it, expect } from 'vitest'
import { creditsToCsv } from '../creditsToCsv'
import type { Credit } from '../../domain/types'

const HEADER = 'Provider,Activity,Completion Date,Total Hours,Participatory,'
  + 'Legal Ethics,Competence,Prevention & Detection,Elimination of Bias,Implicit Bias,Technology,Civility'

it('returns just the header row for an empty credit list', () => {
  expect(creditsToCsv([])).toBe(HEADER)
})

it('renders one row per credit, with 0 for every category the credit does not touch', () => {
  const credit: Credit = {
    id: 'a', provider: 'CEB', activityTitle: 'Conflicts of Interest', completionDate: '2026-01-22',
    totalHours: 4, participatory: true, categoryHours: { ethics: 4 },
  }
  const csv = creditsToCsv([credit])
  const [header, row] = csv.split('\r\n')
  expect(header).toBe(HEADER)
  expect(row).toBe('CEB,Conflicts of Interest,2026-01-22,4,Yes,4,0,0,0,0,0,0')
})

it('fills every touched category column, not just the first', () => {
  const credit: Credit = {
    id: 'a', provider: 'PLI', activityTitle: 'Bias & Prevention', completionDate: '2026-03-01',
    totalHours: 3, participatory: false,
    categoryHours: { bias: 2, biasImplicit: 1, competence: 1, competencePrevention: 0.5 },
  }
  const [, row] = creditsToCsv([credit]).split('\r\n')
  expect(row).toBe('PLI,Bias & Prevention,2026-03-01,3,No,0,1,0.5,2,1,0,0')
})

it('quotes a field containing a comma', () => {
  const credit: Credit = {
    id: 'a', provider: 'CEB, Inc.', activityTitle: 'Ethics', completionDate: '2026-01-01',
    totalHours: 1, participatory: true, categoryHours: {},
  }
  const [, row] = creditsToCsv([credit]).split('\r\n')
  expect(row.startsWith('"CEB, Inc.",Ethics,')).toBe(true)
})

it('quotes a field containing a double quote and doubles the interior quote', () => {
  const credit: Credit = {
    id: 'a', provider: 'CEB', activityTitle: 'The "Best" Ethics Course', completionDate: '2026-01-01',
    totalHours: 1, participatory: true, categoryHours: {},
  }
  const [, row] = creditsToCsv([credit]).split('\r\n')
  expect(row).toContain('"The ""Best"" Ethics Course"')
})

it('quotes a field containing a newline', () => {
  const credit: Credit = {
    id: 'a', provider: 'CEB', activityTitle: 'Ethics\nPart Two', completionDate: '2026-01-01',
    totalHours: 1, participatory: true, categoryHours: {},
  }
  const [, row] = creditsToCsv([credit]).split('\r\n')
  expect(row).toContain('"Ethics\nPart Two"')
})

it('does not quote a field with no special characters', () => {
  const credit: Credit = {
    id: 'a', provider: 'CEB', activityTitle: 'Plain Title', completionDate: '2026-01-01',
    totalHours: 1, participatory: true, categoryHours: {},
  }
  const [, row] = creditsToCsv([credit]).split('\r\n')
  expect(row.startsWith('CEB,Plain Title,')).toBe(true)
})

it('renders multiple credits as multiple rows', () => {
  const credits: Credit[] = [
    { id: 'a', provider: 'CEB', activityTitle: 'Ethics', completionDate: '2026-01-01', totalHours: 1, participatory: true, categoryHours: { ethics: 1 } },
    { id: 'b', provider: 'PLI', activityTitle: 'Tech', completionDate: '2026-02-01', totalHours: 2, participatory: false, categoryHours: { technology: 2 } },
  ]
  const lines = creditsToCsv(credits).split('\r\n')
  expect(lines).toHaveLength(3)
  expect(lines[1]).toBe('CEB,Ethics,2026-01-01,1,Yes,1,0,0,0,0,0,0')
  expect(lines[2]).toBe('PLI,Tech,2026-02-01,2,No,0,0,0,0,0,2,0')
})
