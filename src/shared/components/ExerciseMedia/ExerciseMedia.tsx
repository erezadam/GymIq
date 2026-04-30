import { useState, type ReactNode, type MouseEvent } from 'react'
import { getExerciseImageUrl, EXERCISE_PLACEHOLDER_IMAGE } from '@/domains/exercises/utils'

export type ExerciseMediaVariant = 'hero' | 'thumbnail' | 'preview'

export interface ExerciseMediaProps {
  imageUrl?: string
  videoWebpUrl?: string
  exerciseName?: string
  alt: string
  className?: string
  onClick?: (e: MouseEvent<HTMLImageElement>) => void
  loading?: 'lazy' | 'eager'
  variant?: ExerciseMediaVariant
  placeholder?: ReactNode
}

// Single source of truth for displaying exercise media (animated WebP or static image).
// `thumbnail` variant skips the WebP for perf — see CHANGELOG 2026-04-30 (Phase 1).
export function ExerciseMedia({
  imageUrl,
  videoWebpUrl,
  exerciseName,
  alt,
  className,
  onClick,
  loading = 'lazy',
  variant = 'thumbnail',
  placeholder,
}: ExerciseMediaProps) {
  const [webpFailed, setWebpFailed] = useState(false)

  const allowAnimation = variant !== 'thumbnail'
  const hasImageUrl = !!(imageUrl && imageUrl.trim() !== '')
  const hasVideoWebp = !!videoWebpUrl

  if (!hasImageUrl && !hasVideoWebp && placeholder) {
    return <>{placeholder}</>
  }

  const staticUrl = getExerciseImageUrl({ imageUrl, name: exerciseName })
  const effectiveUrl =
    allowAnimation && hasVideoWebp && !webpFailed ? videoWebpUrl : staticUrl

  return (
    <img
      src={effectiveUrl}
      alt={alt}
      className={className}
      loading={loading}
      onClick={onClick}
      onError={(e) => {
        const target = e.currentTarget
        if (allowAnimation && hasVideoWebp && !webpFailed) {
          setWebpFailed(true)
          return
        }
        if (!target.src.endsWith(EXERCISE_PLACEHOLDER_IMAGE)) {
          target.src = EXERCISE_PLACEHOLDER_IMAGE
        }
      }}
    />
  )
}

export default ExerciseMedia
