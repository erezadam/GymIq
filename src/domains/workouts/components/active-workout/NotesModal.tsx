/**
 * NotesModal
 * Modal for entering exercise notes with auto-save
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { X } from 'lucide-react'

interface NotesModalProps {
  isOpen: boolean
  exerciseName: string
  initialNotes: string
  onClose: () => void
  onSave: (notes: string) => void
}

export function NotesModal({
  isOpen,
  exerciseName,
  initialNotes,
  onClose,
  onSave,
}: NotesModalProps) {
  const [notes, setNotes] = useState(initialNotes)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const debounceRef = useRef<number | null>(null)

  // Reset notes when modal opens with new initial value
  useEffect(() => {
    if (isOpen) {
      setNotes(initialNotes)
      // Focus textarea after a short delay
      setTimeout(() => {
        textareaRef.current?.focus()
      }, 100)
    }
  }, [isOpen, initialNotes])

  // Auto-save with debounce
  const handleChange = useCallback((value: string) => {
    setNotes(value)

    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    // Debounce save (500ms)
    debounceRef.current = window.setTimeout(() => {
      onSave(value)
    }, 500)
  }, [onSave])

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  // Handle close - save before closing
  const handleClose = useCallback(() => {
    // Clear any pending debounce and save immediately
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    onSave(notes)
    onClose()
  }, [notes, onSave, onClose])

  // Handle backdrop click
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose()
    }
  }, [handleClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleBackdropClick}
      dir="rtl"
    >
      <div className="w-full sm:max-w-md bg-dark-surface rounded-t-2xl sm:rounded-2xl shadow-modal animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-dark-border">
          <h3 className="text-lg font-semibold text-text-primary">
            הערות - {exerciseName}
          </h3>
          <button
            onClick={handleClose}
            className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center text-text-muted hover:text-text-primary transition-colors rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <textarea
            ref={textareaRef}
            value={notes}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="הקלד הערות לתרגיל..."
            className="w-full h-40 p-4 bg-dark-card border border-dark-border rounded-xl text-text-primary placeholder:text-text-muted resize-none focus:outline-none focus:border-primary-main transition-colors"
            dir="rtl"
          />
          <p className="text-text-muted text-xs mt-2 text-center">
            ההערות נשמרות אוטומטית
          </p>
        </div>
      </div>
    </div>
  )
}
