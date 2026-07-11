// ABOUTME: Root application component — first-run onboarding (persisted to the injected async
// ABOUTME: Store), the populated dashboard with its Add-certificate action sheet, Confirm-and-save,
// ABOUTME: credit detail, and Google account linking via Sign-in-to-save. Backed by any async Store
// ABOUTME: (FirestoreStore in production, the in-memory fake Store in tests).
import { useEffect, useMemo, useState } from 'react'
import { FirstRun, type FirstRunResult } from './ui/FirstRun'
import { lastToken } from './ui/lastToken'
import { Dashboard } from './ui/Dashboard'
import { AddSheet } from './ui/AddSheet'
import { AddCredit } from './ui/AddCredit'
import { CreditDetail } from './ui/CreditDetail'
import { calculateCompliance } from './domain/complianceCalculator'
import { creditsInPeriod } from './domain/creditsInPeriod'
import { REQUIREMENT_RULES } from './domain/requirements'
import { useCredits } from './store/useCredits'
import { useParseFile } from './parsing/useParseFile'
import type { Store, UserProfile } from './store/types'
import type { LinkOutcome } from './auth/linkOutcome'
import type { ConfirmState } from './parsing/parsedCreditToConfirmState'

type Screen = 'dashboard' | 'confirm' | 'credit'

// What seeds the Confirm screen: a successful parse's draft + flags, or just a fallback
// message (parse failure, or "Enter manually instead") for a blank form.
interface ConfirmSeed {
  draft?: ConfirmState['draft']
  lowConfidenceFields?: ConfirmState['lowConfidenceFields']
  message?: string
}

interface AppProps {
  store: Store
  today?: string
  onLinkGoogle?: () => Promise<LinkOutcome>
}

function messageForOutcome(outcome: LinkOutcome): string | null {
  switch (outcome.kind) {
    case 'linked':
    case 'already-linked':
      return 'Saved to your Google account.'
    case 'use-existing-account':
      return "You already have an account — signed you in. Credits added in this guest session weren't carried over."
    case 'error':
      return "Couldn't sign in — please try again."
    case 'cancelled':
      // Silent — the user closed/blocked the popup themselves; leave the UI unchanged.
      return null
  }
}

function App({ store, today = new Date().toISOString().slice(0, 10), onLinkGoogle }: AppProps) {
  const [screen, setScreen] = useState<Screen>('dashboard')
  const [ready, setReady] = useState(false)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [confirmSeed, setConfirmSeed] = useState<ConfirmSeed | null>(null)
  const [signInMessage, setSignInMessage] = useState<string | null>(null)
  const [addSheetOpen, setAddSheetOpen] = useState(false)
  const { credits, add, update, remove } = useCredits(store)
  const { busy: parseBusy, parseFile } = useParseFile(
    state => {
      setConfirmSeed({ draft: state.draft, lowConfidenceFields: state.lowConfidenceFields })
      setAddSheetOpen(false)
      setScreen('confirm')
    },
    message => {
      setConfirmSeed({ message })
      setAddSheetOpen(false)
      setScreen('confirm')
    },
  )

  // Boot: wait for the store's initial load, then track its profile live (covers both the
  // first-run write below and any external change, e.g. Firestore's onSnapshot after linking).
  useEffect(() => {
    let cancelled = false
    store.ready().then(() => {
      if (cancelled) return
      setProfile(store.getProfile())
      setReady(true)
    })
    const unsubscribe = store.subscribe(() => {
      if (!cancelled) setProfile(store.getProfile())
    })
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [store])

  // Only credits completed within the user's current compliance period count toward the
  // requirement — older or future-dated credits stay in the store but don't count here.
  const scopedCredits = useMemo(
    () => (profile ? creditsInPeriod(credits, profile.currentPeriod) : []),
    [credits, profile],
  )
  const result = useMemo(() => calculateCompliance(REQUIREMENT_RULES, scopedCredits), [scopedCredits])

  async function handleContinue(onboardingResult: FirstRunResult) {
    const newProfile: UserProfile = {
      name: onboardingResult.name,
      lastName: lastToken(onboardingResult.name),
      group: onboardingResult.group,
      admissionDate: null,
      accountState: 'guest',
      currentPeriod: onboardingResult.period,
      requirementsVersion: today,
    }
    await store.saveProfile(newProfile)
    setProfile(newProfile)
  }

  async function handleSignIn() {
    if (!onLinkGoogle) return
    const outcome = await onLinkGoogle()
    // Optimistic UI flip — the real FirestoreStore also confirms this via its live
    // subscription, but reflecting it immediately keeps the affordance from lagging.
    if (outcome.kind === 'linked' || outcome.kind === 'already-linked') {
      setProfile(prev => (prev ? { ...prev, accountState: 'linked' } : prev))
    }
    const message = messageForOutcome(outcome)
    if (message !== null) setSignInMessage(message)
  }

  if (!ready) {
    return (
      <div className="wrap" aria-busy="true">
        <div className="sub">Loading…</div>
      </div>
    )
  }

  if (!profile) {
    return <FirstRun onContinue={handleContinue} today={today} />
  }

  if (screen === 'confirm') {
    return (
      <AddCredit
        initial={confirmSeed?.draft}
        lowConfidenceFields={confirmSeed?.lowConfidenceFields}
        message={confirmSeed?.message}
        accountState={profile.accountState}
        onSignIn={handleSignIn}
        signInMessage={signInMessage}
        onSave={c => { add(c); setConfirmSeed(null); setScreen('dashboard') }}
        onBack={() => { setConfirmSeed(null); setScreen('dashboard') }}
      />
    )
  }

  if (screen === 'credit') {
    const found = credits.find(c => c.id === selectedId)
    if (found) {
      return (
        <CreditDetail
          credit={found}
          onUpdate={(id, patch) => { update(id, patch) }}
          onRemove={id => { remove(id); setScreen('dashboard') }}
          onBack={() => setScreen('dashboard')}
        />
      )
    }
    // Credit no longer exists (e.g. removed elsewhere) — fall through to the dashboard.
  }

  return (
    <>
      <Dashboard
        group={profile.group}
        period={profile.currentPeriod}
        result={result}
        credits={scopedCredits}
        today={today}
        accountState={profile.accountState}
        onSignIn={handleSignIn}
        signInMessage={signInMessage}
        onAddCredit={() => setAddSheetOpen(true)}
        onOpenCredit={id => { setSelectedId(id); setScreen('credit') }}
      />
      {addSheetOpen && (
        <AddSheet
          busy={parseBusy}
          onFile={parseFile}
          onManual={() => { setConfirmSeed(null); setAddSheetOpen(false); setScreen('confirm') }}
          onCancel={() => setAddSheetOpen(false)}
        />
      )}
    </>
  )
}

export default App
