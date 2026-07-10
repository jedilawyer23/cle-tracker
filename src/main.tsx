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
import { linkGoogle } from './auth/linkGoogle'

async function boot() {
  const user = await ensureAnonymousUser(auth)
  const store = new FirestoreStore(db, user.uid)
  await store.ready()
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App store={store} onLinkGoogle={() => linkGoogle(auth, db)} />
    </StrictMode>,
  )
}

boot()
