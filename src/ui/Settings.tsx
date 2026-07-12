// ABOUTME: The gear's landing screen — a menu of account controls: edit name, export credits as
// ABOUTME: CSV (only once there are credits), sign out (only once linked), delete account & data.
import { List } from './List'
import { Row } from './Row'
import { creditsToCsv } from '../report/creditsToCsv'
import type { UserProfile } from '../store/types'
import type { Credit } from '../domain/types'

interface Props {
  accountState: UserProfile['accountState']
  credits: Credit[]
  onBack: () => void
  onEditName: () => void
  onSignOut: () => void
  onDeleteAccount: () => void
  /** Surfaces a failed Sign out attempt (App catches the rejection and passes the message here). */
  error?: string | null
}

// Builds the CSV in memory and hands it to a native <a download> — synchronous, so it stays
// inside the click gesture that iOS Safari requires for a download to actually happen.
function exportCredits(credits: Credit[]) {
  const blob = new Blob([creditsToCsv(credits)], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'clekeeper-credits.csv'
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function Settings({ accountState, credits, onBack, onEditName, onSignOut, onDeleteAccount, error }: Props) {
  return (
    <div className="wrap">
      <div className="topline"><button className="back" onClick={onBack}>‹ Back</button><div className="sp" /></div>
      <h1 className="h1" tabIndex={-1}>Settings</h1>
      {error && <div className="note" style={{ color: '#FF3B30' }}>{error}</div>}

      <List>
        <Row label="Edit name" onClick={onEditName} />
        {credits.length > 0 && (
          <Row label="Export my credits" onClick={() => exportCredits(credits)} />
        )}
        {accountState === 'linked' && (
          <Row label="Sign out" onClick={onSignOut} />
        )}
      </List>

      <button type="button" className="link" style={{ color: '#FF3B30' }} onClick={onDeleteAccount}>
        Delete account & data
      </button>
    </div>
  )
}
