import type { WorkoutHistoryEntry } from '@/domains/workouts/types'
import type { AppUser } from '@/lib/firebase/auth'

export type AnalyticsRangeKey = '7d' | '30d' | '90d' | 'ytd'

export interface AnalyticsRange {
  key: AnalyticsRangeKey
  from: Date
  to: Date
  /** Length of the range in whole days (used for delta windows). */
  days: number
  label: string
}

export interface AnalyticsDataset {
  range: AnalyticsRange
  /** All non-soft-deleted workouts in [from, to] (any status). */
  workouts: WorkoutHistoryEntry[]
  /** All users in the system (any role). */
  users: AppUser[]
}

/** Same as AnalyticsDataset but for the "previous" comparison window. */
export interface AnalyticsComparisonDataset {
  range: AnalyticsRange
  workouts: WorkoutHistoryEntry[]
}

export interface KpiValue {
  /** The value to render. */
  value: number
  /** Optional formatted display (e.g., "12.4"). If absent, value is used. */
  display?: string
  /** Percent change vs. previous window. null when not comparable. */
  deltaPct: number | null
  /** Direction icon — used by the KpiCard. */
  trend: 'up' | 'down' | 'flat'
}

export interface OverviewKpis {
  wau: KpiValue
  totalWorkouts: KpiValue
  avgPerUserWeekly: KpiValue
  avgPerUserMonthly: KpiValue
  retention30: KpiValue
}

export interface UserSegmentation {
  traineesOnly: number
  trainersWhoTrain: number
  trainersOnly: number
  total: number
}

export interface DailyTrendPoint {
  date: Date
  /** ISO date string YYYY-MM-DD — used as chart X axis key. */
  dateKey: string
  dau: number
  workouts: number
}

export interface ExercisePopularity {
  exerciseId: string
  exerciseName: string
  /** Number of workouts the exercise appeared in (unique per workout). */
  workoutCount: number
  /** Number of distinct users who performed it at least once in the range. */
  userCount: number
  /** Trend vs. the previous window — % change in workoutCount. null if N/A. */
  deltaPct: number | null
}

export interface CohortRow {
  /** ISO month, e.g., "2026-03". */
  cohortMonth: string
  /** Hebrew display, e.g., "מרץ 2026". */
  cohortLabel: string
  cohortSize: number
  /** Active in week 1 (days 0-6 after signup). */
  w1Pct: number | null
  w2Pct: number | null
  w4Pct: number | null
  w8Pct: number | null
}

export interface TrainerSummary {
  trainerId: string
  name: string
  email: string
  traineeCount: number
  /** % of trainees with a completed workout in the last 7 days of the range. */
  activeTraineePct: number
  /** Average completed workouts per trainee per week within range. */
  avgWeeklyPerTrainee: number
  /** Trainer's own completed workouts in the last 30 days (or "—" if none). */
  ownWorkoutsLast30d: number | null
  /** Whether the trainer is also a trainee — has own workouts in last 90 days. */
  isAlsoTrainee: boolean
  /** Whether the trainer was active in the last 7 days of the range. */
  isActive: boolean
}

export interface TraineeSummary {
  userId: string
  name: string
  email: string
  trainerId: string | null
  trainerName: string | null
  /** Active = completed workout in last 7 days of range. */
  isActive: boolean
  /** Completed workouts in current month (1st-now). */
  workoutsThisMonth: number
  /** Average completed workouts per week within range. */
  avgWeekly: number
  /** Last completed workout date in range. null if none. */
  lastActivityAt: Date | null
  joinedAt: Date
  /** Avg completion % across completed workouts in range. */
  avgCompletionPct: number
}

export interface ExerciseUsageRow {
  exerciseId: string
  exerciseName: string
  totalPerformances: number
  uniqueUsers: number
  /** % change vs. previous equal-length window. null if no prior data. */
  deltaPct: number | null
}

export interface DailyHeatmapCell {
  date: Date
  dateKey: string
  /** Bucket: 0 = none, 1 = short (<30min), 2 = medium (30-60min), 3 = long (60+min). */
  bucket: 0 | 1 | 2 | 3
  workoutCount: number
}

export interface MonthlyFrequencyPoint {
  /** ISO month "YYYY-MM". */
  monthKey: string
  /** Hebrew label, e.g., "ינואר". */
  label: string
  avgWeeklyWorkouts: number
}

export interface RecentWorkoutRow {
  id: string
  date: Date
  name: string
  duration: number
  exerciseCount: number
  completionPct: number
}

export interface UserDetailStats {
  user: AppUser
  totalWorkouts: number
  thisMonth: number
  avgWeekly: number
  avgDuration: number
  avgCompletionPct: number
  currentStreakDays: number
  joinedAt: Date
  lastActivityAt: Date | null
  trainerName: string | null
  /** Whether this user is a trainer who is also a trainee. */
  isTrainerAlsoTrainee: boolean
  heatmap: DailyHeatmapCell[]
  monthlyFrequency: MonthlyFrequencyPoint[]
  topExercises: ExercisePopularity[]
  recentWorkouts: RecentWorkoutRow[]
}

export interface InsightLine {
  /** Short Hebrew sentence (no emojis, no exclamation). */
  text: string
  /** Soft category — affects styling. */
  tone: 'neutral' | 'positive' | 'warning'
}
