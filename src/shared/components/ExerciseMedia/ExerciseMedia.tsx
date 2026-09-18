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
  // 2:1 exercise images (start panel right, end panel left, arrow center):
  // a square thumbnail crop must anchor on the END panel (physical left) —
  // otherwise object-cover shows the arrow. Detected at load time.
  const [isWideImage, setIsWideImage] = useState(false)

  const allowAnimation = variant !== 'thumbnail'
  const hasImageUrl = !!(imageUrl && imageUrl.trim() !== '')
  const hasVideoWebp = !!videoWebpUrl

  if (!hasImageUrl && !hasVideoWebp && placeholder) {
    return <>{placeholder}</>
  }

  const staticUrl = getExerciseImageUrl({ imageUrl, name: exerciseName })
  const effectiveUrl =
    allowAnimation && hasVideoWebp && !webpFailed ? videoWebpUrl : staticUrl

  // Hero variants must show the whole exercise — swap object-cover (which crops)
  // for object-contain so head/feet stay in frame. Letterbox bars are acceptable.
  let finalClassName =
    variant === 'hero' && className
      ? className.replace(/\bobject-cover\b/g, 'object-contain')
      : className

  // Thumbnail-only: anchor the crop on the end panel (physical left — NOT
  // logical start/end, the panels in the image are physical so RTL must not flip it).
  if (variant === 'thumbnail' && isWideImage) {
    finalClassName = finalClassName ? `${finalClassName} object-left` : 'object-left'
  }

  return (
    <img
      src={effectiveUrl}
      alt={alt}
      className={finalClassName}
      loading={loading}
      onClick={onClick}
      onLoad={(e) => {
        if (variant !== 'thumbnail') return
        const { naturalWidth, naturalHeight } = e.currentTarget
        const wide = naturalHeight > 0 && naturalWidth / naturalHeight >= 1.8
        if (wide !== isWideImage) setIsWideImage(wide)
      }}
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
