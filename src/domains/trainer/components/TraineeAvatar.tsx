import { useRef, useState } from 'react'
import { Camera, Loader2 } from 'lucide-react'
import { uploadTraineePhoto, deleteTraineePhoto } from '@/lib/firebase/traineePhotoStorage'
import { trainerService } from '../services/trainerService'

const AVATAR_GRADIENTS = [
  'from-primary-main to-status-info',
  'from-accent-purple to-accent-pink',
  'from-status-error to-accent-orange',
  'from-status-info to-primary-main',
  'from-accent-gold to-accent-orange',
  'from-status-success to-primary-main',
]

function getAvatarGradient(name: string): string {
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length]
}

interface TraineeAvatarProps {
  traineeId: string
  displayName: string
  photoURL?: string
  /** Tailwind size classes for the avatar container, e.g. "w-14 h-14" */
  sizeClass?: string
  /** Tailwind rounded class, e.g. "rounded-2xl" or "rounded-3xl" */
  roundedClass?: string
  /** Tailwind text size for the initial letter, e.g. "text-xl" */
  textSizeClass?: string
  /** Called after a photo is successfully uploaded with the new URL */
  onPhotoUpdated?: (newPhotoURL: string) => void
}

export function TraineeAvatar({
  traineeId,
  displayName,
  photoURL,
  sizeClass = 'w-14 h-14',
  roundedClass = 'rounded-2xl',
  textSizeClass = 'text-xl',
  onPhotoUpdated,
}: TraineeAvatarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [currentPhoto, setCurrentPhoto] = useState(photoURL)
  const [error, setError] = useState<string | null>(null)

  const initial = displayName.charAt(0)
  const avatarGradient = getAvatarGradient(displayName)

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!uploading) {
      fileInputRef.current?.click()
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Reset input so the same file can be selected again
    e.target.value = ''

    setUploading(true)
    setError(null)

    try {
      // Delete old photo if exists
      if (currentPhoto) {
        await deleteTraineePhoto(currentPhoto)
      }

      // Upload new photo
      const newURL = await uploadTraineePhoto(file, traineeId)

      // Save to Firestore
      await trainerService.updateTraineeProfile(traineeId, { photoURL: newURL })

      setCurrentPhoto(newURL)
      onPhotoUpdated?.(newURL)
    } catch (err: any) {
      console.error('Error uploading trainee photo:', err)
      setError(err.message || 'שגיאה בהעלאת תמונה')
      // Clear error after 3 seconds
      setTimeout(() => setError(null), 3000)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="relative group">
      <button
        type="button"
        onClick={handleClick}
        className={`${sizeClass} ${roundedClass} overflow-hidden relative cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-main focus:ring-offset-2 focus:ring-offset-dark-card`}
        aria-label="שנה תמונת פרופיל"
      >
        {/* Photo or Initial */}
        {currentPhoto ? (
          <img
            src={currentPhoto}
            alt={displayName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className={`w-full h-full bg-gradient-to-br ${avatarGradient} flex items-center justify-center ${textSizeClass} font-bold text-white`}
          >
            {initial}
          </div>
        )}

        {/* Camera overlay */}
        {!uploading && (
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
            <Camera className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        )}

        {/* Upload spinner */}
        {uploading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-white animate-spin" />
          </div>
        )}
      </button>

      {/* Camera badge - always visible on mobile */}
      {!uploading && (
        <div className="absolute -bottom-1 -left-1 w-6 h-6 bg-primary-main rounded-full flex items-center justify-center shadow-md pointer-events-none">
          <Camera className="w-3 h-3 text-white" />
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Error tooltip */}
      {error && (
        <div className="absolute top-full mt-1 right-0 z-50 bg-status-error text-white text-xs px-2 py-1 rounded-lg whitespace-nowrap">
          {error}
        </div>
      )}
    </div>
  )
}
