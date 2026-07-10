// ABOUTME: Top-right "Sign in to save" affordance shown to guest users only.
// ABOUTME: Presentational — parent passes accountState and the link handler.
import type { UserProfile } from '../store/types'

export function SignInToSave(
  { accountState, onSignIn }: { accountState: UserProfile['accountState']; onSignIn: () => void },
) {
  return (
    <div className="topline">
      <div className="sp" />
      {accountState !== 'linked' && (
        <button type="button" className="navbtn" onClick={onSignIn}>Sign in to save</button>
      )}
    </div>
  )
}
