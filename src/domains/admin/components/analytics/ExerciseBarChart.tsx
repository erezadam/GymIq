import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { ExercisePopularity } from './analytics.types'
import { EmptyState } from './EmptyState'

interface ExerciseBarChartProps {
  data: ExercisePopularity[]
  title?: string
}

export function ExerciseBarChart({ data, title = 'תרגילים פופולריים' }: ExerciseBarChartProps) {
  if (data.length === 0) {
    return (
      <div className="rounded-2xl bg-surface-container border border-dark-border p-4 sm:p-5">
        <h3 className="text-base font-semibold text-on-surface mb-3">{title}</h3>
        <EmptyState title="אין נתונים" description="לא בוצעו תרגילים בטווח הנבחר" />
      </div>
    )
  }
  const chartData = data.map((d) => ({
    name: d.exerciseName,
    value: d.workoutCount,
  }))
  return (
    <div
      className="rounded-2xl bg-surface-container border border-dark-border p-4 sm:p-5"
      role="img"
      aria-label={title}
    >
      <h3 className="text-base font-semibold text-on-surface mb-3">{title}</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
          >
            <CartesianGrid stroke="#1E2430" horizontal={false} />
            <XAxis
              type="number"
              stroke="#bbcac6"
              tick={{ fontSize: 13 }}
              allowDecimals={false}
              orientation="top"
              reversed
            />
            <YAxis
              dataKey="name"
              type="category"
              stroke="#bbcac6"
              tick={{ fontSize: 14 }}
              width={140}
              orientation="right"
            />
            <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(0,212,170,0.08)' }} />
            <Bar
              dataKey="value"
              fill="#00D4AA"
              radius={[0, 6, 6, 0]}
              name="אימונים"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

interface TooltipPayload {
  active?: boolean
  payload?: Array<{ name: string; value: number; payload: { name: string } }>
}

function BarTooltip({ active, payload }: TooltipPayload) {
  if (!active || !payload || payload.length === 0) return null
  const p = payload[0]
  return (
    <div className="rounded-lg bg-surface-container-high border border-dark-border px-3 py-2 text-sm shadow-lg">
      <p className="text-on-surface mb-1">{p.payload.name}</p>
      <p className="text-on-surface-variant">
        אימונים: <span className="text-on-surface font-semibold tabular-nums">{p.value}</span>
      </p>
    </div>
  )
}
