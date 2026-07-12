// ABOUTME: App entry point — boots anonymous Firebase auth + a Firestore-backed Store, then
// ABOUTME: mounts the React tree. Imports global CSS (Tailwind first, then design tokens) first.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './ui/tokens.css'
import './ui/components.css'
import './ui/report.css'
import { signOut } from 'firebase/auth'
import App from './App.tsx'
import { auth, db } from './firebase.ts'
import { ensureAnonymousUser } from './auth/bootstrap'
import { FirestoreStore } from './store/firestoreStore'
import { startGoogleLink, completeRedirectLink } from './auth/linkGoogle'
import { deleteAccount } from './auth/deleteAccount'

function showBootError() {
  const root = document.getElementById('root')
  if (!root) return
  root.innerHTML =
    '<div style="min-height:100vh;display:grid;place-items:center;padding:24px;text-align:center;' +
    'font-family:-apple-system,BlinkMacSystemFont,system-ui,sans-serif;color:#1C1C1E">' +
    '<div><div style="font-size:19px;font-weight:600;margin-bottom:8px">Couldn\'t connect</div>' +
    '<div style="color:#8E8E93;font-size:15px;margin-bottom:20px">Check your connection and try again.</div>' +
    '<button onclick="location.reload()" style="background:#007AFF;color:#fff;border:0;border-radius:12px;' +
    'font-size:16px;font-weight:600;padding:12px 24px">Reload</button></div></div>'
}

async function boot() {
  try {
    const user = await ensureAnonymousUser(auth)
    // Finalize a pending mobile redirect sign-in BEFORE binding the store, so a use-existing-account
    // uid switch is applied first — otherwise the store binds to the guest uid and credits added in
    // that window get orphaned. The success-path accountState write is backgrounded inside
    // completeRedirectLink, so this resolves promptly and no longer stalls the redirect return.
    await completeRedirectLink(auth, db)
    const uid = auth.currentUser?.uid ?? user.uid
    const store = new FirestoreStore(db, uid)
    // Paint without awaiting store.ready() — App shows its own loading state until the store
    // settles, so a slow first snapshot can't leave the page stuck on a blank screen.
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <App
          store={store}
          onLinkGoogle={() => startGoogleLink(auth, db)}
          photoURL={(auth.currentUser ?? user).photoURL}
          onSignOut={async () => { await signOut(auth); window.location.reload() }}
          onDeleteAccount={() => deleteAccount(auth, db)}
        />
      </StrictMode>,
    )
  } catch (err) {
    console.error('Boot failed:', err)
    showBootError()
  }
}

boot()
