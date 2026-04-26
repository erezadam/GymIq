/**
 * Single source of truth for the analytics dataset.
 *
 * This is the ONE hook to swap when we move from client-side aggregation to
 * a pre-aggregated collection (e.g., `analytics_daily`). The `queryFn` below
 * is the only IO line that needs to change — everything downstream
 * (aggregations, components) consumes the resulting AnalyticsDataset.
 */
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  getAllUsersForAnalytics,
  getCompletedWorkoutsInRange,
} from '@/lib/firebase/analyticsQueries'
import { addDays, buildPreviousRange, startOfDay } from './dateUtils'
import { buildLast90DaysDataset } from './aggregations'
import type {
  AnalyticsComparisonDataset,
  AnalyticsDataset,
  AnalyticsRange,
} from './analytics.types'
import type { WorkoutHistoryEntry } from '@/domains/workouts/types'

interface UseAnalyticsDataResult {
  isLoading: boolean
  isError: boolean
  error: unknown
  refetch: () => void
  current: AnalyticsDataset | null
  previous: AnalyticsComparisonDataset | null
  /** Workouts in the trailing 90 days from `range.to` — used for cohorts and "trainer also a trainee". */
  workoutsLast90Days: WorkoutHistoryEntry[]
  /** All workouts loaded — used for cohort retention table going further back. */
  workoutsExtended: WorkoutHistoryEntry[]
}

export function useAnalyticsData(range: AnalyticsRange): UseAnalyticsDataResult {
  const previousRange = useMemo(() => buildPreviousRange(range), [range])

  // Query a span large enough to cover:
  // - The current range
  // - The previous comparison range
  // - The trailing 90 days for "trainer also a trainee" check
  // - 6 months back for cohort retention table
  // ⇒ pick the widest of all and load once.
  const six_months_ago = useMemo(() => {
    const months = new Date(range.to.getFullYear(), range.to.getMonth() - 6, 1)
    return startOfDay(months)
  }, [range.to])

  const widestFrom = useMemo(() => {
    const candidates = [
      previousRange.from,
      startOfDay(addDays(range.to, -89)),
      six_months_ago,
      range.from,
    ]
    return candidates.reduce((a, b) => (a.getTime() < b.getTime() ? a : b))
  }, [previousRange.from, range.from, range.to, six_months_ago])

  const widestTo = range.to

  const workoutsQuery = useQuery({
    queryKey: ['analytics', 'workouts', widestFrom.toISOString(), widestTo.toISOString()],
    queryFn: () => getCompletedWorkoutsInRange(widestFrom, widestTo),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })

  const usersQuery = useQuery({
    queryKey: ['analytics', 'users'],
    queryFn: () => getAllUsersForAnalytics(),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })

  const isLoading = workoutsQuery.isLoading || usersQuery.isLoading
  const isError = workoutsQuery.isError || usersQuery.isError
  const error = workoutsQuery.error ?? usersQuery.error

  const dataset = useMemo<AnalyticsDataset | null>(() => {
    if (!workoutsQuery.data || !usersQuery.data) return null
    const workouts = workoutsQuery.data.filter(
      (w) => w.date.getTime() >= range.from.getTime() && w.date.getTime() <= range.to.getTime(),
    )
    return { range, workouts, users: usersQuery.data }
  }, [workoutsQuery.data, usersQuery.data, range])

  const previous = useMemo<AnalyticsComparisonDataset | null>(() => {
    if (!workoutsQuery.data) return null
    const workouts = workoutsQuery.data.filter(
      (w) =>
        w.date.getTime() >= previousRange.from.getTime() &&
        w.date.getTime() <= previousRange.to.getTime(),
    )
    return { range: previousRange, workouts }
  }, [workoutsQuery.data, previousRange])

  const workoutsLast90Days = useMemo(() => {
    if (!workoutsQuery.data) return []
    return buildLast90DaysDataset(workoutsQuery.data, range.to)
  }, [workoutsQuery.data, range.to])

  const refetch = () => {
    workoutsQuery.refetch()
    usersQuery.refetch()
  }

  return {
    isLoading,
    isError,
    error,
    refetch,
    current: dataset,
    previous,
    workoutsLast90Days,
    workoutsExtended: workoutsQuery.data ?? [],
  }
}
