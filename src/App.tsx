// ABOUTME: Root application component — first-run onboarding, populated dashboard, the
// ABOUTME: Add-certificate -> Confirm-and-save flow, and credit-detail, backed by the localStorage credit store.
import { useMemo, useState } from 'react'
import { FirstRun, type FirstRunResult } from './ui/FirstRun'
import { Dashboard } from './ui/Dashboard'
import { AddCertificate } from './ui/AddCertificate'
import { AddCredit } from './ui/AddCredit'
import { CreditDetail } from './ui/CreditDetail'
import { calculateCompliance } from './domain/complianceCalculator'
import { REQUIREMENT_RULES } from './domain/requirements'
import { useCredits } from './store/useCredits'
import type { CreditStore } from './store/creditStore'
import type { ConfirmState } from './parsing/parsedCreditToConfirmState'

type Screen = 'first-run' | 'dashboard' | 'add' | 'confirm' | 'credit'

// What seeds the Confirm screen: a successful parse's draft + flags, or just a fallback
// message (parse failure, or "Enter manually instead") for a blank form.
interface ConfirmSeed {
  draft?: ConfirmState['draft']
  lowConfidenceFields?: ConfirmState['lowConfidenceFields']
  message?: string
}

interface AppProps {
  store?: CreditStore
  today?: string
}

function App({ store, today = new Date().toISOString().slice(0, 10) }: AppProps) {
  const [screen, setScreen] = useState<Screen>('first-run')
  const [onboarding, setOnboarding] = useState<FirstRunResult | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [confirmSeed, setConfirmSeed] = useState<ConfirmSeed | null>(null)
  const { credits, add, update, remove } = useCredits(store)

  const result = useMemo(() => calculateCompliance(REQUIREMENT_RULES, credits), [credits])

  function handleContinue(onboardingResult: FirstRunResult) {
    setOnboarding(onboardingResult)
    setScreen('dashboard')
  }

  if (screen === 'first-run' || !onboarding) {
    return <FirstRun onContinue={handleContinue} today={today} />
  }

  if (screen === 'add') {
    return (
      <AddCertificate
        onParsed={state => { setConfirmSeed({ draft: state.draft, lowConfidenceFields: state.lowConfidenceFields }); setScreen('confirm') }}
        onManual={message => { setConfirmSeed({ message }); setScreen('confirm') }}
        onBack={() => setScreen('dashboard')}
      />
    )
  }

  if (screen === 'confirm') {
    return (
      <AddCredit
        initial={confirmSeed?.draft}
        lowConfidenceFields={confirmSeed?.lowConfidenceFields}
        message={confirmSeed?.message}
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
    <Dashboard
      group={onboarding.group}
      period={onboarding.period}
      result={result}
      credits={credits}
      today={today}
      onAddCredit={() => setScreen('add')}
      onOpenCredit={id => { setSelectedId(id); setScreen('credit') }}
    />
  )
}

export default App
