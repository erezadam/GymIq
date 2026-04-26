import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { MonthlyFrequencyPoint } from './analytics.types'

interface MonthlyFrequencyChartProps {
  data: MonthlyFrequencyPoint[]
}

export function MonthlyFrequencyChart({ data }: MonthlyFrequencyChartProps) {
  return (
    <div
      className="rounded-2xl bg-surface-container border border-dark-border p-4 sm:p-5"
      role="img"
      aria-label="ממוצע אימונים שבועי לחצי שנה"
    >
      <h3 className="text-base font-semibold text-on-surface mb-3">
        ממוצע אימונים שבועי — 6 חודשים אחרונים
      </h3>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#1E2430" vertical={false} />
            <XAxis
              dataKey="label"
              stroke="#bbcac6"
              tick={{ fontSize: 13 }}
              reversed
            />
            <YAxis
              stroke="#bbcac6"
              tick={{ fontSize: 13 }}
              orientation="right"
              width={32}
              allowDecimals
            />
            <Tooltip content={<MonthTooltip />} cursor={{ fill: 'rgba(139,92,246,0.08)' }} />
            <Bar dataKey="avgWeeklyWorkouts" fill="#8B5CF6" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

interface TooltipPayload {
  active?: boolean
  payload?: Array<{ value: number; payload: MonthlyFrequencyPoint }>
}

function MonthTooltip({ active, payload }: TooltipPayload) {
  if (!active || !payload || payload.length === 0) return null
  const p = payload[0]
  return (
    <div className="rounded-lg bg-surface-container-high border border-dark-border px-3 py-2 text-sm shadow-lg">
      <p className="text-on-surface mb-1">{p.payload.label}</p>
      <p className="text-on-surface-variant">
        ממוצע שבועי:{' '}
        <span className="text-on-surface font-semibold tabular-nums">{p.value.toFixed(1)}</span>
      </p>
    </div>
  )
}
