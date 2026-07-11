// ABOUTME: Top-right account affordance — a "Sign in to save" pill for guests, or a signed-in
// ABOUTME: "whoami" pill (avatar/photo, name, Google mark) once the account is linked to Google.
import type { UserProfile } from '../store/types'
import { Wordmark } from './Wordmark'

function initials(name?: string): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return ''
  const first = parts[0]!.charAt(0)
  const last = parts.length > 1 ? parts[parts.length - 1]!.charAt(0) : ''
  return (first + last).toUpperCase()
}

export interface SignInToSaveProps {
  accountState: UserProfile['accountState']
  onSignIn: () => void
  name?: string
  photoURL?: string | null
  /** Renders a leading "‹ Back" control before the spacer — used by the Confirm screen header. */
  onBack?: () => void
  /** Shows the leading brand wordmark (dashboard header); ignored on the back-header variant. */
  brand?: boolean
  /** Shows a settings gear before the account pill; ignored on the back-header variant. */
  onSettings?: () => void
}

export function SignInToSave({ accountState, onSignIn, name, photoURL, onBack, brand, onSettings }: SignInToSaveProps) {
  return (
    <div className="topline">
      {onBack
        ? <button className="back" onClick={onBack}>‹ Back</button>
        : brand && <Wordmark />}
      <div className="sp" />
      {!onBack && onSettings && (
        <button className="gearbtn" aria-label="Settings" onClick={onSettings}>⚙︎</button>
      )}
      {accountState === 'linked' ? (
        <span className="whoami">
          {photoURL
            ? <img className="avatar" src={photoURL} alt="" />
            : <span className="avatar">{initials(name)}</span>}
          <span className="nm">{name}</span>
          <span className="g" aria-hidden="true" />
        </span>
      ) : (
        <button type="button" className="navbtn" onClick={onSignIn}>Sign in to save</button>
      )}
    </div>
  )
}
