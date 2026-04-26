import type { DailyHeatmapCell } from './analytics.types'
import { hebShortDate } from './dateUtils'

interface ActivityHeatmapProps {
  cells: DailyHeatmapCell[]
}

const BUCKET_BG: Record<DailyHeatmapCell['bucket'], string> = {
  0: 'bg-surface-container-low',
  1: 'bg-primary-main/25',
  2: 'bg-primary-main/55',
  3: 'bg-primary-main/90',
}

export function ActivityHeatmap({ cells }: ActivityHeatmapProps) {
  if (cells.length === 0) return null
  // Group into columns of 7 (week per column)
  const columns: DailyHeatmapCell[][] = []
  for (let i = 0; i < cells.length; i += 7) {
    columns.push(cells.slice(i, i + 7))
  }

  return (
    <div className="rounded-2xl bg-surface-container border border-dark-border p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold text-on-surface">פעילות 90 ימים</h3>
        <Legend />
      </div>
      <div
        className="flex gap-1 overflow-x-auto pb-1"
        role="img"
        aria-label="לוח פעילות אימונים ב-90 הימים האחרונים"
      >
        {columns.map((col, ci) => (
          <div key={ci} className="flex flex-col gap-1">
            {col.map((c) => (
              <div
                key={c.dateKey}
                className={`w-3.5 h-3.5 rounded-[3px] ${BUCKET_BG[c.bucket]}`}
                title={`${hebShortDate(c.date)} — ${c.workoutCount} אימונים`}
                aria-label={`${hebShortDate(c.date)}: ${c.workoutCount} אימונים`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function Legend() {
  return (
    <div className="flex items-center gap-1.5 text-[11px] text-on-surface-variant">
      <span>פחות</span>
      {[0, 1, 2, 3].map((b) => (
        <span
          key={b}
          className={`w-3 h-3 rounded-[3px] ${BUCKET_BG[b as 0 | 1 | 2 | 3]}`}
          aria-hidden="true"
        />
      ))}
      <span>יותר</span>
    </div>
  )
}
