// ABOUTME: Types for the bulk certificate parse flow — one BulkItem per picked file, tracking its
// ABOUTME: progress through the sequential parse orchestration. Plain data, no React or I/O.
import type { ParsedCredit } from '../domain/types'

export type BulkStatus = 'pending' | 'parsing' | 'parsed' | 'skipped' | 'error' | 'limit'

export interface BulkItem {
  id: string
  fileName: string
  status: BulkStatus
  parsed?: ParsedCredit
  error?: string
}
