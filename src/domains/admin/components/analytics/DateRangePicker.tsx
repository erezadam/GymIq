import type { AnalyticsRangeKey } from './analytics.types'
import { RANGE_LABELS } from './dateUtils'

interface DateRangePickerProps {
  value: AnalyticsRangeKey
  onChange: (key: AnalyticsRangeKey) => void
}

const ORDER: AnalyticsRangeKey[] = ['7d', '30d', '90d', 'ytd']

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  return (
    <div
      role="radiogroup"
      aria-label="טווח זמן"
      className="inline-flex rounded-xl border border-dark-border bg-surface-container-low p-1"
    >
      {ORDER.map((key) => {
        const active = value === key
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(key)}
            className={`min-h-[36px] px-3 rounded-lg text-base font-medium transition-colors ${
              active
                ? 'bg-primary-main/15 text-primary-main'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {RANGE_LABELS[key]}
          </button>
        )
      })}
    </div>
  )
}
