/**
 * Trainer detail hook — loads:
 * - The trainer's own UserDetailStats (when trainer is also a trainee).
 * - Trainee summaries for users where `trainerId === trainerId`.
 */
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  getAllUsersForAnalytics,
  getCompletedWorkoutsInRange,
} from '@/lib/firebase/analyticsQueries'
import { addDays, startOfDay } from './dateUtils'
import { computeUserDetailStats, isCompleted } from './aggregations'
import type {
  AnalyticsDataset,
  AnalyticsRange,
  TraineeSummary,
  UserDetailStats,
} from './analytics.types'
import { computeTraineeSummaries } from './aggregations'

export function useTrainerDetail(
  trainerId: string | undefined,
  range: AnalyticsRange,
): {
  isLoading: boolean
  isError: boolean
  error: unknown
  trainerStats: UserDetailStats | null
  trainees: TraineeSummary[]
  trainerExists: boolean
} {
  const usersQuery = useQuery({
    queryKey: ['analytics', 'users'],
    queryFn: () => getAllUsersForAnalytics(),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })

  const now = useMemo(() => new Date(), [])
  const fromDate = useMemo(() => startOfDay(addDays(now, -200)), [now])

  const workoutsQuery = useQuery({
    queryKey: ['analytics', 'workouts', fromDate.toISOString(), now.toISOString()],
    queryFn: () => getCompletedWorkoutsInRange(fromDate, now),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })

  const isLoading = usersQuery.isLoading || workoutsQuery.isLoading
  const isError = usersQuery.isError || workoutsQuery.isError
  const error = usersQuery.error ?? workoutsQuery.error

  const trainer = useMemo(() => {
    if (!usersQuery.data || !trainerId) return null
    return usersQuery.data.find((u) => u.uid === trainerId) ?? null
  }, [usersQuery.data, trainerId])

  const trainerStats = useMemo<UserDetailStats | null>(() => {
    if (!usersQuery.data || !workoutsQuery.data || !trainer) return null
    const ownAll = workoutsQuery.data.filter((w) => w.userId === trainer.uid)
    const ninetyDaysAgo = startOfDay(addDays(now, -89))
    const last90 = ownAll.filter(
      (w) => isCompleted(w) && w.date.getTime() >= ninetyDaysAgo.getTime(),
    )
    const isAlsoTrainee = last90.length > 0
    return computeUserDetailStats({
      user: trainer,
      workoutsAllTime: ownAll,
      workoutsLast90Days: last90,
      trainerName: null,
      isTrainerAlsoTrainee: isAlsoTrainee,
      now,
    })
  }, [usersQuery.data, workoutsQuery.data, trainer, now])

  const trainees = useMemo<TraineeSummary[]>(() => {
    if (!usersQuery.data || !workoutsQuery.data || !trainerId) return []
    const myTrainees = usersQuery.data.filter((u) => u.role === 'user' && u.trainerId === trainerId)
    const dataset: AnalyticsDataset = {
      range,
      workouts: workoutsQuery.data.filter(
        (w) => w.date.getTime() >= range.from.getTime() && w.date.getTime() <= range.to.getTime(),
      ),
      users: [...myTrainees, ...(trainer ? [trainer] : [])],
    }
    return computeTraineeSummaries(dataset)
  }, [usersQuery.data, workoutsQuery.data, trainerId, trainer, range])

  return {
    isLoading,
    isError,
    error,
    trainerStats,
    trainees,
    trainerExists: Boolean(trainer),
  }
}
