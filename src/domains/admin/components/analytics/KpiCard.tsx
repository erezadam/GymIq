import { ArrowDown, ArrowUp, Minus } from 'lucide-react'
import type { KpiValue } from './analytics.types'

interface KpiCardProps {
  label: string
  kpi: KpiValue
  hint?: string
}

export function KpiCard({ label, kpi, hint }: KpiCardProps) {
  const display = kpi.display ?? formatNumber(kpi.value)
  const deltaText =
    kpi.deltaPct === null
      ? '—'
      : `${kpi.deltaPct > 0 ? '+' : ''}${Math.round(kpi.deltaPct)}%`

  const trendColor =
    kpi.trend === 'up'
      ? 'text-status-success'
      : kpi.trend === 'down'
        ? 'text-status-error'
        : 'text-on-surface-variant'

  const TrendIcon =
    kpi.trend === 'up' ? ArrowUp : kpi.trend === 'down' ? ArrowDown : Minus

  return (
    <div className="rounded-2xl bg-surface-container border border-dark-border p-4 sm:p-5">
      <p className="text-sm text-on-surface-variant uppercase tracking-wide">{label}</p>
      <div className="mt-2 flex items-end justify-between gap-3">
        <span className="text-2xl sm:text-3xl font-bold text-on-surface tabular-nums">
          {display}
        </span>
        <span
          className={`inline-flex items-center gap-1 text-sm font-medium ${trendColor}`}
          aria-label={`שינוי ${deltaText}`}
        >
          <TrendIcon className="w-3.5 h-3.5" aria-hidden="true" />
          <span className="tabular-nums">{deltaText}</span>
        </span>
      </div>
      {hint && <p className="mt-2 text-sm text-on-surface-variant">{hint}</p>}
    </div>
  )
}

function formatNumber(n: number): string {
  if (Number.isInteger(n)) return n.toLocaleString('he-IL')
  return n.toFixed(1)
}
