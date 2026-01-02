// Muscle types and mapping

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
  subMuscles: SubMuscle[]
}

// Default muscle mapping - can be overridden by Firebase data
export const defaultMuscleMapping: PrimaryMuscle[] = [
  {
    id: 'chest',
    nameHe: 'חזה',
    nameEn: 'Chest',
    icon: '🫁',
    subMuscles: [
      { id: 'upper_chest', nameHe: 'חזה עליון', nameEn: 'Upper Chest' },
      { id: 'middle_chest', nameHe: 'חזה אמצעי', nameEn: 'Middle Chest' },
      { id: 'lower_chest', nameHe: 'חזה תחתון', nameEn: 'Lower Chest' },
      { id: 'inner_chest', nameHe: 'חזה פנימי', nameEn: 'Inner Chest' },
    ],
  },
  {
    id: 'back',
    nameHe: 'גב',
    nameEn: 'Back',
    icon: '🔙',
    subMuscles: [
      { id: 'lats', nameHe: 'גב רחב', nameEn: 'Lats' },
      { id: 'upper_back', nameHe: 'גב עליון', nameEn: 'Upper Back' },
      { id: 'lower_back', nameHe: 'גב תחתון', nameEn: 'Lower Back' },
      { id: 'rhomboids', nameHe: 'רומבואידים', nameEn: 'Rhomboids' },
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
      { id: 'side_delt', nameHe: 'כתף צדדית', nameEn: 'Side Delt' },
      { id: 'rear_delt', nameHe: 'כתף אחורית', nameEn: 'Rear Delt' },
    ],
  },
  {
    id: 'arms',
    nameHe: 'זרועות',
    nameEn: 'Arms',
    icon: '💪',
    subMuscles: [
      { id: 'biceps', nameHe: 'ביספס', nameEn: 'Biceps' },
      { id: 'triceps', nameHe: 'טרייספס', nameEn: 'Triceps' },
      { id: 'forearms', nameHe: 'אמות', nameEn: 'Forearms' },
    ],
  },
  {
    id: 'legs',
    nameHe: 'רגליים',
    nameEn: 'Legs',
    icon: '🦵',
    subMuscles: [
      { id: 'quadriceps', nameHe: 'ארבע ראשי', nameEn: 'Quadriceps' },
      { id: 'hamstrings', nameHe: 'ירך אחורי', nameEn: 'Hamstrings' },
      { id: 'glutes', nameHe: 'ישבן', nameEn: 'Glutes' },
      { id: 'calves', nameHe: 'שוקיים', nameEn: 'Calves' },
      { id: 'adductors', nameHe: 'מקרבים', nameEn: 'Adductors' },
    ],
  },
  {
    id: 'core',
    nameHe: 'ליבה',
    nameEn: 'Core',
    icon: '🎯',
    subMuscles: [
      { id: 'abs', nameHe: 'בטן', nameEn: 'Abs' },
      { id: 'obliques', nameHe: 'אלכסוניים', nameEn: 'Obliques' },
      { id: 'lower_abs', nameHe: 'בטן תחתונה', nameEn: 'Lower Abs' },
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
