/**
 * Pure aggregation functions for the Usage Analytics dashboard.
 *
 * No IO, no React, no Firebase. All inputs are plain data structures so this
 * file is unit-testable and trivial to reason about.
 *
 * Conventions:
 * - Counted workouts = `status === 'completed' && !deletedByTrainee`.
 * - "Trainer also a trainee" = a user with role==='trainer' who has at least
 *   one completed workout (as userId, not reportedBy) in the last 90 days.
 * - "Active in last 7 days" uses the LAST 7 DAYS of the analytics range,
 *   not the trailing 7 days from "now". Keeps comparisons consistent.
 */
import type { WorkoutHistoryEntry } from '@/domains/workouts/types'
import type { AppUser } from '@/lib/firebase/auth'
import type {
  AnalyticsDataset,
  AnalyticsComparisonDataset,
  AnalyticsRange,
  CohortRow,
  DailyHeatmapCell,
  DailyTrendPoint,
  ExercisePopularity,
  ExerciseUsageRow,
  KpiValue,
  MonthlyFrequencyPoint,
  OverviewKpis,
  RecentWorkoutRow,
  TraineeSummary,
  TrainerSummary,
  UserDetailStats,
  UserSegmentation,
} from './analytics.types'
import {
  addDays,
  DAY_MS,
  deltaPct,
  diffDays,
  eachDayKey,
  endOfDay,
  hebMonth,
  startOfDay,
  startOfMonth,
  toDateKey,
  toMonthKey,
} from './dateUtils'

const ACTIVE_WINDOW_DAYS = 7
/**
 * Minimum sample size in the previous window before we trust the delta.
 * Below this, the % change is dominated by noise (e.g., 1→2 = +100%) and
 * misleads readers, so we suppress it to "—".
 */
const MIN_PREV_FOR_DELTA = 5

// ============ Helpers ============

export function isCompleted(w: WorkoutHistoryEntry): boolean {
  return w.status === 'completed' && !w.deletedByTrainee
}

export function trendOf(deltaPctValue: number | null): KpiValue['trend'] {
  if (deltaPctValue === null) return 'flat'
  if (deltaPctValue > 0.5) return 'up'
  if (deltaPctValue < -0.5) return 'down'
  return 'flat'
}

function makeKpi(
  value: number,
  previous: number,
  display?: string,
  options?: { minPrev?: number },
): KpiValue {
  const minPrev = options?.minPrev ?? 0
  const dp = previous < minPrev ? null : deltaPct(value, previous)
  return { value, display, deltaPct: dp, trend: trendOf(dp) }
}

function uniqueExerciseIdsInWorkout(w: WorkoutHistoryEntry): Set<string> {
  const set = new Set<string>()
  for (const ex of w.exercises) {
    if (ex.exerciseId) set.add(ex.exerciseId)
  }
  return set
}

function exerciseDisplayName(w: WorkoutHistoryEntry, id: string): string {
  for (const ex of w.exercises) {
    if (ex.exerciseId === id) return ex.exerciseNameHe || ex.exerciseName || id
  }
  return id
}

// ============ User segmentation ============

/**
 * Determine which trainers are also trainees: have own workouts in the last
 * 90 days. Caller must provide ALL workouts in the trailing 90 days, NOT the
 * range's workouts (range may be shorter than 90d).
 */
export function getTrainersWhoTrain(
  trainerIds: Set<string>,
  workoutsLast90Days: WorkoutHistoryEntry[],
): Set<string> {
  const owners = new Set<string>()
  for (const w of workoutsLast90Days) {
    if (!isCompleted(w)) continue
    if (trainerIds.has(w.userId)) owners.add(w.userId)
  }
  return owners
}

export function segmentUsers(
  users: AppUser[],
  workoutsLast90Days: WorkoutHistoryEntry[],
): UserSegmentation {
  const trainerIds = new Set(users.filter((u) => u.role === 'trainer').map((u) => u.uid))
  const traineesOnly = users.filter((u) => u.role === 'user').length
  const trainersWhoTrainSet = getTrainersWhoTrain(trainerIds, workoutsLast90Days)
  const trainersWhoTrain = trainersWhoTrainSet.size
  const trainersOnly = trainerIds.size - trainersWhoTrain
  return {
    traineesOnly,
    trainersWhoTrain,
    trainersOnly,
    total: traineesOnly + trainersWhoTrain + trainersOnly,
  }
}

// ============ Active windows ============

/** [from, to] for the trailing N days of `range`. Used for activity checks. */
function activeWindow(range: AnalyticsRange, days = ACTIVE_WINDOW_DAYS): { from: Date; to: Date } {
  const to = range.to
  const from = startOfDay(addDays(to, -(days - 1)))
  return { from, to }
}

function inWindow(d: Date, from: Date, to: Date): boolean {
  const t = d.getTime()
  return t >= from.getTime() && t <= to.getTime()
}

// ============ KPIs ============

export function computeOverviewKpis(
  current: AnalyticsDataset,
  previous: AnalyticsComparisonDataset,
): OverviewKpis {
  const completedCurrent = current.workouts.filter(isCompleted)
  const completedPrev = previous.workouts.filter(isCompleted)

  // WAU = unique users with a completed workout in the last 7 days of range
  const { from: wauFrom, to: wauTo } = activeWindow(current.range)
  const { from: wauPrevFrom, to: wauPrevTo } = activeWindow(previous.range)
  const wauUsers = new Set<string>()
  for (const w of completedCurrent) {
    if (inWindow(w.date, wauFrom, wauTo)) wauUsers.add(w.userId)
  }
  const wauPrevUsers = new Set<string>()
  for (const w of completedPrev) {
    if (inWindow(w.date, wauPrevFrom, wauPrevTo)) wauPrevUsers.add(w.userId)
  }

  const totalWorkouts = completedCurrent.length
  const totalWorkoutsPrev = completedPrev.length

  // Avg per active user (weekly + monthly) within the range
  const activeUsers = new Set(completedCurrent.map((w) => w.userId)).size
  const activePrevUsers = new Set(completedPrev.map((w) => w.userId)).size
  const weeks = current.range.days / 7
  const months = current.range.days / 30
  const weeksPrev = previous.range.days / 7
  const monthsPrev = previous.range.days / 30

  const avgWeekly = activeUsers > 0 && weeks > 0 ? totalWorkouts / activeUsers / weeks : 0
  const avgWeeklyPrev =
    activePrevUsers > 0 && weeksPrev > 0 ? totalWorkoutsPrev / activePrevUsers / weeksPrev : 0
  const avgMonthly = activeUsers > 0 && months > 0 ? totalWorkouts / activeUsers / months : 0
  const avgMonthlyPrev =
    activePrevUsers > 0 && monthsPrev > 0 ? totalWorkoutsPrev / activePrevUsers / monthsPrev : 0

  // 30-day retention — null when no cohort to evaluate
  const ret = computeRetention30(current)
  const retPrev = computeRetention30PreviousAnchor(current)

  return {
    wau: makeKpi(wauUsers.size, wauPrevUsers.size),
    totalWorkouts: makeKpi(totalWorkouts, totalWorkoutsPrev, undefined, {
      minPrev: MIN_PREV_FOR_DELTA,
    }),
    avgPerUserWeekly: makeKpi(round1(avgWeekly), round1(avgWeeklyPrev), avgWeekly.toFixed(1)),
    avgPerUserMonthly: makeKpi(round1(avgMonthly), round1(avgMonthlyPrev), avgMonthly.toFixed(1)),
    retention30: buildRetentionKpi(ret, retPrev),
  }
}

function buildRetentionKpi(
  current: number | null,
  previous: number | null,
): KpiValue {
  // Both null = no cohort either side. Show "—" with no delta.
  if (current === null) {
    return { value: 0, display: '—', deltaPct: null, trend: 'flat' }
  }
  const valuePct = round1(current * 100)
  const display = `${(current * 100).toFixed(0)}%`
  if (previous === null) {
    return { value: valuePct, display, deltaPct: null, trend: 'flat' }
  }
  const dp = deltaPct(valuePct, round1(previous * 100))
  return { value: valuePct, display, deltaPct: dp, trend: trendOf(dp) }
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

// ============ Retention ============

/**
 * 30-day retention with ±3-day cohort window.
 * - Cohort: users whose `createdAt` falls in [now-33, now-27] days.
 * - Active: at least one completed workout in the last 7 days.
 *
 * Returns ratio in [0, 1], or `null` when the cohort is empty
 * (so the UI can render "—" instead of a misleading "0%").
 */
export function computeRetention30(dataset: AnalyticsDataset): number | null {
  const now = dataset.range.to
  const anchor = addDays(now, -30)
  const cohortFrom = startOfDay(addDays(anchor, -3))
  const cohortTo = endOfDay(addDays(anchor, 3))
  return retentionForAnchor(dataset, cohortFrom, cohortTo, now)
}

/**
 * Retention for the previous 30-day anchor, used for the delta. Cohort:
 * users created around (now - 60d). Activity check: workouts in the 7 days
 * before (now - 30d).
 */
function computeRetention30PreviousAnchor(dataset: AnalyticsDataset): number | null {
  const now = dataset.range.to
  const prevNow = addDays(now, -30)
  const anchor = addDays(prevNow, -30)
  const cohortFrom = startOfDay(addDays(anchor, -3))
  const cohortTo = endOfDay(addDays(anchor, 3))
  return retentionForAnchor(dataset, cohortFrom, cohortTo, prevNow)
}

function retentionForAnchor(
  dataset: AnalyticsDataset,
  cohortFrom: Date,
  cohortTo: Date,
  activityAnchor: Date,
): number | null {
  const cohort = dataset.users.filter((u) => {
    const t = u.createdAt instanceof Date ? u.createdAt.getTime() : new Date(u.createdAt).getTime()
    return t >= cohortFrom.getTime() && t <= cohortTo.getTime()
  })
  if (cohort.length === 0) return null
  const cohortIds = new Set(cohort.map((u) => u.uid))
  const activeFrom = startOfDay(addDays(activityAnchor, -(ACTIVE_WINDOW_DAYS - 1)))
  const activeTo = endOfDay(activityAnchor)
  const activeIds = new Set<string>()
  for (const w of dataset.workouts) {
    if (!isCompleted(w)) continue
    if (!cohortIds.has(w.userId)) continue
    if (inWindow(w.date, activeFrom, activeTo)) activeIds.add(w.userId)
  }
  return activeIds.size / cohort.length
}

// ============ Daily trend ============

export function computeDailyTrend(dataset: AnalyticsDataset): DailyTrendPoint[] {
  const completed = dataset.workouts.filter(isCompleted)
  const dayKeys = eachDayKey(dataset.range.from, dataset.range.to)
  const dauMap = new Map<string, Set<string>>()
  const workoutMap = new Map<string, number>()
  for (const k of dayKeys) {
    dauMap.set(k, new Set())
    workoutMap.set(k, 0)
  }
  for (const w of completed) {
    const k = toDateKey(w.date)
    if (!dauMap.has(k)) continue
    dauMap.get(k)!.add(w.userId)
    workoutMap.set(k, (workoutMap.get(k) ?? 0) + 1)
  }
  return dayKeys.map((k) => {
    const [yyyy, mm, dd] = k.split('-').map((s) => parseInt(s, 10))
    return {
      date: new Date(yyyy, mm - 1, dd),
      dateKey: k,
      dau: dauMap.get(k)!.size,
      workouts: workoutMap.get(k)!,
    }
  })
}

// ============ Top exercises ============

export function computeTopExercises(
  current: AnalyticsDataset,
  previous: AnalyticsComparisonDataset,
  limitN = 6,
): ExercisePopularity[] {
  const counts = new Map<string, { name: string; workouts: number; users: Set<string> }>()
  const prevCounts = new Map<string, number>()

  for (const w of current.workouts) {
    if (!isCompleted(w)) continue
    const ids = uniqueExerciseIdsInWorkout(w)
    for (const id of ids) {
      const entry = counts.get(id) ?? {
        name: exerciseDisplayName(w, id),
        workouts: 0,
        users: new Set<string>(),
      }
      entry.workouts += 1
      entry.users.add(w.userId)
      // Lock in name (in case it varies — pick first non-id name)
      if (entry.name === id) entry.name = exerciseDisplayName(w, id)
      counts.set(id, entry)
    }
  }
  for (const w of previous.workouts) {
    if (!isCompleted(w)) continue
    const ids = uniqueExerciseIdsInWorkout(w)
    for (const id of ids) {
      prevCounts.set(id, (prevCounts.get(id) ?? 0) + 1)
    }
  }

  return Array.from(counts.entries())
    .map(([id, e]) => ({
      exerciseId: id,
      exerciseName: e.name,
      workoutCount: e.workouts,
      userCount: e.users.size,
      deltaPct: deltaPct(e.workouts, prevCounts.get(id) ?? 0),
    }))
    .sort((a, b) => b.workoutCount - a.workoutCount)
    .slice(0, limitN)
}

export function computeExerciseUsageTable(
  current: AnalyticsDataset,
  previous: AnalyticsComparisonDataset,
): ExerciseUsageRow[] {
  const counts = new Map<string, { name: string; total: number; users: Set<string> }>()
  const prevCounts = new Map<string, number>()

  for (const w of current.workouts) {
    if (!isCompleted(w)) continue
    // Performances = number of exercises (unique per workout) — matches "popularity" definition.
    const ids = uniqueExerciseIdsInWorkout(w)
    for (const id of ids) {
      const entry = counts.get(id) ?? {
        name: exerciseDisplayName(w, id),
        total: 0,
        users: new Set<string>(),
      }
      entry.total += 1
      entry.users.add(w.userId)
      counts.set(id, entry)
    }
  }
  for (const w of previous.workouts) {
    if (!isCompleted(w)) continue
    const ids = uniqueExerciseIdsInWorkout(w)
    for (const id of ids) prevCounts.set(id, (prevCounts.get(id) ?? 0) + 1)
  }
  return Array.from(counts.entries())
    .map(([id, e]) => ({
      exerciseId: id,
      exerciseName: e.name,
      totalPerformances: e.total,
      uniqueUsers: e.users.size,
      deltaPct: deltaPct(e.total, prevCounts.get(id) ?? 0),
    }))
    .sort((a, b) => b.totalPerformances - a.totalPerformances)
}

// ============ Cohorts ============

/**
 * Build cohort retention table. One row per signup-month covering the last
 * 6 months. Cells: % of cohort with a completed workout in week 1/2/4/8 after
 * signup. Cells are null when the relevant week has not elapsed yet.
 *
 * Uses the FULL workouts dataset — not just the analytics range. Caller must
 * provide enough history.
 */
export function computeCohorts(
  users: AppUser[],
  workoutsAllTime: WorkoutHistoryEntry[],
  now: Date,
  monthsBack = 6,
): CohortRow[] {
  const completedByUser = new Map<string, Date[]>()
  for (const w of workoutsAllTime) {
    if (!isCompleted(w)) continue
    const arr = completedByUser.get(w.userId) ?? []
    arr.push(w.date)
    completedByUser.set(w.userId, arr)
  }

  const rows: CohortRow[] = []
  for (let i = monthsBack - 1; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
    const cohort = users.filter((u) => {
      const t = u.createdAt instanceof Date ? u.createdAt : new Date(u.createdAt)
      return t.getTime() >= monthStart.getTime() && t.getTime() < nextMonth.getTime()
    })
    if (cohort.length === 0) {
      rows.push({
        cohortMonth: toMonthKey(monthStart),
        cohortLabel: `${hebMonth(monthStart)} ${monthStart.getFullYear()}`,
        cohortSize: 0,
        w1Pct: null,
        w2Pct: null,
        w4Pct: null,
        w8Pct: null,
      })
      continue
    }
    rows.push({
      cohortMonth: toMonthKey(monthStart),
      cohortLabel: `${hebMonth(monthStart)} ${monthStart.getFullYear()}`,
      cohortSize: cohort.length,
      w1Pct: cellPct(cohort, completedByUser, now, 1),
      w2Pct: cellPct(cohort, completedByUser, now, 2),
      w4Pct: cellPct(cohort, completedByUser, now, 4),
      w8Pct: cellPct(cohort, completedByUser, now, 8),
    })
  }
  return rows
}

function cellPct(
  cohort: AppUser[],
  completedByUser: Map<string, Date[]>,
  now: Date,
  weekN: number,
): number | null {
  const startOffsetDays = (weekN - 1) * 7
  const endOffsetDays = weekN * 7
  let active = 0
  let eligible = 0
  for (const u of cohort) {
    const joined =
      u.createdAt instanceof Date ? u.createdAt : new Date(u.createdAt)
    const winStart = addDays(joined, startOffsetDays)
    const winEnd = addDays(joined, endOffsetDays)
    if (winEnd.getTime() > now.getTime()) continue
    eligible += 1
    const dates = completedByUser.get(u.uid) ?? []
    const hit = dates.some(
      (d) => d.getTime() >= winStart.getTime() && d.getTime() < winEnd.getTime(),
    )
    if (hit) active += 1
  }
  if (eligible === 0) return null
  return (active / eligible) * 100
}

// ============ Trainer summaries ============

export function computeTrainerSummaries(
  dataset: AnalyticsDataset,
  workoutsLast90Days: WorkoutHistoryEntry[],
): TrainerSummary[] {
  const trainers = dataset.users.filter((u) => u.role === 'trainer')
  const trainerIds = new Set(trainers.map((t) => t.uid))
  const trainersWhoTrain = getTrainersWhoTrain(trainerIds, workoutsLast90Days)

  const traineesByTrainer = new Map<string, string[]>()
  for (const u of dataset.users) {
    if (u.role !== 'user' || !u.trainerId) continue
    const arr = traineesByTrainer.get(u.trainerId) ?? []
    arr.push(u.uid)
    traineesByTrainer.set(u.trainerId, arr)
  }

  const completedByUser = new Map<string, WorkoutHistoryEntry[]>()
  for (const w of dataset.workouts) {
    if (!isCompleted(w)) continue
    const arr = completedByUser.get(w.userId) ?? []
    arr.push(w)
    completedByUser.set(w.userId, arr)
  }

  const { from: activeFrom, to: activeTo } = activeWindow(dataset.range)
  const last30From = startOfDay(addDays(dataset.range.to, -29))

  return trainers.map<TrainerSummary>((t) => {
    const traineeIds = traineesByTrainer.get(t.uid) ?? []
    const traineeCount = traineeIds.length
    let activeTrainees = 0
    let totalCompleted = 0
    for (const tid of traineeIds) {
      const ws = completedByUser.get(tid) ?? []
      totalCompleted += ws.length
      if (ws.some((w) => inWindow(w.date, activeFrom, activeTo))) activeTrainees += 1
    }
    const weeks = Math.max(1, dataset.range.days / 7)
    const avgWeekly = traineeCount > 0 ? totalCompleted / traineeCount / weeks : 0

    const ownAll = completedByUser.get(t.uid) ?? []
    const ownLast30 = ownAll.filter((w) => inWindow(w.date, last30From, dataset.range.to)).length
    const isAlsoTrainee = trainersWhoTrain.has(t.uid)

    const isActive = ownAll.some((w) => inWindow(w.date, activeFrom, activeTo))

    return {
      trainerId: t.uid,
      name: t.displayName || `${t.firstName ?? ''} ${t.lastName ?? ''}`.trim() || t.email,
      email: t.email,
      traineeCount,
      activeTraineePct: traineeCount > 0 ? (activeTrainees / traineeCount) * 100 : 0,
      avgWeeklyPerTrainee: round1(avgWeekly),
      ownWorkoutsLast30d: isAlsoTrainee ? ownLast30 : null,
      isAlsoTrainee,
      isActive: isAlsoTrainee ? isActive : activeTrainees > 0,
    }
  })
}

// ============ Trainee summaries ============

export function computeTraineeSummaries(dataset: AnalyticsDataset): TraineeSummary[] {
  const users = dataset.users
  const trainerNameById = new Map<string, string>()
  for (const u of users) {
    if (u.role === 'trainer') {
      trainerNameById.set(
        u.uid,
        u.displayName || `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email,
      )
    }
  }
  const completedByUser = new Map<string, WorkoutHistoryEntry[]>()
  for (const w of dataset.workouts) {
    if (!isCompleted(w)) continue
    const arr = completedByUser.get(w.userId) ?? []
    arr.push(w)
    completedByUser.set(w.userId, arr)
  }
  const { from: activeFrom, to: activeTo } = activeWindow(dataset.range)
  const monthStart = startOfMonth(dataset.range.to)
  const weeks = Math.max(1, dataset.range.days / 7)

  return users
    .filter((u) => u.role === 'user')
    .map<TraineeSummary>((u) => {
      const ws = completedByUser.get(u.uid) ?? []
      const isActive = ws.some((w) => inWindow(w.date, activeFrom, activeTo))
      const workoutsThisMonth = ws.filter((w) => w.date.getTime() >= monthStart.getTime()).length
      const avgWeekly = ws.length / weeks
      let lastActivityAt: Date | null = null
      for (const w of ws) {
        if (!lastActivityAt || w.date.getTime() > lastActivityAt.getTime()) lastActivityAt = w.date
      }
      let completionSum = 0
      let completionCount = 0
      for (const w of ws) {
        if (w.totalSets > 0) {
          completionSum += w.completedSets / w.totalSets
          completionCount += 1
        }
      }
      const avgCompletionPct = completionCount > 0 ? (completionSum / completionCount) * 100 : 0
      return {
        userId: u.uid,
        name: u.displayName || `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim() || u.email,
        email: u.email,
        trainerId: u.trainerId ?? null,
        trainerName: u.trainerId ? trainerNameById.get(u.trainerId) ?? null : null,
        isActive,
        workoutsThisMonth,
        avgWeekly: round1(avgWeekly),
        lastActivityAt,
        joinedAt: u.createdAt instanceof Date ? u.createdAt : new Date(u.createdAt),
        avgCompletionPct: Math.round(avgCompletionPct),
      }
    })
}

// ============ User detail ============

export function computeUserDetailStats(args: {
  user: AppUser
  workoutsAllTime: WorkoutHistoryEntry[]
  workoutsLast90Days: WorkoutHistoryEntry[]
  trainerName: string | null
  isTrainerAlsoTrainee: boolean
  now: Date
}): UserDetailStats {
  const { user, workoutsAllTime, workoutsLast90Days, trainerName, isTrainerAlsoTrainee, now } = args

  const ownAll = workoutsAllTime.filter((w) => w.userId === user.uid && isCompleted(w))
  const totalWorkouts = ownAll.length
  const monthStart = startOfMonth(now)
  const thisMonth = ownAll.filter((w) => w.date.getTime() >= monthStart.getTime()).length

  const ninetyDaysAgo = startOfDay(addDays(now, -89))
  const last90 = ownAll.filter((w) => w.date.getTime() >= ninetyDaysAgo.getTime())
  const weeks = 90 / 7
  const avgWeekly = round1(last90.length / weeks)

  let durationSum = 0
  let durationCount = 0
  let completionSum = 0
  let completionCount = 0
  for (const w of ownAll) {
    if (w.duration && w.duration > 0) {
      durationSum += w.duration
      durationCount += 1
    }
    if (w.totalSets > 0) {
      completionSum += w.completedSets / w.totalSets
      completionCount += 1
    }
  }
  const avgDuration = durationCount > 0 ? Math.round(durationSum / durationCount) : 0
  const avgCompletionPct = completionCount > 0 ? Math.round((completionSum / completionCount) * 100) : 0

  // Heatmap: last 90 days, 13 cols × 7 rows
  const heatmap = buildActivityHeatmap(ownAll, now)

  // Frequency: last 6 months avg weekly
  const monthlyFrequency = buildMonthlyFrequency(ownAll, now)

  // Top 5 exercises across user's last 90 days
  const topExercises = buildTopExercisesForUser(last90, 5)

  // Recent 10 workouts
  const recent = [...ownAll]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 10)
    .map<RecentWorkoutRow>((w) => ({
      id: w.id,
      date: w.date,
      name: w.name || 'אימון',
      duration: w.duration ?? 0,
      exerciseCount: w.exercises.length,
      completionPct: w.totalSets > 0 ? Math.round((w.completedSets / w.totalSets) * 100) : 0,
    }))

  // Streak: count consecutive days with at least one completed workout, ending today or yesterday
  const currentStreakDays = computeStreak(ownAll, now)

  let lastActivityAt: Date | null = null
  for (const w of ownAll) {
    if (!lastActivityAt || w.date.getTime() > lastActivityAt.getTime()) lastActivityAt = w.date
  }

  // workoutsLast90Days param ensures the function is fed with data, even if same as ownAll for trainees.
  void workoutsLast90Days

  return {
    user,
    totalWorkouts,
    thisMonth,
    avgWeekly,
    avgDuration,
    avgCompletionPct,
    currentStreakDays,
    joinedAt: user.createdAt instanceof Date ? user.createdAt : new Date(user.createdAt),
    lastActivityAt,
    trainerName,
    isTrainerAlsoTrainee,
    heatmap,
    monthlyFrequency,
    topExercises,
    recentWorkouts: recent,
  }
}

function buildActivityHeatmap(ownAll: WorkoutHistoryEntry[], now: Date): DailyHeatmapCell[] {
  const days = 91 // 13 weeks × 7
  const start = startOfDay(addDays(now, -(days - 1)))
  const byKey = new Map<string, { count: number; maxDuration: number }>()
  for (const w of ownAll) {
    if (w.date.getTime() < start.getTime()) continue
    const k = toDateKey(w.date)
    const e = byKey.get(k) ?? { count: 0, maxDuration: 0 }
    e.count += 1
    e.maxDuration = Math.max(e.maxDuration, w.duration ?? 0)
    byKey.set(k, e)
  }
  const cells: DailyHeatmapCell[] = []
  for (let i = 0; i < days; i++) {
    const d = startOfDay(addDays(start, i))
    const k = toDateKey(d)
    const e = byKey.get(k)
    let bucket: 0 | 1 | 2 | 3 = 0
    if (e) {
      if (e.maxDuration >= 60) bucket = 3
      else if (e.maxDuration >= 30) bucket = 2
      else bucket = 1
    }
    cells.push({ date: d, dateKey: k, bucket, workoutCount: e?.count ?? 0 })
  }
  return cells
}

function buildMonthlyFrequency(ownAll: WorkoutHistoryEntry[], now: Date): MonthlyFrequencyPoint[] {
  const out: MonthlyFrequencyPoint[] = []
  for (let i = 5; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const nextMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
    const count = ownAll.filter(
      (w) => w.date.getTime() >= monthStart.getTime() && w.date.getTime() < nextMonth.getTime(),
    ).length
    const days = (nextMonth.getTime() - monthStart.getTime()) / DAY_MS
    const weeks = Math.max(1, days / 7)
    out.push({
      monthKey: toMonthKey(monthStart),
      label: hebMonth(monthStart),
      avgWeeklyWorkouts: round1(count / weeks),
    })
  }
  return out
}

function buildTopExercisesForUser(
  last90: WorkoutHistoryEntry[],
  limitN: number,
): ExercisePopularity[] {
  const counts = new Map<string, { name: string; workouts: number }>()
  for (const w of last90) {
    const ids = uniqueExerciseIdsInWorkout(w)
    for (const id of ids) {
      const e = counts.get(id) ?? { name: exerciseDisplayName(w, id), workouts: 0 }
      e.workouts += 1
      counts.set(id, e)
    }
  }
  return Array.from(counts.entries())
    .map(([id, e]) => ({
      exerciseId: id,
      exerciseName: e.name,
      workoutCount: e.workouts,
      userCount: 1,
      deltaPct: null,
    }))
    .sort((a, b) => b.workoutCount - a.workoutCount)
    .slice(0, limitN)
}

function computeStreak(ownAll: WorkoutHistoryEntry[], now: Date): number {
  if (ownAll.length === 0) return 0
  const dayKeys = new Set(ownAll.map((w) => toDateKey(w.date)))
  let streak = 0
  // Allow streak to start "today" or "yesterday" — i.e., a 1-day grace.
  let cursor = startOfDay(now)
  if (!dayKeys.has(toDateKey(cursor))) cursor = addDays(cursor, -1)
  while (dayKeys.has(toDateKey(cursor))) {
    streak += 1
    cursor = addDays(cursor, -1)
  }
  return streak
}

// ============ Top trainer (Overview block) ============

export function computeTopTrainers(
  summaries: TrainerSummary[],
  limitN = 5,
): TrainerSummary[] {
  return [...summaries]
    .sort((a, b) => {
      // Sort: more trainees first, then higher activeTraineePct, then more avgWeekly
      if (b.traineeCount !== a.traineeCount) return b.traineeCount - a.traineeCount
      if (b.activeTraineePct !== a.activeTraineePct) return b.activeTraineePct - a.activeTraineePct
      return b.avgWeeklyPerTrainee - a.avgWeeklyPerTrainee
    })
    .slice(0, limitN)
}

// ============ Utilities exposed for hooks ============

export function buildLast90DaysDataset(
  workoutsInBigRange: WorkoutHistoryEntry[],
  now: Date,
): WorkoutHistoryEntry[] {
  const start = startOfDay(addDays(now, -89))
  return workoutsInBigRange.filter((w) => w.date.getTime() >= start.getTime())
}

/** Re-export for tests. */
export const __testing = { round1, deltaPct, diffDays, endOfDay }
