import { useState, useEffect, useMemo } from 'react'
import { getUserWorkoutHistory } from '@/lib/firebase/workoutHistory'
import { getPersonalRecords, type PersonalRecord } from '@/lib/firebase/workoutHistory'
import { programService } from '../services/programService'
import type { TrainingProgram } from '../types'
import type { WorkoutHistorySummary } from '@/domains/workouts/types'

// ============ TYPES ============

export interface WeeklyData {
  label: string
  workouts: number
}

export interface WorkoutDistribution {
  label: string
  count: number
  percentage: number
  color: string
}

export interface HeatmapDay {
  date: Date
  count: number
  level: 0 | 1 | 2 | 3 | 4
  isToday: boolean
  isCurrentMonth: boolean
}

export interface DayPattern {
  dayName: string
  percentage: number
  count: number
  totalWeeks: number
}

export interface WeekCompliance {
  label: string
  done: number
  planned: number
  percentage: number
}

export interface SkipInfo {
  dayLabel: string
  dayName: string
  performed: number
  expected: number
  percentage: number
}

export interface AIInsight {
  icon: string
  title: string
  text: string
}

export interface StuckExercise extends PersonalRecord {
  weeksSinceImprovement: number
}

export interface AnalyticsData {
  isLoading: boolean
  // Total tab
  totalWorkouts: number
  thisMonthWorkouts: number
  yearTotal: number
  weeklyAverage: number
  avgDuration: number
  weeklyChart: WeeklyData[]
  workoutDistribution: WorkoutDistribution[]
  monthCompare: number // vs last month
  totalInsights: AIInsight[]
  // Streak tab
  currentStreak: number
  bestStreak: number
  bestStreakRange: string
  heatmapData: HeatmapDay[]
  heatmapMonth: Date
  setHeatmapMonth: (d: Date) => void
  dayPatterns: DayPattern[]
  streakInsights: AIInsight[]
  // Weekly compliance tab
  thisWeekDone: number
  thisWeekPlanned: number
  avgCompliance: number
  perfectWeeksStreak: number
  mostSkippedDay: string
  weeklyCompliance: WeekCompliance[]
  skipAnalysis: SkipInfo[]
  complianceInsights: AIInsight[]
  // PR tab
  prsThisMonth: number
  totalPRs: number
  improvingCount: number
  stuckCount: number
  recentPRs: PersonalRecord[]
  stuckExercises: StuckExercise[]
  prInsights: AIInsight[]
}

// ============ HELPER FUNCTIONS ============

const DISTRIBUTION_COLORS = [
  'bg-status-success', 'bg-blue-500', 'bg-accent-orange',
  'bg-accent-purple', 'bg-yellow-500', 'bg-pink-500',
]

function getWeekStart(date: Date): Date {
  const d = new Date(date)
  d.setDate(d.getDate() - d.getDay())
  d.setHours(0, 0, 0, 0)
  return d
}

function getDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function computeStreak(workouts: WorkoutHistorySummary[]): { current: number; best: number; bestStart: Date; bestEnd: Date } {
  const completed = workouts.filter(w => w.status === 'completed')
  if (completed.length === 0) return { current: 0, best: 0, bestStart: new Date(), bestEnd: new Date() }

  // Get unique workout dates
  const dateSet = new Set<string>()
  completed.forEach(w => {
    const d = new Date(w.date)
    d.setHours(0, 0, 0, 0)
    dateSet.add(d.toISOString())
  })
  const sortedDates = Array.from(dateSet).sort().reverse().map(s => new Date(s))

  // Current streak
  let current = 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  for (let i = 0; i < 365; i++) {
    const checkDate = new Date(today)
    checkDate.setDate(today.getDate() - i)
    checkDate.setHours(0, 0, 0, 0)

    const hasWorkout = sortedDates.some(d => d.getTime() === checkDate.getTime())
    if (hasWorkout) {
      current++
    } else if (i > 0) {
      break
    }
  }

  // Best streak
  let best = 0
  let bestStart = sortedDates[0] || new Date()
  let bestEnd = sortedDates[0] || new Date()
  let streakLen = 1
  let streakStart = sortedDates[0]

  for (let i = 1; i < sortedDates.length; i++) {
    const diff = (sortedDates[i - 1].getTime() - sortedDates[i].getTime()) / (1000 * 60 * 60 * 24)
    if (diff === 1) {
      streakLen++
    } else {
      if (streakLen > best) {
        best = streakLen
        bestStart = sortedDates[i - 1]
        bestEnd = streakStart
      }
      streakLen = 1
      streakStart = sortedDates[i]
    }
  }
  if (streakLen > best) {
    best = streakLen
    bestStart = sortedDates[sortedDates.length - 1]
    bestEnd = streakStart
  }

  if (current > best) best = current

  return { current, best, bestStart, bestEnd }
}

function computeHeatmap(workouts: WorkoutHistorySummary[], month: Date): HeatmapDay[] {
  const completed = workouts.filter(w => w.status === 'completed')
  const countMap = new Map<string, number>()
  completed.forEach(w => {
    const key = getDateKey(w.date)
    countMap.set(key, (countMap.get(key) || 0) + 1)
  })

  const year = month.getFullYear()
  const m = month.getMonth()
  const firstDay = new Date(year, m, 1)
  const lastDay = new Date(year, m + 1, 0)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Pad to start on Sunday
  const startPad = firstDay.getDay()
  const days: HeatmapDay[] = []

  // Add padding days from previous month
  for (let i = startPad - 1; i >= 0; i--) {
    const d = new Date(year, m, -i)
    const key = getDateKey(d)
    const count = countMap.get(key) || 0
    days.push({
      date: d,
      count,
      level: count === 0 ? 0 : count === 1 ? 1 : count === 2 ? 2 : count === 3 ? 3 : 4,
      isToday: d.getTime() === today.getTime(),
      isCurrentMonth: false,
    })
  }

  // Add month days
  for (let d = 1; d <= lastDay.getDate(); d++) {
    const date = new Date(year, m, d)
    date.setHours(0, 0, 0, 0)
    const key = getDateKey(date)
    const count = countMap.get(key) || 0
    days.push({
      date,
      count,
      level: count === 0 ? 0 : count === 1 ? 1 : count === 2 ? 2 : count === 3 ? 3 : 4,
      isToday: date.getTime() === today.getTime(),
      isCurrentMonth: true,
    })
  }

  // Pad to fill last row
  const remaining = 7 - (days.length % 7)
  if (remaining < 7) {
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, m + 1, i)
      const key = getDateKey(d)
      const count = countMap.get(key) || 0
      days.push({
        date: d,
        count,
        level: count === 0 ? 0 : count === 1 ? 1 : count === 2 ? 2 : count === 3 ? 3 : 4,
        isToday: false,
        isCurrentMonth: false,
      })
    }
  }

  return days
}

function computeDayPatterns(workouts: WorkoutHistorySummary[]): DayPattern[] {
  const completed = workouts.filter(w => w.status === 'completed')
  const dayNames = ["א'", "ב'", "ג'", "ד'", "ה'", "ו'", "ש'"]
  const dayCounts = [0, 0, 0, 0, 0, 0, 0]

  completed.forEach(w => {
    dayCounts[w.date.getDay()]++
  })

  // Calculate total weeks covered
  if (completed.length === 0) {
    return dayNames.map((name, i) => ({ dayName: name, percentage: 0, count: dayCounts[i], totalWeeks: 0 }))
  }

  const oldestDate = completed.reduce((min, w) => w.date < min ? w.date : min, completed[0].date)
  const totalWeeks = Math.max(1, Math.ceil((Date.now() - oldestDate.getTime()) / (7 * 24 * 60 * 60 * 1000)))

  return dayNames.map((name, i) => ({
    dayName: name,
    percentage: Math.round((dayCounts[i] / totalWeeks) * 100),
    count: dayCounts[i],
    totalWeeks,
  }))
}

function computeWeeklyCompliance(
  workouts: WorkoutHistorySummary[],
  programs: TrainingProgram[]
): { compliance: WeekCompliance[]; skipAnalysis: SkipInfo[]; perfectStreak: number; mostSkipped: string } {
  const completed = workouts.filter(w => w.status === 'completed')
  const activeProgram = programs.find(p => p.status === 'active' && p.type !== 'standalone')
  const plannedPerWeek = activeProgram
    ? activeProgram.weeklyStructure.filter(d => !d.restDay).length
    : 3 // Default assumption

  // Last 8 weeks
  const now = new Date()
  const weeks: WeekCompliance[] = []

  for (let i = 0; i < 8; i++) {
    const weekEnd = new Date(now)
    weekEnd.setDate(weekEnd.getDate() - (i * 7))
    const weekStart = getWeekStart(weekEnd)
    const weekEndDate = new Date(weekStart)
    weekEndDate.setDate(weekEndDate.getDate() + 7)

    const count = completed.filter(w => w.date >= weekStart && w.date < weekEndDate).length
    const percentage = Math.round((count / plannedPerWeek) * 100)

    weeks.push({
      label: i === 0 ? 'השבוע' : `שבוע ${8 - i}`,
      done: count,
      planned: plannedPerWeek,
      percentage: Math.min(percentage, 100),
    })
  }

  // Perfect weeks streak (from most recent)
  let perfectStreak = 0
  for (const week of weeks) {
    if (week.done >= week.planned) perfectStreak++
    else break
  }

  // Skip analysis per program day
  const skipAnalysis: SkipInfo[] = []
  if (activeProgram) {
    const trainingDays = activeProgram.weeklyStructure.filter(d => !d.restDay)
    // Total weeks the program has been active
    const programStart = activeProgram.startDate instanceof Date
      ? activeProgram.startDate
      : (activeProgram.startDate as any)?.toDate?.() || new Date()
    const programWeeks = Math.max(1, Math.ceil((Date.now() - programStart.getTime()) / (7 * 24 * 60 * 60 * 1000)))

    for (const day of trainingDays) {
      const performed = completed.filter(w => w.programDayLabel === day.dayLabel && w.programId === activeProgram.id).length
      const expected = Math.min(programWeeks, 16) // Cap at 16 weeks
      const percentage = Math.round((performed / expected) * 100)

      skipAnalysis.push({
        dayLabel: day.dayLabel,
        dayName: day.name || day.dayLabel,
        performed,
        expected,
        percentage: Math.min(percentage, 100),
      })
    }
  }

  const mostSkipped = skipAnalysis.length > 0
    ? skipAnalysis.reduce((min, s) => s.percentage < min.percentage ? s : min, skipAnalysis[0]).dayLabel
    : ''

  return { compliance: weeks, skipAnalysis, perfectStreak, mostSkipped }
}

function generateTotalInsights(
  thisMonth: number,
  lastMonth: number,
  distribution: WorkoutDistribution[],
): AIInsight[] {
  const insights: AIInsight[] = []

  // Check for imbalanced distribution
  if (distribution.length >= 2) {
    const min = distribution.reduce((m, d) => d.percentage < m.percentage ? d : m, distribution[0])
    if (min.percentage < 30 && distribution.length >= 3) {
      insights.push({
        icon: '⚠️',
        title: 'חוסר איזון בתוכנית',
        text: `${min.label} מקבל רק ${min.percentage}% - פחות מהצפוי. שקול לשלב תרגילים נוספים או לשנות את סדר האימונים.`,
      })
    }
  }

  // Trend analysis
  if (thisMonth > lastMonth) {
    const diff = thisMonth - lastMonth
    insights.push({
      icon: '📈',
      title: 'מגמה חיובית',
      text: `עלייה של ${diff} אימונים מהחודש הקודם. המתאמן בונה עקביות. זה הזמן להעלות את העומס בהדרגה.`,
    })
  } else if (thisMonth < lastMonth && lastMonth > 0) {
    insights.push({
      icon: '📉',
      title: 'ירידה בפעילות',
      text: `ירידה מ-${lastMonth} ל-${thisMonth} אימונים בחודש. כדאי לבדוק מה השתנה ולהתאים את התוכנית.`,
    })
  }

  return insights
}

function generateStreakInsights(
  patterns: DayPattern[],
  currentStreak: number,
  bestStreak: number,
): AIInsight[] {
  const insights: AIInsight[] = []
  const sorted = [...patterns].sort((a, b) => b.percentage - a.percentage)

  // Strongest days
  if (sorted.length >= 2 && sorted[0].percentage > 0) {
    insights.push({
      icon: '📅',
      title: 'הימים החזקים',
      text: `${sorted[0].dayName} (${sorted[0].percentage}%) ו${sorted[1].dayName} (${sorted[1].percentage}%) הם הימים הכי עקביים. המלצה: תזמן את האימונים החשובים לימים האלה.`,
    })
  }

  // Weekend weakness
  const friday = patterns[5]
  const saturday = patterns[6]
  if (friday && saturday && friday.percentage < 20 && saturday.percentage < 20) {
    insights.push({
      icon: '⚠️',
      title: 'חולשה בסוף השבוע',
      text: `שישי ושבת עם אחוזי הצלחה נמוכים (${friday.percentage}%, ${saturday.percentage}%). המלצה: אל תתזמן אימונים חשובים לסוף השבוע.`,
    })
  }

  // Close to record
  if (currentStreak > 0 && bestStreak > currentStreak && bestStreak - currentStreak <= 5) {
    insights.push({
      icon: '🎯',
      title: 'קרוב לשיא!',
      text: `עוד ${bestStreak - currentStreak} ימים רצופים ויישבר השיא האישי. שלח למתאמן הודעת עידוד!`,
    })
  }

  return insights
}

function generateComplianceInsights(
  compliance: WeekCompliance[],
  skipAnalysis: SkipInfo[],
): AIInsight[] {
  const insights: AIInsight[] = []

  // Skip pattern
  const worst = skipAnalysis.length > 0
    ? skipAnalysis.reduce((m, s) => s.percentage < m.percentage ? s : m, skipAnalysis[0])
    : null
  if (worst && worst.percentage < 60) {
    insights.push({
      icon: '🚨',
      title: `בעיה: ${worst.dayName}`,
      text: `המתאמן מדלג על ${100 - worst.percentage}% מ${worst.dayName}. פתרונות אפשריים: לקצר את האימון, לשלב תרגילים באימונים אחרים, או להחליף ליום אחר.`,
    })
  }

  // Improvement trend
  if (compliance.length >= 4) {
    const recent = compliance.slice(0, 4).reduce((s, w) => s + w.percentage, 0) / 4
    const older = compliance.slice(4).reduce((s, w) => s + w.percentage, 0) / Math.max(1, compliance.slice(4).length)
    if (recent > older + 15) {
      insights.push({
        icon: '📈',
        title: 'מגמה חיובית',
        text: `שיפור משמעותי: מממוצע ${Math.round(older)}% ל-${Math.round(recent)}%. המתאמן בונה הרגלים!`,
      })
    }
  }

  return insights
}

function generatePRInsights(
  recentPRs: PersonalRecord[],
  stuckExercises: StuckExercise[],
  skipAnalysis: SkipInfo[],
): AIInsight[] {
  const insights: AIInsight[] = []

  if (recentPRs.length > 0) {
    const names = recentPRs.slice(0, 3).map(r => r.exerciseNameHe || r.exerciseName).join(', ')
    insights.push({
      icon: '🎯',
      title: 'תרגילים שעובדים',
      text: `${names} מראים התקדמות יפה. המלצה: המשך עם התקדמות הדרגתית בעומס.`,
    })
  }

  if (stuckExercises.length > 0) {
    const names = stuckExercises.slice(0, 2).map(r => r.exerciseNameHe || r.exerciseName).join(' ו')
    insights.push({
      icon: '🔄',
      title: 'צריך שינוי',
      text: `${names} תקועים ${stuckExercises[0].weeksSinceImprovement}+ שבועות. המלצות: החלף לוריאציות, שנה טווח חזרות, או הוסף Drop sets.`,
    })
  }

  // Cross-reference stuck exercises with skip patterns
  if (stuckExercises.length > 0 && skipAnalysis.length > 0) {
    const worst = skipAnalysis.reduce((m, s) => s.percentage < m.percentage ? s : m, skipAnalysis[0])
    if (worst.percentage < 60) {
      insights.push({
        icon: '⚠️',
        title: 'קשר אפשרי',
        text: `תרגילים תקועים + דילוגים על ${worst.dayName} (${worst.percentage}%). ייתכן שיש קשר. בדוק: האם יש בעיה פיזית? חוסר מוטיבציה?`,
      })
    }
  }

  return insights
}

// ============ MAIN HOOK ============

export function useTraineeAnalytics(traineeId: string | undefined): AnalyticsData {
  const [isLoading, setIsLoading] = useState(true)
  const [workouts, setWorkouts] = useState<WorkoutHistorySummary[]>([])
  const [records, setRecords] = useState<PersonalRecord[]>([])
  const [programs, setPrograms] = useState<TrainingProgram[]>([])
  const [heatmapMonth, setHeatmapMonth] = useState(new Date())

  useEffect(() => {
    if (!traineeId) return

    const load = async () => {
      setIsLoading(true)
      try {
        const [w, r, p] = await Promise.all([
          getUserWorkoutHistory(traineeId, 200, true),
          getPersonalRecords(traineeId),
          programService.getTraineePrograms(traineeId),
        ])
        setWorkouts(w)
        setRecords(r)
        setPrograms(p)
      } catch (err) {
        console.error('Failed to load analytics:', err)
      } finally {
        setIsLoading(false)
      }
    }

    load()
  }, [traineeId])

  return useMemo(() => {
    const completed = workouts.filter(w => w.status === 'completed')
    const now = new Date()

    // ---- Total tab ----
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

    const thisMonthWorkouts = completed.filter(w => w.date >= monthStart).length
    const lastMonthWorkouts = completed.filter(w => w.date >= lastMonthStart && w.date <= lastMonthEnd).length

    const yearStart = new Date(now.getFullYear(), 0, 1)
    const yearTotal = completed.filter(w => w.date >= yearStart).length

    // Weekly average (over last 8 weeks)
    const eightWeeksAgo = new Date(now)
    eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 56)
    const recentCompleted = completed.filter(w => w.date >= eightWeeksAgo)
    const weeklyAverage = recentCompleted.length > 0 ? Math.round((recentCompleted.length / 8) * 10) / 10 : 0

    // Average duration
    const avgDuration = completed.length > 0
      ? Math.round(completed.reduce((s, w) => s + w.duration, 0) / completed.length)
      : 0

    // Weekly chart (last 8 weeks)
    const weeklyChart: WeeklyData[] = []
    for (let i = 7; i >= 0; i--) {
      const weekStart = getWeekStart(new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000))
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 7)
      const count = completed.filter(w => w.date >= weekStart && w.date < weekEnd).length
      weeklyChart.push({
        label: i === 0 ? 'השבוע' : `שבוע ${8 - i}`,
        workouts: count,
      })
    }

    // Workout distribution by program day
    const distMap = new Map<string, number>()
    completed.forEach(w => {
      const label = w.programDayLabel || w.name || 'אחר'
      distMap.set(label, (distMap.get(label) || 0) + 1)
    })
    const totalForDist = completed.length || 1
    const workoutDistribution: WorkoutDistribution[] = Array.from(distMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([label, count], i) => ({
        label,
        count,
        percentage: Math.round((count / totalForDist) * 100),
        color: DISTRIBUTION_COLORS[i % DISTRIBUTION_COLORS.length],
      }))

    // ---- Streak tab ----
    const streakData = computeStreak(workouts)
    const bestStreakRange = `${streakData.bestStart.getDate()}/${streakData.bestStart.getMonth() + 1}-${streakData.bestEnd.getDate()}/${streakData.bestEnd.getMonth() + 1}`
    const heatmapData = computeHeatmap(workouts, heatmapMonth)
    const dayPatterns = computeDayPatterns(workouts)

    // ---- Weekly compliance tab ----
    const complianceData = computeWeeklyCompliance(workouts, programs)
    const thisWeekStart = getWeekStart(now)
    const thisWeekEnd = new Date(thisWeekStart)
    thisWeekEnd.setDate(thisWeekEnd.getDate() + 7)
    const thisWeekDone = completed.filter(w => w.date >= thisWeekStart && w.date < thisWeekEnd).length
    const activeProgram = programs.find(p => p.status === 'active' && p.type !== 'standalone')
    const thisWeekPlanned = activeProgram
      ? activeProgram.weeklyStructure.filter(d => !d.restDay).length
      : 3
    const avgCompliance = complianceData.compliance.length > 0
      ? Math.round(complianceData.compliance.reduce((s, w) => s + w.percentage, 0) / complianceData.compliance.length)
      : 0

    // ---- PR tab ----
    const thirtyDaysAgo = new Date(now)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const recentPRs = records.filter(r => r.hasImproved && r.bestDate >= thirtyDaysAgo)
    const totalPRs = records.filter(r => r.hasImproved).length
    const improvingCount = recentPRs.length

    // Stuck exercises: no improvement for 4+ weeks, must have been performed at least twice
    const fourWeeksAgo = new Date(now)
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28)
    const stuckExercises: StuckExercise[] = records
      .filter(r => !r.hasImproved && r.workoutCount >= 2 && r.bestDate < fourWeeksAgo)
      .map(r => {
        const weeksSince = Math.floor((now.getTime() - r.bestDate.getTime()) / (7 * 24 * 60 * 60 * 1000))
        return { ...r, weeksSinceImprovement: weeksSince }
      })
      .sort((a, b) => b.weeksSinceImprovement - a.weeksSinceImprovement)
      .slice(0, 5)

    // ---- AI Insights ----
    const totalInsights = generateTotalInsights(thisMonthWorkouts, lastMonthWorkouts, workoutDistribution)
    const streakInsights = generateStreakInsights(dayPatterns, streakData.current, streakData.best)
    const complianceInsights = generateComplianceInsights(complianceData.compliance, complianceData.skipAnalysis)
    const prInsights = generatePRInsights(recentPRs, stuckExercises, complianceData.skipAnalysis)

    return {
      isLoading,
      // Total tab
      totalWorkouts: completed.length,
      thisMonthWorkouts,
      yearTotal,
      weeklyAverage,
      avgDuration,
      weeklyChart,
      workoutDistribution,
      monthCompare: thisMonthWorkouts - lastMonthWorkouts,
      totalInsights,
      // Streak tab
      currentStreak: streakData.current,
      bestStreak: streakData.best,
      bestStreakRange,
      heatmapData,
      heatmapMonth,
      setHeatmapMonth,
      dayPatterns,
      streakInsights,
      // Weekly compliance tab
      thisWeekDone,
      thisWeekPlanned,
      avgCompliance,
      perfectWeeksStreak: complianceData.perfectStreak,
      mostSkippedDay: complianceData.mostSkipped,
      weeklyCompliance: complianceData.compliance,
      skipAnalysis: complianceData.skipAnalysis,
      complianceInsights,
      // PR tab
      prsThisMonth: recentPRs.length,
      totalPRs,
      improvingCount,
      stuckCount: stuckExercises.length,
      recentPRs,
      stuckExercises,
      prInsights,
    }
  }, [workouts, records, programs, heatmapMonth, isLoading])
}
