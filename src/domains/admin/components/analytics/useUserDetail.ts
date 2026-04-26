/**
 * Single-user detail hook. Loads enough history to compute streak, heatmap
 * (90 days), and 6-month frequency chart.
 */
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  getAllUsersForAnalytics,
  getWorkoutsForUserInRange,
} from '@/lib/firebase/analyticsQueries'
import { addDays, startOfDay } from './dateUtils'
import { computeUserDetailStats, isCompleted } from './aggregations'
import type { UserDetailStats } from './analytics.types'

export function useUserDetail(userId: string | undefined): {
  isLoading: boolean
  isError: boolean
  error: unknown
  stats: UserDetailStats | null
  notFound: boolean
} {
  const usersQuery = useQuery({
    queryKey: ['analytics', 'users'],
    queryFn: () => getAllUsersForAnalytics(),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })

  const now = useMemo(() => new Date(), [])
  // Pull 200 days back: covers heatmap (90), streak (~unbounded but realistically tens), monthly frequency (~180).
  const fromDate = useMemo(() => startOfDay(addDays(now, -200)), [now])

  const workoutsQuery = useQuery({
    queryKey: ['analytics', 'userWorkouts', userId, fromDate.toISOString()],
    queryFn: () => (userId ? getWorkoutsForUserInRange(userId, fromDate, now) : Promise.resolve([])),
    enabled: Boolean(userId),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })

  const isLoading = usersQuery.isLoading || workoutsQuery.isLoading
  const isError = usersQuery.isError || workoutsQuery.isError
  const error = usersQuery.error ?? workoutsQuery.error

  const stats = useMemo<UserDetailStats | null>(() => {
    if (!usersQuery.data || !workoutsQuery.data || !userId) return null
    const user = usersQuery.data.find((u) => u.uid === userId)
    if (!user) return null
    const trainerName = user.trainerId
      ? (() => {
          const t = usersQuery.data.find((x) => x.uid === user.trainerId)
          if (!t) return null
          return t.displayName || `${t.firstName ?? ''} ${t.lastName ?? ''}`.trim() || t.email
        })()
      : null
    const ninetyDaysAgo = startOfDay(addDays(now, -89))
    const last90 = workoutsQuery.data.filter(
      (w) => isCompleted(w) && w.date.getTime() >= ninetyDaysAgo.getTime(),
    )
    const isTrainerAlsoTrainee = user.role === 'trainer' && last90.length > 0
    return computeUserDetailStats({
      user,
      workoutsAllTime: workoutsQuery.data,
      workoutsLast90Days: last90,
      trainerName,
      isTrainerAlsoTrainee,
      now,
    })
  }, [usersQuery.data, workoutsQuery.data, userId, now])

  const notFound = Boolean(userId && usersQuery.data && !usersQuery.data.find((u) => u.uid === userId))

  return { isLoading, isError, error, stats, notFound }
}
