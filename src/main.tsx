// ABOUTME: App entry point — mounts the React tree into #root.
// ABOUTME: Imports global CSS (Tailwind first, then design tokens) before rendering.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './ui/tokens.css'
import './ui/components.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
