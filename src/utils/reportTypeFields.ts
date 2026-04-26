/**
 * Report-type field utilities — single source of truth for which fields a given
 * exercise reportType uses, in what display order, and which axis represents the
 * "personal record" for that type.
 *
 * Used by:
 * - SetReportRow (input rendering)
 * - ExerciseCard PR/last-workout summary rows
 * - workoutHistory PR/last-workout aggregation
 */

export type ReportField =
  | 'weight'
  | 'reps'
  | 'time'
  | 'intensity'
  | 'speed'
  | 'distance'
  | 'incline'
  | 'zone'

/**
 * Parse a reportType string into the ordered list of fields it captures.
 * Tolerates English, Hebrew, and common typos. Order matches display order.
 */
export function getFieldsFromReportType(type?: string): ReportField[] {
  const normalized = (type || 'weight_reps').toLowerCase()
  const fields: ReportField[] = []

  if (normalized.includes('weight') || normalized.includes('משקל')) fields.push('weight')
  if (normalized.includes('reps') || normalized.includes('חזרות')) fields.push('reps')
  if (normalized.includes('time') || normalized.includes('זמן')) fields.push('time')
  if (normalized.includes('intensity') || normalized.includes('עצימות')) fields.push('intensity')
  if (normalized.includes('speed') || normalized.includes('spead') || normalized.includes('מהירות')) fields.push('speed')
  if (normalized.includes('distance') || normalized.includes('מרחק')) fields.push('distance')
  if (
    normalized.includes('incline') ||
    normalized.includes('slope') ||
    normalized.includes('slop') ||
    normalized.includes('slot') ||
    normalized.includes('שיפוע')
  ) fields.push('incline')
  if (normalized.includes('zone') || normalized.includes('אזור')) fields.push('zone')

  if (fields.length === 0) {
    return ['weight', 'reps']
  }
  return fields
}

/**
 * Pick the axis that defines a "personal record" for the reportType.
 *
 * Rules (in priority order):
 *   1. speed   — cardio with measurable speed (treadmill, bike): faster = better
 *   2. weight  — strength: heavier = better (default for weight_reps)
 *   3. time    — endurance / hold time: longer = better
 *   4. intensity — cardio with intensity scale
 *   5. distance — distance-based cardio
 *   6. reps    — bodyweight reps without weight
 *
 * Falls back to 'weight' to preserve historical behavior.
 */
export function getPRAxisForReportType(type?: string): ReportField {
  const fields = getFieldsFromReportType(type)
  if (fields.includes('speed')) return 'speed'
  if (fields.includes('weight')) return 'weight'
  if (fields.includes('time')) return 'time'
  if (fields.includes('intensity')) return 'intensity'
  if (fields.includes('distance')) return 'distance'
  if (fields.includes('reps')) return 'reps'
  return 'weight'
}

/**
 * The set/data shape this formatter accepts. All fields optional —
 * we only show what was actually reported.
 */
export interface ReportedFieldValues {
  weight?: number
  reps?: number
  time?: number
  intensity?: number
  speed?: number
  distance?: number
  incline?: number
  zone?: number
}

/**
 * Format a "best set" record into a human-readable Hebrew string per reportType.
 * Only shows fields that were actually reported (>0). Returns empty string if
 * no reported field is relevant — caller should hide the row in that case.
 */
export function formatReportedFields(
  data: ReportedFieldValues,
  reportType?: string
): string {
  const fields = getFieldsFromReportType(reportType)
  const parts: string[] = []

  for (const field of fields) {
    switch (field) {
      case 'reps':
        if (typeof data.reps === 'number' && data.reps > 0) {
          parts.push(`${data.reps} חזרות`)
        }
        break
      case 'weight':
        if (typeof data.weight === 'number' && data.weight > 0) {
          parts.push(`${data.weight}kg`)
        }
        break
      case 'time':
        if (typeof data.time === 'number' && data.time > 0) {
          const m = Math.floor(data.time / 60)
          const s = data.time % 60
          parts.push(`${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`)
        }
        break
      case 'speed':
        if (typeof data.speed === 'number' && data.speed > 0) {
          parts.push(`${data.speed} קמ"ש`)
        }
        break
      case 'incline':
        if (typeof data.incline === 'number' && data.incline > 0) {
          parts.push(`שיפוע ${data.incline}`)
        }
        break
      case 'intensity':
        if (typeof data.intensity === 'number' && data.intensity > 0) {
          parts.push(`עצימות ${data.intensity}`)
        }
        break
      case 'distance':
        if (typeof data.distance === 'number' && data.distance > 0) {
          parts.push(`${data.distance} מ'`)
        }
        break
      case 'zone':
        if (typeof data.zone === 'number' && data.zone > 0) {
          parts.push(`אזור ${data.zone}`)
        }
        break
    }
  }

  return parts.join(' · ')
}
