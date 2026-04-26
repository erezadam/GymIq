import { Lightbulb, AlertTriangle, TrendingUp } from 'lucide-react'
import type { InsightLine } from './analytics.types'

interface InsightStripProps {
  insights: InsightLine[]
}

export function InsightStrip({ insights }: InsightStripProps) {
  if (insights.length === 0) return null
  return (
    <div className="rounded-2xl bg-surface-container border border-dark-border p-4 sm:p-5">
      <p className="text-sm text-on-surface-variant uppercase tracking-wide mb-3">תובנות</p>
      <ul className="space-y-2">
        {insights.map((line, i) => (
          <li key={i} className="flex items-start gap-2 text-base">
            <Icon tone={line.tone} />
            <span className="text-on-surface flex-1">{line.text}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function Icon({ tone }: { tone: InsightLine['tone'] }) {
  if (tone === 'positive')
    return <TrendingUp className="w-4 h-4 text-status-success flex-shrink-0 mt-0.5" aria-hidden="true" />
  if (tone === 'warning')
    return (
      <AlertTriangle className="w-4 h-4 text-status-warning flex-shrink-0 mt-0.5" aria-hidden="true" />
    )
  return <Lightbulb className="w-4 h-4 text-on-surface-variant flex-shrink-0 mt-0.5" aria-hidden="true" />
}
