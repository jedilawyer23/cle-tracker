// ABOUTME: Verifies runBulkParse walks files sequentially, tracking per-file status and stopping
// ABOUTME: early on the daily limit. parseOne is a plain mock — no React, no network.
import { describe, it, expect, vi } from 'vitest'
import { runBulkParse } from '../runBulkParse'
import { NotACleCertificateError, DailyLimitReachedError } from '../parseCertificate'
import type { BulkItem } from '../bulkParseTypes'
import type { ParsedCredit } from '../../domain/types'

const parsed: ParsedCredit = {
  provider: 'PLI', activityTitle: 'AI Law', completionDate: '2026-06-18',
  totalHours: 1.5, participatory: true, categoryHours: { technology: 1 },
  confidence: { provider: 'high', activityTitle: 'high', completionDate: 'high', totalHours: 'high', participatory: 'low', categoryHours: 'high' },
}

function file(name: string) {
  return new File([new Uint8Array([65, 66, 67])], name, { type: 'application/pdf' })
}

function statuses(items: BulkItem[]) {
  return items.map(i => i.status)
}

describe('runBulkParse', () => {
  it('parses each file, skipping ones rejected as non-certificates', async () => {
    const parseOne = vi.fn(async (f: File) => {
      if (f.name === 'b.pdf') throw new NotACleCertificateError()
      return parsed
    })
    const items = await runBulkParse([file('a.pdf'), file('b.pdf'), file('c.pdf')], { parseOne }, vi.fn())
    expect(statuses(items)).toEqual(['parsed', 'skipped', 'parsed'])
    expect(parseOne).toHaveBeenCalledTimes(3)
    expect(items[0].parsed).toEqual(parsed)
    expect(items[2].parsed).toEqual(parsed)
  })

  it('stops at the daily limit, marking the current and remaining files as limit-blocked', async () => {
    const parseOne = vi.fn(async (f: File) => {
      if (f.name === 'b.pdf') throw new DailyLimitReachedError()
      return parsed
    })
    const onUpdate = vi.fn()
    const items = await runBulkParse([file('a.pdf'), file('b.pdf'), file('c.pdf')], { parseOne }, onUpdate)
    expect(statuses(items)).toEqual(['parsed', 'limit', 'limit'])
    expect(parseOne).toHaveBeenCalledTimes(2)
    const lastSnapshot = onUpdate.mock.calls[onUpdate.mock.calls.length - 1][0]
    expect(statuses(lastSnapshot)).toEqual(['parsed', 'limit', 'limit'])
  })

  it('records a generic failure as an error and keeps going', async () => {
    const parseOne = vi.fn(async (f: File) => {
      if (f.name === 'b.pdf') throw new Error('unreadable')
      return parsed
    })
    const items = await runBulkParse([file('a.pdf'), file('b.pdf'), file('c.pdf')], { parseOne }, vi.fn())
    expect(statuses(items)).toEqual(['parsed', 'error', 'parsed'])
    expect(parseOne).toHaveBeenCalledTimes(3)
    expect(items[1].error).toBeTruthy()
  })

  it('emits a snapshot after each transition and returns the final one', async () => {
    const parseOne = vi.fn(async () => parsed)
    const onUpdate = vi.fn()
    const items = await runBulkParse([file('a.pdf'), file('b.pdf')], { parseOne }, onUpdate)
    // Two files, each transitioning parsing -> parsed, is four emitted snapshots.
    expect(onUpdate).toHaveBeenCalledTimes(4)
    expect(statuses(onUpdate.mock.calls[0][0])).toEqual(['parsing', 'pending'])
    expect(statuses(onUpdate.mock.calls[1][0])).toEqual(['parsed', 'pending'])
    expect(statuses(onUpdate.mock.calls[2][0])).toEqual(['parsed', 'parsing'])
    const lastSnapshot = onUpdate.mock.calls[3][0]
    expect(lastSnapshot).toEqual(items)
    expect(statuses(items)).toEqual(['parsed', 'parsed'])
  })
})
