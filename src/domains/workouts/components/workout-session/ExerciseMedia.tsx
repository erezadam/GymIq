/**
 * ExerciseMedia Component
 * Video/Image display with play button overlay
 */

import { useState } from 'react'
import { Play, X } from 'lucide-react'
import { EXERCISE_PLACEHOLDER_IMAGE } from '@/domains/exercises/utils'

interface ExerciseMediaProps {
  imageUrl?: string
  videoUrl?: string
  exerciseName: string
}

export function ExerciseMedia({ imageUrl, videoUrl, exerciseName }: ExerciseMediaProps) {
  const [showModal, setShowModal] = useState(false)
  const [imageError, setImageError] = useState(false)

  const hasMedia = imageUrl || videoUrl
  const hasVideo = !!videoUrl

  if (!hasMedia || imageError) {
    // Placeholder with fallback image
    return (
      <div className="exercise-media-placeholder">
        <img
          src={EXERCISE_PLACEHOLDER_IMAGE}
          alt={exerciseName}
          className="w-full h-full object-cover"
        />
      </div>
    )
  }

  return (
    <>
      {/* Thumbnail */}
      <div
        className="exercise-media-thumbnail"
        onClick={() => setShowModal(true)}
      >
        <img
          src={imageUrl}
          alt={exerciseName}
          className="w-full h-full object-cover"
          onError={() => setImageError(true)}
        />

        {/* Play button overlay (if video) */}
        {hasVideo && (
          <div className="exercise-media-play-overlay">
            <div className="exercise-media-play-btn">
              <Play className="w-8 h-8 text-white fill-white" />
            </div>
          </div>
        )}

        {/* Gradient overlay */}
        <div className="exercise-media-gradient" />
      </div>

      {/* Fullscreen Modal */}
      {showModal && (
        <div className="exercise-media-modal" onClick={() => setShowModal(false)}>
          <button
            className="exercise-media-modal-close"
            onClick={() => setShowModal(false)}
          >
            <X className="w-6 h-6" />
          </button>

          <div
            className="exercise-media-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            {hasVideo ? (
              <video
                src={videoUrl}
                controls
                autoPlay
                loop
                playsInline
                className="w-full h-auto rounded-lg"
              >
                <source src={videoUrl} type="video/mp4" />
              </video>
            ) : (
              <img
                src={imageUrl}
                alt={exerciseName}
                className="w-full h-auto rounded-lg"
              />
            )}
          </div>
        </div>
      )}
    </>
  )
}

export default ExerciseMedia
