// ABOUTME: History screen listing credits from reporting cycles other than the current one —
// ABOUTME: retained but excluded from the live dashboard's compliance calculation.
import { groupCreditsByPeriod } from '../domain/groupCreditsByPeriod'
import { calculateCompliance } from '../domain/complianceCalculator'
import { REQUIREMENT_RULES, GROUP_CALENDAR } from '../domain/requirements'
import { formatDate } from './formatDate'
import { activateOnKey } from './activateOnKey'
import type { Credit, Group, Period } from '../domain/types'

interface Props {
  group: Group
  currentPeriod: Period
  credits: Credit[]
  onOpenCredit: (id: string) => void
  onBack: () => void
}

export function PastCycles({ group, currentPeriod, credits, onOpenCredit, onBack }: Props) {
  const groups = groupCreditsByPeriod(credits, GROUP_CALENDAR[group])
    .filter(g => g.period.reportBy !== currentPeriod.reportBy)

  return (
    <div className="wrap">
      <div className="topline"><button className="back" onClick={onBack}>‹ Back</button><div className="sp" /></div>
      <h1 className="h1">Past cycles</h1>

      {groups.length === 0 && (
        <div className="note">No credits from prior reporting cycles.</div>
      )}

      {groups.map(({ period, credits: cycleCredits }) => {
        const result = calculateCompliance(REQUIREMENT_RULES, cycleCredits)
        const totalRule = result.progress.find(p => p.key === 'total')!
        return (
          <div key={period.reportBy}>
            <div className="label">{formatDate(period.start)} – {formatDate(period.end)}</div>
            {result.compliant
              ? <div className="sub" style={{ color: 'var(--good)' }}>Compliant</div>
              : <div className="sub">{totalRule.earned} of {totalRule.required} hrs · not compliant</div>}
            <div className="list">
              {cycleCredits.map(credit => (
                <div className="row tap" key={credit.id} role="button" tabIndex={0}
                  onClick={() => onOpenCredit(credit.id)} onKeyDown={activateOnKey(() => onOpenCredit(credit.id))}>
                  <div className="t">
                    <div className="n">{credit.activityTitle}</div>
                    <div className="m q">{credit.provider} · {formatDate(credit.completionDate)}</div>
                  </div>
                  <div className="val">{credit.totalHours} hr</div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
