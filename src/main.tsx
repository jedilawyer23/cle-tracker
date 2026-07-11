// ABOUTME: App entry point — boots anonymous Firebase auth + a Firestore-backed Store, then
// ABOUTME: mounts the React tree. Imports global CSS (Tailwind first, then design tokens) first.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './ui/tokens.css'
import './ui/components.css'
import App from './App.tsx'
import { auth, db } from './firebase.ts'
import { ensureAnonymousUser } from './auth/bootstrap'
import { FirestoreStore } from './store/firestoreStore'
import { startGoogleLink, completeRedirectLink } from './auth/linkGoogle'
import { messageForOutcome } from './auth/linkOutcome'

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
    // Resolve a pending mobile redirect sign-in (if any) BEFORE creating the store, so a
    // use-existing-account uid switch is already applied to auth.currentUser below.
    const redirectOutcome = await completeRedirectLink(auth, db)
    const uid = auth.currentUser?.uid ?? user.uid
    const store = new FirestoreStore(db, uid)
    await store.ready()
    createRoot(document.getElementById('root')!).render(
      <StrictMode>
        <App
          store={store}
          onLinkGoogle={() => startGoogleLink(auth, db)}
          photoURL={(auth.currentUser ?? user).photoURL}
          initialSignInMessage={redirectOutcome ? messageForOutcome(redirectOutcome) : null}
        />
      </StrictMode>,
    )
  } catch (err) {
    console.error('Boot failed:', err)
    showBootError()
  }
}

boot()
