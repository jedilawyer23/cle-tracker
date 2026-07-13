// ABOUTME: Pure async orchestrator that parses files sequentially through a supplied parseOne,
// ABOUTME: tracking per-file status and stopping early when the daily limit is reached.
import { NotACleCertificateError, DailyLimitReachedError } from './parseCertificate'
import type { BulkItem } from './bulkParseTypes'
import type { ParsedCredit } from '../domain/types'

export interface BulkParseDeps {
  parseOne: (file: File) => Promise<ParsedCredit>
}

export async function runBulkParse(
  files: File[],
  deps: BulkParseDeps,
  onUpdate: (items: BulkItem[]) => void,
): Promise<BulkItem[]> {
  const items: BulkItem[] = files.map(file => ({
    id: crypto.randomUUID(),
    fileName: file.name,
    status: 'pending',
  }))

  for (let i = 0; i < files.length; i++) {
    items[i] = { ...items[i], status: 'parsing' }
    onUpdate([...items])
    try {
      const parsed = await deps.parseOne(files[i])
      items[i] = { ...items[i], status: 'parsed', parsed }
    } catch (err) {
      if (err instanceof NotACleCertificateError) {
        items[i] = { ...items[i], status: 'skipped' }
      } else if (err instanceof DailyLimitReachedError) {
        for (let j = i; j < files.length; j++) {
          items[j] = { ...items[j], status: 'limit' }
        }
        onUpdate([...items])
        return items
      } else {
        items[i] = {
          ...items[i],
          status: 'error',
          error: err instanceof Error ? err.message : 'Something went wrong reading that file.',
        }
      }
    }
    onUpdate([...items])
  }

  return items
}
