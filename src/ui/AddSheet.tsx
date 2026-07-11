// ABOUTME: iOS-style action sheet for adding a certificate — Take Photo, Upload PDF or Image, or
// ABOUTME: Enter Manually, plus Cancel. Presentational; the two hidden file inputs are its only I/O.
import type { ChangeEvent } from 'react'

interface Props {
  busy?: boolean
  onFile: (file: File) => void
  onManual: () => void
  onCancel: () => void
}

export function AddSheet({ busy, onFile, onManual, onCancel }: Props) {
  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) onFile(file)
  }

  return (
    <div className="sheet-backdrop" onClick={onCancel}>
      <div className="sheet" onClick={e => e.stopPropagation()}>
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
          onChange={handleChange}
          hidden
        />
        <input
          id="addsheet-upload"
          type="file"
          accept="application/pdf,image/png,image/jpeg,image/webp,image/gif"
          onChange={handleChange}
          hidden
        />
      </div>
    </div>
  )
}
