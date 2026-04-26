/**
 * Auto-generated insights — compute simple, factual signals from the
 * dataset. No AI; just basic derivations.
 */
import type {
  AnalyticsDataset,
  ExercisePopularity,
  InsightLine,
  TrainerSummary,
} from './analytics.types'

export function buildInsights(args: {
  dataset: AnalyticsDataset
  trainers: TrainerSummary[]
  topExercises: ExercisePopularity[]
}): InsightLine[] {
  const { trainers, topExercises } = args
  const lines: InsightLine[] = []

  // 1. Inactive trainers in the active window
  const inactiveTrainers = trainers.filter((t) => !t.isActive && t.traineeCount > 0)
  if (inactiveTrainers.length > 0) {
    lines.push({
      text: `${inactiveTrainers.length} מאמנים לא היו פעילים השבוע מתוך ${trainers.length}`,
      tone: inactiveTrainers.length > trainers.length / 2 ? 'warning' : 'neutral',
    })
  }

  // 2. Top rising exercise
  const rising = topExercises
    .filter((e) => e.deltaPct !== null && e.deltaPct > 20)
    .sort((a, b) => (b.deltaPct ?? 0) - (a.deltaPct ?? 0))[0]
  if (rising && rising.deltaPct !== null) {
    lines.push({
      text: `התרגיל "${rising.exerciseName}" עלה ב-${Math.round(rising.deltaPct)}% מהתקופה הקודמת`,
      tone: 'positive',
    })
  }

  // 3. Top falling exercise
  const falling = topExercises
    .filter((e) => e.deltaPct !== null && e.deltaPct < -20)
    .sort((a, b) => (a.deltaPct ?? 0) - (b.deltaPct ?? 0))[0]
  if (falling && falling.deltaPct !== null) {
    lines.push({
      text: `התרגיל "${falling.exerciseName}" ירד ב-${Math.abs(Math.round(falling.deltaPct))}% מהתקופה הקודמת`,
      tone: 'warning',
    })
  }

  // 4. Best-engaged trainer
  const best = [...trainers]
    .filter((t) => t.traineeCount >= 2)
    .sort((a, b) => b.activeTraineePct - a.activeTraineePct)[0]
  if (best && best.activeTraineePct >= 70) {
    lines.push({
      text: `המאמן "${best.name}" עם שיעור פעילות גבוה — ${Math.round(best.activeTraineePct)}% מהמתאמנים פעילים השבוע`,
      tone: 'positive',
    })
  }

  if (lines.length === 0) {
    lines.push({ text: 'אין תובנות מיוחדות בטווח הנוכחי', tone: 'neutral' })
  }
  return lines
}
