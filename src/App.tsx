// ABOUTME: Root application component — first-run onboarding, populated dashboard, add-credit,
// ABOUTME: and credit-detail screens, all backed by the localStorage credit store.
import { useMemo, useState } from 'react'
import { FirstRun, type FirstRunResult } from './ui/FirstRun'
import { Dashboard } from './ui/Dashboard'
import { AddCredit } from './ui/AddCredit'
import { CreditDetail } from './ui/CreditDetail'
import { calculateCompliance } from './domain/complianceCalculator'
import { REQUIREMENT_RULES } from './domain/requirements'
import { useCredits } from './store/useCredits'
import type { CreditStore } from './store/creditStore'

type Screen = 'first-run' | 'dashboard' | 'add' | 'credit'

interface AppProps {
  store?: CreditStore
  today?: string
}

function App({ store, today = new Date().toISOString().slice(0, 10) }: AppProps) {
  const [screen, setScreen] = useState<Screen>('first-run')
  const [onboarding, setOnboarding] = useState<FirstRunResult | null>(null)
  const [selectedId, setSelectedId] = useState<string | null>(null)
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
      <AddCredit
        onSave={c => { add(c); setScreen('dashboard') }}
        onBack={() => setScreen('dashboard')}
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
