import { useRef, useState } from 'react'
import { Camera } from 'lucide-react'
import { useMachineLens } from './useMachineLens'
import { MachineLensSheet } from './MachineLensSheet'
import { MACHINE_LENS_STRINGS as S } from './constants'

interface MachineLensButtonProps {
  onSelectExercise: (exerciseId: string) => void
}

/**
 * Camera icon button for the ExerciseLibrary header.
 * Opens the device camera (capture="environment"), identifies the machine,
 * and shows matching exercises in a bottom sheet.
 */
export function MachineLensButton({ onSelectExercise }: MachineLensButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const { loading, error, result, identify, reset } = useMachineLens()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    // Allow re-selecting the same file next time
    e.target.value = ''
    if (!file) return
    setSheetOpen(true)
    void identify(file)
  }

  const handleClose = () => {
    setSheetOpen(false)
    reset()
  }

  const handleSelect = (exerciseId: string) => {
    onSelectExercise(exerciseId)
    handleClose()
  }

  return (
    <>
      <button
        onClick={() => inputRef.current?.click()}
        aria-label={S.buttonLabel}
        title={S.buttonLabel}
        className="w-11 h-11 flex items-center justify-center rounded-full text-on-surface-variant hover:text-white hover:bg-white/10 transition-colors"
      >
        <Camera className="w-6 h-6" />
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
        aria-hidden="true"
      />
      <MachineLensSheet
        isOpen={sheetOpen}
        loading={loading}
        error={error}
        result={result}
        onClose={handleClose}
        onSelectExercise={handleSelect}
      />
    </>
  )
}
