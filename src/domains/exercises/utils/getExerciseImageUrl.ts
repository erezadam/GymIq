/**
 * Get exercise image URL with smart fallback
 * 1. Use imageUrl if available
 * 2. Build URL from English name if no imageUrl
 * 3. Fallback to placeholder
 */

const GITHUB_IMAGES_BASE = 'https://raw.githubusercontent.com/erezadam/exercise-images-en/main/images'
const PLACEHOLDER_IMAGE = '/images/exercise-placeholder.svg'

interface ExerciseImageData {
  imageUrl?: string
  name?: string // English name
}

export function getExerciseImageUrl(exercise: ExerciseImageData): string {
  // 1. Use imageUrl if available and not empty
  if (exercise.imageUrl && exercise.imageUrl.trim() !== '') {
    return exercise.imageUrl
  }

  // 2. Build URL from English name
  if (exercise.name && exercise.name.trim() !== '') {
    const imageName = exercise.name
      .toLowerCase()
      .replace(/\s+/g, '-')      // spaces to dashes
      .replace(/[()]/g, '')       // remove parentheses
      .replace(/[^a-z0-9-]/g, '') // remove special chars
      .replace(/-+/g, '-')        // multiple dashes to single
      .replace(/^-|-$/g, '')      // trim dashes from ends
    return `${GITHUB_IMAGES_BASE}/${imageName}.png`
  }

  // 3. Fallback to placeholder
  return PLACEHOLDER_IMAGE
}

export const EXERCISE_PLACEHOLDER_IMAGE = PLACEHOLDER_IMAGE
