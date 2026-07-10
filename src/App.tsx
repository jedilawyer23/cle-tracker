// ABOUTME: Root application component — first-run onboarding, then the dashboard.
// ABOUTME: Rendered by src/main.tsx into the #root element.
import { useState } from 'react'
import { FirstRun, type FirstRunResult } from './ui/FirstRun'
import { Dashboard } from './ui/Dashboard'
import { calculateCompliance } from './domain/complianceCalculator'
import { REQUIREMENT_RULES } from './domain/requirements'

type Screen = 'first-run' | 'dashboard'

function App() {
  const [screen, setScreen] = useState<Screen>('first-run')
  const [onboarding, setOnboarding] = useState<FirstRunResult | null>(null)

  function handleContinue(result: FirstRunResult) {
    setOnboarding(result)
    setScreen('dashboard')
  }

  if (screen === 'dashboard' && onboarding) {
    const result = calculateCompliance(REQUIREMENT_RULES, [])
    return (
      <Dashboard
        name={onboarding.name}
        group={onboarding.group}
        period={onboarding.period}
        result={result}
      />
    )
  }

  return <FirstRun onContinue={handleContinue} />
}

export default App
