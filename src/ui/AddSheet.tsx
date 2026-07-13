// ABOUTME: iOS-style action sheet for adding a certificate — Take Photo, Upload PDF or Image, or
// ABOUTME: Enter Manually, plus Cancel. A modal dialog: focus moves in on open, Escape or the
// ABOUTME: backdrop cancels, and focus returns to whatever opened it once it closes.
import { useEffect, useRef, type ChangeEvent, type KeyboardEvent } from 'react'

interface Props {
  busy?: boolean
  onFile: (file: File) => void
  onFiles: (files: File[]) => void
  onManual: () => void
  onCancel: () => void
}

export function AddSheet({ busy, onFile, onFiles, onManual, onCancel }: Props) {
  const sheetRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    sheetRef.current?.focus()
    return () => opener?.focus()
  }, [])

  function handleCamera(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) onFile(file)
  }

  function handleUpload(e: ChangeEvent<HTMLInputElement>) {
    const files = e.target.files ? Array.from(e.target.files) : []
    e.target.value = ''
    if (files.length > 0) onFiles(files)
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') onCancel()
  }

  return (
    <div className="sheet-backdrop" onClick={onCancel}>
      <div
        className="sheet"
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label="Add a certificate"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        onClick={e => e.stopPropagation()}
      >
        {busy ? (
          <div className="sheet-busy">Reading…</div>
        ) : (
          <>
            <div className="sheet-options">
              <label className="sheet-row" htmlFor="addsheet-camera">Take Photo</label>
              <label className="sheet-row" htmlFor="addsheet-upload">Upload PDF or Image</label>
              <button type="button" className="sheet-row" onClick={onManual}>Enter Manually</button>
            </div>
            <button type="button" className="sheet-cancel" onClick={onCancel}>Cancel</button>
          </>
        )}
        <input
          id="addsheet-camera"
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleCamera}
          hidden
        />
        <input
          id="addsheet-upload"
          type="file"
          accept="application/pdf,image/png,image/jpeg,image/webp,image/gif"
          multiple
          onChange={handleUpload}
          hidden
        />
      </div>
    </div>
  )
}
