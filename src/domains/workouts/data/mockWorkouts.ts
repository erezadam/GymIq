import type { WorkoutTemplate } from '../types'

// Summary type for mock data (simplified from WorkoutHistoryEntry)
interface WorkoutHistorySummaryMock {
  id: string
  name: string
  date: Date
  duration: number
  exerciseCount: number
  totalVolume: number
  personalRecords: number
}

export const workoutTemplates: WorkoutTemplate[] = [
  {
    id: 'template_1',
    name: 'Push Day',
    nameHe: 'יום דחיפה - חזה, כתפיים, טרייספס',
    description: 'Complete push workout targeting chest, shoulders, and triceps',
    category: 'push',
    estimatedDuration: 60,
    createdBy: 'system',
    isPublic: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    exercises: [
      {
        id: 'we_1',
        exerciseId: '1',
        exerciseName: 'Bench Press',
        exerciseNameHe: 'לחיצת חזה',
        order: 1,
        restTime: 90,
        sets: [
          { id: 's1', type: 'warmup', targetReps: 12, targetWeight: 40, completed: false },
          { id: 's2', type: 'working', targetReps: 10, targetWeight: 60, completed: false },
          { id: 's3', type: 'working', targetReps: 8, targetWeight: 70, completed: false },
          { id: 's4', type: 'working', targetReps: 6, targetWeight: 80, completed: false },
        ],
      },
      {
        id: 'we_2',
        exerciseId: '4',
        exerciseName: 'Push-up',
        exerciseNameHe: 'שכיבות שמיכה',
        order: 2,
        restTime: 60,
        sets: [
          { id: 's5', type: 'working', targetReps: 15, completed: false },
          { id: 's6', type: 'working', targetReps: 15, completed: false },
          { id: 's7', type: 'working', targetReps: 15, completed: false },
        ],
      },
    ],
  },
  {
    id: 'template_2',
    name: 'Pull Day',
    nameHe: 'יום משיכה - גב וביספס',
    description: 'Complete pull workout targeting back and biceps',
    category: 'pull',
    estimatedDuration: 55,
    createdBy: 'system',
    isPublic: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    exercises: [
      {
        id: 'we_3',
        exerciseId: '5',
        exerciseName: 'Pull-up',
        exerciseNameHe: 'מתח',
        order: 1,
        restTime: 90,
        sets: [
          { id: 's8', type: 'working', targetReps: 8, completed: false },
          { id: 's9', type: 'working', targetReps: 8, completed: false },
          { id: 's10', type: 'working', targetReps: 8, completed: false },
        ],
      },
      {
        id: 'we_4',
        exerciseId: '3',
        exerciseName: 'Deadlift',
        exerciseNameHe: 'הרמת משקל מת',
        order: 2,
        restTime: 120,
        sets: [
          { id: 's11', type: 'warmup', targetReps: 10, targetWeight: 60, completed: false },
          { id: 's12', type: 'working', targetReps: 8, targetWeight: 100, completed: false },
          { id: 's13', type: 'working', targetReps: 6, targetWeight: 120, completed: false },
        ],
      },
    ],
  },
  {
    id: 'template_3',
    name: 'Leg Day',
    nameHe: 'יום רגליים',
    description: 'Complete leg workout',
    category: 'legs',
    estimatedDuration: 65,
    createdBy: 'system',
    isPublic: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    exercises: [
      {
        id: 'we_5',
        exerciseId: '2',
        exerciseName: 'Squat',
        exerciseNameHe: 'כפיפת ברכיים',
        order: 1,
        restTime: 120,
        sets: [
          { id: 's14', type: 'warmup', targetReps: 12, targetWeight: 40, completed: false },
          { id: 's15', type: 'working', targetReps: 10, targetWeight: 80, completed: false },
          { id: 's16', type: 'working', targetReps: 8, targetWeight: 100, completed: false },
          { id: 's17', type: 'working', targetReps: 6, targetWeight: 110, completed: false },
        ],
      },
    ],
  },
]

export const workoutHistory: WorkoutHistorySummaryMock[] = [
  {
    id: 'history_1',
    name: 'יום דחיפה - חזה, כתפיים, טרייספס',
    date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    duration: 65,
    exerciseCount: 6,
    totalVolume: 4500,
    personalRecords: 1,
  },
  {
    id: 'history_2',
    name: 'יום משיכה - גב וביספס',
    date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    duration: 55,
    exerciseCount: 5,
    totalVolume: 3800,
    personalRecords: 0,
  },
  {
    id: 'history_3',
    name: 'יום רגליים',
    date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    duration: 70,
    exerciseCount: 7,
    totalVolume: 6200,
    personalRecords: 2,
  },
  {
    id: 'history_4',
    name: 'יום דחיפה - חזה, כתפיים, טרייספס',
    date: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
    duration: 60,
    exerciseCount: 6,
    totalVolume: 4200,
    personalRecords: 0,
  },
  {
    id: 'history_5',
    name: 'יום משיכה - גב וביספס',
    date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    duration: 50,
    exerciseCount: 5,
    totalVolume: 3500,
    personalRecords: 1,
  },
]
