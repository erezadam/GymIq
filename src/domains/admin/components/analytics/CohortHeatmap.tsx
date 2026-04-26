import type { CohortRow } from './analytics.types'

interface CohortHeatmapProps {
  rows: CohortRow[]
}

const WEEK_KEYS: Array<{ key: keyof Pick<CohortRow, 'w1Pct' | 'w2Pct' | 'w4Pct' | 'w8Pct'>; label: string }> = [
  { key: 'w1Pct', label: 'שבוע 1' },
  { key: 'w2Pct', label: 'שבוע 2' },
  { key: 'w4Pct', label: 'שבוע 4' },
  { key: 'w8Pct', label: 'שבוע 8' },
]

export function CohortHeatmap({ rows }: CohortHeatmapProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl bg-surface-container border border-dark-border p-4 sm:p-5">
        <h3 className="text-base font-semibold text-on-surface mb-3">קוהורטים</h3>
        <p className="text-base text-on-surface-variant">אין נתונים זמינים</p>
      </div>
    )
  }
  return (
    <div
      className="rounded-2xl bg-surface-container border border-dark-border p-4 sm:p-5"
      aria-label="טבלת קוהורטים — אחוז משתמשים שחזרו לפי שבוע מההצטרפות"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-on-surface">קוהורטים</h3>
        <span className="text-sm text-on-surface-variant">% החזרה</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-base border-collapse">
          <thead>
            <tr className="text-on-surface-variant text-sm">
              <th className="text-right py-2 pr-2 font-normal">חודש הצטרפות</th>
              <th className="text-right py-2 px-2 font-normal">משתמשים</th>
              {WEEK_KEYS.map((w) => (
                <th key={w.key} className="text-center py-2 px-2 font-normal">
                  {w.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.cohortMonth} className="border-t border-dark-border">
                <td className="py-2 pr-2 text-on-surface">{r.cohortLabel}</td>
                <td className="py-2 px-2 text-on-surface-variant tabular-nums">{r.cohortSize}</td>
                {WEEK_KEYS.map((w) => (
                  <CohortCell key={w.key} value={r[w.key]} cohortSize={r.cohortSize} />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function CohortCell({ value, cohortSize }: { value: number | null; cohortSize: number }) {
  if (value === null || cohortSize === 0) {
    return (
      <td className="py-2 px-2 text-center text-on-surface-variant" aria-label="אין נתונים">
        —
      </td>
    )
  }
  const intensity = Math.min(1, value / 100)
  // Inline rgba is unavoidable: heatmap intensity is data-driven and Tailwind
  // cannot generate runtime opacity values.
  const bg = `rgba(0, 212, 170, ${0.08 + intensity * 0.55})`
  return (
    <td className="py-1 px-1">
      <div
        className="rounded-md py-1.5 text-center text-on-surface tabular-nums text-base font-medium"
        style={{ background: bg }}
      >
        {Math.round(value)}%
      </div>
    </td>
  )
}
