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
import { PastCycles } from './ui/PastCycles'
import { ReportView } from './report/ReportView'
import { buildReportContent } from './report/buildReportContent'
import { calculateCompliance } from './domain/complianceCalculator'
import { creditsInPeriod } from './domain/creditsInPeriod'
import { isDuplicateCredit } from './domain/creditSignature'
import { resolvePeriod } from './domain/resolvePeriod'
import { GROUP_CALENDAR, REQUIREMENT_RULES } from './domain/requirements'
import { useCredits } from './store/useCredits'
import { useParseFile } from './parsing/useParseFile'
import type { Store, UserProfile } from './store/types'
import { messageForOutcome, type LinkOutcome } from './auth/linkOutcome'
import type { ConfirmState } from './parsing/parsedCreditToConfirmState'

type Screen = 'dashboard' | 'confirm' | 'credit' | 'past' | 'settings' | 'report'

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
  /** Injectable so tests can spy on it; defaults to a real full-page reload. */
  reload?: () => void
  /** The signed-in Google account's photo, if any — threaded into the signed-in header's avatar. */
  photoURL?: string | null
}

function App({
  store,
  today = new Date().toISOString().slice(0, 10),
  onLinkGoogle,
  reload = () => window.location.reload(),
  photoURL,
}: AppProps) {
  const [screen, setScreen] = useState<Screen>('dashboard')
  const [ready, setReady] = useState(false)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [confirmSeed, setConfirmSeed] = useState<ConfirmSeed | null>(null)
  const [signInMessage, setSignInMessage] = useState<string | null>(null)
  const [addSheetOpen, setAddSheetOpen] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
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

  // `currentPeriod` is set once at onboarding and otherwise read verbatim — once its reportBy
  // passes it goes stale (new credits stop counting, "days left" goes negative). Re-derive the
  // period containing `today` on every load and migrate the stored profile when it's drifted.
  useEffect(() => {
    if (!profile) return
    const fresh = resolvePeriod(GROUP_CALENDAR[profile.group], today)
    const { currentPeriod } = profile
    const stale = fresh.start !== currentPeriod.start || fresh.end !== currentPeriod.end
      || fresh.reportBy !== currentPeriod.reportBy
    if (!stale) return
    const migrated: UserProfile = { ...profile, currentPeriod: fresh }
    store.saveProfile(migrated)
    setProfile(migrated)
  }, [profile, today, store])

  // Only credits completed within the user's current compliance period count toward the
  // requirement — older or future-dated credits stay in the store but don't count here.
  const scopedCredits = useMemo(
    () => (profile ? creditsInPeriod(credits, profile.currentPeriod) : []),
    [credits, profile],
  )
  const result = useMemo(() => calculateCompliance(REQUIREMENT_RULES, scopedCredits), [scopedCredits])
  // Any credit not counted toward the current period (older/future cycle) is still retained —
  // the Past Cycles screen is where it becomes visible again.
  const hasPastCycles = credits.length > scopedCredits.length

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

  async function handleEditName(result: FirstRunResult) {
    if (!profile) return
    const next: UserProfile = {
      ...profile,
      name: result.name,
      lastName: lastToken(result.name),
      group: result.group,
      currentPeriod: result.period,
    }
    await store.saveProfile(next)
    setProfile(next)
    setScreen('dashboard')
  }

  async function handleSignIn() {
    if (!onLinkGoogle) return
    let outcome: LinkOutcome
    try {
      outcome = await onLinkGoogle()
    } catch {
      // A rejected link attempt must never be a silent no-op — surface a retry prompt.
      setSignInMessage("Couldn't sign in — please try again.")
      return
    }
    // Optimistic UI flip — for the same-uid linked/already-linked cases the real FirestoreStore
    // also confirms this via its live subscription, but reflecting it immediately keeps the
    // affordance from lagging.
    if (outcome.kind === 'linked' || outcome.kind === 'already-linked' || outcome.kind === 'use-existing-account') {
      setProfile(prev => (prev ? { ...prev, accountState: 'linked' } : prev))
    }
    const message = messageForOutcome(outcome)
    if (message !== null) setSignInMessage(message)
    if (outcome.kind === 'use-existing-account') {
      // use-existing-account switched the signed-in uid (and merged the guest's credits into
      // it) out from under the boot-time store, which is still bound to the old uid — reload so
      // main.tsx re-boots a fresh store on the now-current, Google-linked uid.
      reload()
    }
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
        name={profile.name}
        photoURL={photoURL}
        currentPeriod={profile.currentPeriod}
        today={today}
        onUploadFile={parseFile}
        parsing={parseBusy}
        onSave={c => {
          // Same certificate (provider/title/date/hours/type/breakdown, ignoring case and
          // whitespace) already logged — skip the add rather than double-count it.
          if (isDuplicateCredit(c, credits)) {
            setNotice("This certificate is already logged — it wasn't added again.")
          } else {
            setNotice(null)
            add(c)
          }
          setConfirmSeed(null)
          setScreen('dashboard')
        }}
        onBack={() => { setNotice(null); setConfirmSeed(null); setScreen('dashboard') }}
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

  if (screen === 'past') {
    return (
      <PastCycles
        group={profile.group}
        currentPeriod={profile.currentPeriod}
        credits={credits}
        onOpenCredit={id => { setSelectedId(id); setScreen('credit') }}
        onBack={() => setScreen('dashboard')}
      />
    )
  }

  if (screen === 'settings') {
    return (
      <FirstRun
        mode="edit"
        initialName={profile.name}
        today={today}
        onContinue={handleEditName}
        onBack={() => setScreen('dashboard')}
      />
    )
  }

  if (screen === 'report') {
    const content = buildReportContent({
      name: profile.name, group: profile.group, period: profile.currentPeriod,
      result, credits: scopedCredits, today,
    })
    return <ReportView content={content} onBack={() => setScreen('dashboard')} />
  }

  return (
    <>
      <Dashboard
        name={profile.name}
        photoURL={photoURL}
        period={profile.currentPeriod}
        result={result}
        credits={scopedCredits}
        today={today}
        accountState={profile.accountState}
        onSignIn={handleSignIn}
        signInMessage={signInMessage}
        notice={notice}
        onAddCredit={() => { setNotice(null); setAddSheetOpen(true) }}
        onOpenCredit={id => { setNotice(null); setSelectedId(id); setScreen('credit') }}
        hasPastCycles={hasPastCycles}
        onOpenPastCycles={() => { setNotice(null); setScreen('past') }}
        onSettings={() => { setNotice(null); setScreen('settings') }}
        onOpenReport={() => { setNotice(null); setScreen('report') }}
      />
      {addSheetOpen && (
        <AddSheet
          busy={parseBusy}
          onFile={parseFile}
          onManual={() => { setNotice(null); setConfirmSeed(null); setAddSheetOpen(false); setScreen('confirm') }}
          onCancel={() => setAddSheetOpen(false)}
        />
      )}
    </>
  )
}

export default App
