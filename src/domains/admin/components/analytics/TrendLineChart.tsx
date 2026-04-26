import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { DailyTrendPoint } from './analytics.types'

interface TrendLineChartProps {
  data: DailyTrendPoint[]
  ariaLabel?: string
}

export function TrendLineChart({ data, ariaLabel = 'מגמה יומית' }: TrendLineChartProps) {
  const chartData = data.map((p) => ({
    dateKey: p.dateKey,
    label: shortLabel(p.date),
    dau: p.dau,
    workouts: p.workouts,
  }))

  return (
    <div
      className="rounded-2xl bg-surface-container border border-dark-border p-4 sm:p-5"
      role="img"
      aria-label={ariaLabel}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-on-surface">מגמה יומית</h3>
        <span className="text-sm text-on-surface-variant">{data.length} ימים</span>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
          >
            <CartesianGrid stroke="#1E2430" vertical={false} />
            <XAxis
              dataKey="label"
              stroke="#bbcac6"
              tick={{ fontSize: 13 }}
              interval="preserveStartEnd"
              minTickGap={24}
              reversed
            />
            <YAxis
              stroke="#bbcac6"
              tick={{ fontSize: 13 }}
              orientation="right"
              width={40}
              allowDecimals={false}
            />
            <Tooltip content={<TrendTooltip />} />
            <Legend
              verticalAlign="top"
              align="right"
              iconType="plainline"
              wrapperStyle={{ fontSize: 14, color: '#bbcac6' }}
            />
            <Line
              type="monotone"
              dataKey="dau"
              name="משתמשים פעילים"
              stroke="#00D4AA"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="workouts"
              name="אימונים"
              stroke="#8B5CF6"
              strokeWidth={2}
              strokeDasharray="4 4"
              dot={false}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

function shortLabel(d: Date): string {
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}.${mm}`
}

interface TooltipPayload {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
}

function TrendTooltip({ active, payload, label }: TooltipPayload) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="rounded-lg bg-surface-container-high border border-dark-border px-3 py-2 text-sm shadow-lg">
      <p className="text-on-surface-variant mb-1">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span
            className={`w-2.5 h-2.5 rounded-sm ${
              p.color === '#00D4AA' ? 'bg-primary-main' : 'bg-accent-purple'
            }`}
            aria-hidden="true"
          />
          <span className="text-on-surface">{p.name}</span>
          <span className="text-on-surface font-semibold tabular-nums ms-auto">{p.value}</span>
        </div>
      ))}
    </div>
  )
}
