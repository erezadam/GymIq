/**
 * ExerciseSetImageUpload
 * Image upload component with drag & drop, preview, and validation
 */

import { useState, useRef, useCallback } from 'react'
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react'
import { uploadExerciseSetImage, validateImageFile, deleteExerciseSetImage } from '@/lib/firebase/exerciseSetStorage'

interface ExerciseSetImageUploadProps {
  value: string // current image URL
  onChange: (url: string) => void
  setId?: string // used for storage path naming
}

export default function ExerciseSetImageUpload({
  value,
  onChange,
  setId,
}: ExerciseSetImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(
    async (file: File) => {
      setError(null)

      const validation = validateImageFile(file)
      if (!validation.valid) {
        setError(validation.error || 'קובץ לא תקין')
        return
      }

      setUploading(true)
      try {
        const tempId = setId || `new_${Date.now()}`
        // Delete old image if replacing
        if (value) {
          await deleteExerciseSetImage(value)
        }
        const url = await uploadExerciseSetImage(file, tempId)
        onChange(url)
      } catch (err) {
        console.error('Upload error:', err)
        setError('שגיאה בהעלאת התמונה')
      } finally {
        setUploading(false)
      }
    },
    [value, onChange, setId]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFile(file)
      // Reset input so same file can be selected again
      if (fileInputRef.current) fileInputRef.current.value = ''
    },
    [handleFile]
  )

  const handleRemove = useCallback(async () => {
    if (value) {
      await deleteExerciseSetImage(value)
    }
    onChange('')
  }, [value, onChange])

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-text-secondary">
        תמונת סט *
      </label>

      {value ? (
        // Preview
        <div className="relative rounded-xl overflow-hidden bg-dark-elevated">
          <img
            src={value}
            alt="תמונת סט"
            className="w-full h-40 object-cover"
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-2 left-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        // Upload zone
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`
            border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
            transition-colors
            ${
              dragOver
                ? 'border-primary-500 bg-primary-500/10'
                : 'border-dark-border hover:border-text-muted'
            }
          `}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
              <p className="text-sm text-text-muted">מעלה תמונה...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              {dragOver ? (
                <Upload className="w-8 h-8 text-primary-500" />
              ) : (
                <ImageIcon className="w-8 h-8 text-text-muted" />
              )}
              <p className="text-sm text-text-muted">
                גרור תמונה לכאן או לחץ לבחירה
              </p>
              <p className="text-xs text-text-muted">
                JPG, PNG, WebP - עד 2MB
              </p>
            </div>
          )}
        </div>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileInput}
        className="hidden"
      />
    </div>
  )
}
