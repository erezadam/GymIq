/**
 * Report Types - Dynamic report type definitions
 * Used for configuring how exercise sets are reported
 */

// Field types available for set reporting
export type ReportFieldType = 'weight' | 'reps' | 'time' | 'intensity' | 'speed' | 'distance' | 'incline'

// Single field configuration
export interface ReportField {
  type: ReportFieldType
  label?: string      // Custom label (e.g., "עצימות (1-10)")
  required: boolean
}

// Main ReportType interface
export interface ReportType {
  id: string
  nameHe: string
  nameEn: string
  fields: ReportField[]
  isActive: boolean
  sortOrder: number
  createdAt?: Date
  updatedAt?: Date
}

// Default report types for initialization
export const defaultReportTypes: ReportType[] = [
  {
    id: 'weight_reps',
    nameHe: 'משקל + חזרות',
    nameEn: 'Weight + Reps',
    fields: [
      { type: 'weight', required: true },
      { type: 'reps', required: true },
    ],
    isActive: true,
    sortOrder: 1,
  },
  {
    id: 'reps_only',
    nameHe: 'חזרות בלבד',
    nameEn: 'Reps Only',
    fields: [
      { type: 'reps', required: true },
    ],
    isActive: true,
    sortOrder: 2,
  },
  {
    id: 'time_only',
    nameHe: 'זמן בלבד',
    nameEn: 'Time Only',
    fields: [
      { type: 'time', required: true },
    ],
    isActive: true,
    sortOrder: 3,
  },
  {
    id: 'reps_time',
    nameHe: 'חזרות + זמן',
    nameEn: 'Reps + Time',
    fields: [
      { type: 'reps', required: true },
      { type: 'time', required: true },
    ],
    isActive: true,
    sortOrder: 4,
  },
  {
    id: 'intensity_time',
    nameHe: 'עצימות + זמן',
    nameEn: 'Intensity + Time',
    fields: [
      { type: 'intensity', label: 'עצימות (1-100)', required: true },
      { type: 'time', required: true },
    ],
    isActive: true,
    sortOrder: 5,
  },
]

// Helper to get default labels for field types (Hebrew)
export function getDefaultFieldLabel(fieldType: ReportFieldType): string {
  switch (fieldType) {
    case 'weight':
      return 'משקל'
    case 'reps':
      return 'חזרות'
    case 'time':
      return 'זמן'
    case 'intensity':
      return 'עצימות (1-100)'
    case 'speed':
      return 'מהירות'
    case 'distance':
      return 'מרחק'
    case 'incline':
      return 'שיפוע (1-20)'
    default:
      return fieldType
  }
}
