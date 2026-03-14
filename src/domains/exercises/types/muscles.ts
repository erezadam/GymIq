// Muscle types and mapping

export type BodyRegion = 'upper' | 'lower' | 'neutral'

export interface SubMuscle {
  id: string
  nameHe: string
  nameEn: string
}

export interface PrimaryMuscle {
  id: string
  nameHe: string
  nameEn: string
  icon: string
  bodyRegion?: BodyRegion
  subMuscles: SubMuscle[]
}

// Default muscle mapping - should match Firebase 'muscles' collection
// Updated 2026-03-10 to sync with Firebase
export const defaultMuscleMapping: PrimaryMuscle[] = [
  {
    id: 'biceps_brachii',
    nameHe: 'זרוע קדמית',
    nameEn: 'Biceps Brachii',
    icon: '💪',
    subMuscles: [],
  },
  {
    id: 'triceps',
    nameHe: 'זרוע אחורית',
    nameEn: 'Triceps',
    icon: '💪',
    subMuscles: [],
  },
  {
    id: 'chest',
    nameHe: 'חזה',
    nameEn: 'Chest',
    icon: '🫁',
    subMuscles: [
      { id: 'upper_chest', nameHe: 'חזה עליון', nameEn: 'Upper Chest' },
      { id: 'mid_chest', nameHe: 'חזה אמצעי', nameEn: 'Mid Chest' },
      { id: 'lower_chest', nameHe: 'חזה תחתון', nameEn: 'Lower Chest' },
    ],
  },
  {
    id: 'back',
    nameHe: 'גב',
    nameEn: 'Back',
    icon: '🔙',
    subMuscles: [
      { id: 'lats', nameHe: 'לאטס (רוחב)', nameEn: 'Lats' },
      { id: 'traps', nameHe: 'טרפז', nameEn: 'Traps' },
    ],
  },
  {
    id: 'shoulders',
    nameHe: 'כתפיים',
    nameEn: 'Shoulders',
    icon: '🏋️',
    subMuscles: [
      { id: 'front_delt', nameHe: 'כתף קדמית', nameEn: 'Front Delt' },
      { id: 'side_delt', nameHe: 'כתף אמצעית', nameEn: 'Side Delt' },
      { id: 'rear_delt', nameHe: 'כתף אחורית', nameEn: 'Rear Delt' },
    ],
  },
  {
    id: 'legs',
    nameHe: 'רגליים',
    nameEn: 'Legs',
    icon: '🦵',
    subMuscles: [
      { id: 'quads', nameHe: 'ארבע ראשי ', nameEn: 'Quadriceps' },
      { id: 'hamstrings', nameHe: 'ירך אחורי', nameEn: 'Hamstrings' },
      { id: 'glutes', nameHe: 'ישבן', nameEn: 'Glutes' },
      { id: 'calves', nameHe: 'תאומים ', nameEn: 'Calves' },
      { id: 'adductor', nameHe: 'מקרבים ', nameEn: 'Adductors' },
    ],
  },
  {
    id: 'core',
    nameHe: 'ליבה',
    nameEn: 'Core',
    icon: '🎯',
    subMuscles: [
      { id: 'abs', nameHe: 'שריר בטן ישר', nameEn: 'Abs' },
      { id: 'obliques', nameHe: 'אלכסוניים', nameEn: 'Obliques' },
      { id: 'lower_abs', nameHe: 'בטן תחתונה', nameEn: 'Lower Abs' },
    ],
  },
  {
    id: 'gluteus_maximus',
    nameHe: 'ישבן ',
    nameEn: 'Gluteus Maximus',
    icon: '🍑',
    subMuscles: [
      { id: 'longissimus', nameHe: 'ישבן ', nameEn: 'Longissimus' },
    ],
  },
  {
    id: 'cardio',
    nameHe: 'אירובי',
    nameEn: 'Cardio',
    icon: '❤️',
    subMuscles: [
      { id: 'warmup', nameHe: 'חימום', nameEn: 'Warmup' },
    ],
  },
]

// Helper function to get sub-muscles for a primary muscle
export function getSubMusclesFor(primaryMuscleId: string, muscleMapping: PrimaryMuscle[] = defaultMuscleMapping): SubMuscle[] {
  const primaryMuscle = muscleMapping.find(m => m.id === primaryMuscleId)
  return primaryMuscle?.subMuscles || []
}

// Helper function to get all primary muscles
export function getAllPrimaryMuscles(muscleMapping: PrimaryMuscle[] = defaultMuscleMapping): PrimaryMuscle[] {
  return muscleMapping
}
