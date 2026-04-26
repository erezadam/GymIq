import type { UserSegmentation } from './analytics.types'

interface UserSegmentBarProps {
  segmentation: UserSegmentation
}

export function UserSegmentBar({ segmentation }: UserSegmentBarProps) {
  const { traineesOnly, trainersWhoTrain, trainersOnly, total } = segmentation
  if (total === 0) {
    return (
      <div className="rounded-xl border border-dark-border bg-surface-container-low p-4 text-base text-on-surface-variant">
        אין משתמשים במערכת עדיין
      </div>
    )
  }

  const segments: Array<{ label: string; count: number; bg: string; textColor: string }> = [
    {
      label: 'מתאמנים',
      count: traineesOnly,
      bg: 'bg-primary-main/70',
      textColor: 'text-on-surface',
    },
    {
      label: 'מאמנים שגם מתאמנים',
      count: trainersWhoTrain,
      bg: 'bg-accent-purple/70',
      textColor: 'text-on-surface',
    },
    {
      label: 'מאמנים בלבד',
      count: trainersOnly,
      bg: 'bg-status-warning/70',
      textColor: 'text-on-surface',
    },
  ]

  return (
    <div
      className="rounded-2xl bg-surface-container border border-dark-border p-4 sm:p-5"
      aria-label="פילוח משתמשים"
    >
      <p className="text-sm text-on-surface-variant uppercase tracking-wide">פילוח משתמשים</p>
      <div className="mt-3 flex items-center gap-1 h-3 rounded-full overflow-hidden bg-surface-container-low">
        {segments.map((s) => {
          const pct = total > 0 ? (s.count / total) * 100 : 0
          if (pct === 0) return null
          // Inline width is unavoidable here: Tailwind cannot generate
          // `w-[N%]` for arbitrary runtime N. This is a data-driven dimension,
          // not styling.
          return (
            <div
              key={s.label}
              className={s.bg}
              style={{ width: `${pct}%` }}
              role="img"
              aria-label={`${s.label}: ${s.count}`}
            />
          )
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-base">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-sm ${s.bg}`} aria-hidden="true" />
            <span className="text-on-surface-variant">{s.label}</span>
            <span className={`font-semibold tabular-nums ${s.textColor}`}>{s.count}</span>
          </div>
        ))}
        <div className="flex items-center gap-2 ms-auto">
          <span className="text-on-surface-variant">סה"כ</span>
          <span className="font-semibold text-on-surface tabular-nums">{total}</span>
        </div>
      </div>
    </div>
  )
}
