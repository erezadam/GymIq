/**
 * ExerciseMedia (workout-session)
 * Thin wrapper around the shared ExerciseMedia component that adds
 * a click-to-play mp4 modal for legacy videoUrl support. The inline
 * display delegates to the shared component, so animated WebP appears
 * automatically when videoWebpUrl is set on the exercise.
 */

import { useState } from 'react'
import { Play, X } from 'lucide-react'
import { ExerciseMedia as SharedExerciseMedia } from '@/shared/components/ExerciseMedia'

interface ExerciseMediaProps {
  imageUrl?: string
  videoWebpUrl?: string
  videoUrl?: string
  exerciseName: string
}

export function ExerciseMedia({ imageUrl, videoWebpUrl, videoUrl, exerciseName }: ExerciseMediaProps) {
  const [showModal, setShowModal] = useState(false)

  const hasVideo = !!videoUrl
  const hasMedia = !!imageUrl || !!videoWebpUrl

  if (!hasMedia) {
    // Placeholder via shared component (uses smart fallback / placeholder.svg)
    return (
      <div className="exercise-media-placeholder">
        <SharedExerciseMedia
          alt={exerciseName}
          exerciseName={exerciseName}
          className="w-full h-full object-cover"
          variant="thumbnail"
        />
      </div>
    )
  }

  return (
    <>
      {/* Thumbnail / hero — animates WebP if videoWebpUrl is set */}
      <div
        className="exercise-media-thumbnail"
        onClick={() => hasVideo && setShowModal(true)}
      >
        <SharedExerciseMedia
          imageUrl={imageUrl}
          videoWebpUrl={videoWebpUrl}
          exerciseName={exerciseName}
          alt={exerciseName}
          className="w-full h-full object-cover"
          variant="hero"
          loading="eager"
        />

        {/* Play button overlay (only when mp4 video is available) */}
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

      {/* Fullscreen mp4 modal — preserved legacy behavior */}
      {showModal && hasVideo && (
        <div className="exercise-media-modal" onClick={() => setShowModal(false)}>
          <button
            className="exercise-media-modal-close"
            onClick={() => setShowModal(false)}
            aria-label="סגור"
          >
            <X className="w-6 h-6" />
          </button>

          <div
            className="exercise-media-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
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
          </div>
        </div>
      )}
    </>
  )
}

export default ExerciseMedia
