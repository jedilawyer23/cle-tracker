// ABOUTME: Confirmation screen for "Delete account & data" — states what's about to be lost,
// ABOUTME: then Cancel or a destructive Delete that shows busy/error state while it runs.
interface Props {
  creditsCount: number
  busy?: boolean
  error?: string | null
  onCancel: () => void
  onConfirm: () => void
}

export function DeleteAccountConfirm({ creditsCount, busy, error, onCancel, onConfirm }: Props) {
  return (
    <div className="wrap">
      <div className="topline"><button className="back" onClick={onCancel}>‹ Back</button><div className="sp" /></div>
      <h1 className="h1">Delete account & data</h1>
      <div className="sub">
        This permanently deletes your profile and all {creditsCount} logged credit{creditsCount === 1 ? '' : 's'},
        and removes your account. This can't be undone.
      </div>

      {error && <div className="note" style={{ color: '#FF3B30' }}>{error}</div>}

      <button type="button" className="btn" style={{ background: '#FF3B30' }} disabled={busy} onClick={onConfirm}>
        {busy ? 'Deleting…' : 'Delete account & data'}
      </button>
      <button type="button" className="link" disabled={busy} onClick={onCancel}>Cancel</button>
    </div>
  )
}
