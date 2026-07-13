// ABOUTME: React hook wiring runBulkParse to component state — parses a batch of picked files
// ABOUTME: through the single-cert path (size guard → base64 → parseCertificate) and exposes progress.
import { useCallback, useState } from 'react'
import { fileToBase64, isFileTooLarge } from './fileToBase64'
import { parseCertificate, NotACleCertificateError, DailyLimitReachedError } from './parseCertificate'
import { runBulkParse } from './runBulkParse'
import type { BulkItem } from './bulkParseTypes'

export function useBulkParse() {
  const [items, setItems] = useState<BulkItem[]>([])

  const run = useCallback(async (files: File[]) => {
    const parseOne = async (file: File) => {
      if (isFileTooLarge(file)) {
        throw new Error('That file is too large — please upload a certificate under ~6 MB.')
      }
      const payload = await fileToBase64(file)
      try {
        return await parseCertificate(payload)
      } catch (err) {
        // Let the skip/limit signals through untouched; give everything else the same friendly
        // fallback the single-file path shows instead of a raw callable error.
        if (err instanceof NotACleCertificateError || err instanceof DailyLimitReachedError) throw err
        throw new Error("We couldn't read that certificate. Enter the details manually below.")
      }
    }
    await runBulkParse(files, { parseOne }, setItems)
  }, [])

  return { items, run }
}
