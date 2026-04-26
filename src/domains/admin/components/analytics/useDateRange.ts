import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { buildRange } from './dateUtils'
import type { AnalyticsRange, AnalyticsRangeKey } from './analytics.types'

const DEFAULT: AnalyticsRangeKey = '30d'
const VALID: ReadonlySet<AnalyticsRangeKey> = new Set(['7d', '30d', '90d', 'ytd'])

export function useDateRange(): {
  range: AnalyticsRange
  setRangeKey: (k: AnalyticsRangeKey) => void
} {
  const [searchParams, setSearchParams] = useSearchParams()
  const raw = searchParams.get('range')
  const key: AnalyticsRangeKey = raw && VALID.has(raw as AnalyticsRangeKey) ? (raw as AnalyticsRangeKey) : DEFAULT

  const range = useMemo(() => buildRange(key), [key])

  const setRangeKey = useCallback(
    (k: AnalyticsRangeKey) => {
      const next = new URLSearchParams(searchParams)
      next.set('range', k)
      setSearchParams(next, { replace: true })
    },
    [searchParams, setSearchParams],
  )

  return { range, setRangeKey }
}
