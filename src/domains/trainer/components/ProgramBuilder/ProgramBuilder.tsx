import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ArrowRight,
  ArrowLeft,
  Plus,
  Save,
  Loader2,
  Play,
} from 'lucide-react'
import { useAuthStore } from '@/domains/authentication/store'
import { trainerService } from '../../services/trainerService'
import { programService } from '../../services/programService'
import type { ProgramDay, TrainerRelationship } from '../../types'
import { ProgramDayCard } from './ProgramDayCard'
import { ProgramDayEditor } from './ProgramDayEditor'
import { ProgramReview } from './ProgramReview'

type Step = 1 | 2 | 3 | 4

const DAY_LABELS = ['יום A', 'יום B', 'יום C', 'יום D', 'יום E', 'יום F', 'יום G']

export default function ProgramBuilder() {
  const navigate = useNavigate()
  const { id: editId } = useParams<{ id: string }>()
  const { user } = useAuthStore()
  const isEditMode = !!editId

  // State
  const [step, setStep] = useState<Step>(1)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(isEditMode)
  const [error, setError] = useState<string | null>(null)
  const [trainees, setTrainees] = useState<TrainerRelationship[]>([])

  // Form data
  const [name, setName] = useState('')
  const [traineeId, setTraineeId] = useState('')
  const [description, setDescription] = useState('')
  const [durationWeeks, setDurationWeeks] = useState<number | null>(null)
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [days, setDays] = useState<ProgramDay[]>([])
  const [editingDayIndex, setEditingDayIndex] = useState<number | null>(null)

  // Load trainees
  useEffect(() => {
    if (!user?.uid) return
    trainerService.getTrainerTrainees(user.uid).then(setTrainees).catch(console.error)
  }, [user?.uid])

  // Load existing program for edit
  useEffect(() => {
    if (!editId) return
    setIsLoading(true)
    programService
      .getProgram(editId)
      .then((program) => {
        if (!program) {
          setError('תוכנית לא נמצאה')
          return
        }
        setName(program.name)
        setTraineeId(program.traineeId)
        setDescription(program.description || '')
        setDurationWeeks(program.durationWeeks || null)
        const date =
          program.startDate instanceof Date
            ? program.startDate
            : new Date()
        setStartDate(date.toISOString().split('T')[0])
        setDays(program.weeklyStructure || [])
      })
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false))
  }, [editId])

  const addDay = () => {
    if (days.length >= 7) return
    const label = DAY_LABELS[days.length] || `יום ${days.length + 1}`
    setDays([
      ...days,
      {
        dayLabel: label,
        name: '',
        exercises: [],
        restDay: false,
      },
    ])
  }

  const removeDay = (index: number) => {
    const updated = days.filter((_, i) => i !== index)
    // Re-label days
    updated.forEach((d, i) => {
      d.dayLabel = DAY_LABELS[i] || `יום ${i + 1}`
    })
    setDays(updated)
  }

  const updateDay = (index: number, day: ProgramDay) => {
    const updated = [...days]
    updated[index] = day
    setDays(updated)
  }

  const getTraineeName = () => {
    const rel = trainees.find((t) => t.traineeId === traineeId)
    return rel?.traineeName || ''
  }

  const canProceed = (s: Step): boolean => {
    switch (s) {
      case 1:
        return name.trim().length > 0 && traineeId.length > 0
      case 2:
        return days.length > 0
      case 3:
        return days.some((d) => !d.restDay && d.exercises.length > 0)
      case 4:
        return true
      default:
        return false
    }
  }

  const handleSave = async (activate: boolean) => {
    if (!user?.uid) return
    setIsSaving(true)
    setError(null)

    try {
      const programData = {
        trainerId: user.uid,
        originalTrainerId: user.uid,
        traineeId,
        name,
        description: description || undefined,
        status: activate ? ('active' as const) : ('draft' as const),
        isModifiedByTrainee: false,
        weeklyStructure: days,
        durationWeeks: durationWeeks || undefined,
        startDate: new Date(startDate),
        currentWeek: 1,
      }

      if (isEditMode && editId) {
        await programService.updateProgram(editId, programData)
        if (activate) {
          await programService.activateProgram(editId, traineeId)
        }
      } else {
        const newId = await programService.createProgram(programData)
        if (activate) {
          await programService.activateProgram(newId, traineeId)
        }
      }

      navigate('/trainer')
    } catch (err: any) {
      console.error('Error saving program:', err)
      setError(err.message || 'שגיאה בשמירת התוכנית')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="spinner" />
      </div>
    )
  }

  // Editing a specific day
  if (editingDayIndex !== null && step === 3) {
    return (
      <ProgramDayEditor
        day={days[editingDayIndex]}
        onUpdate={(updated) => updateDay(editingDayIndex, updated)}
        onBack={() => setEditingDayIndex(null)}
      />
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header with steps */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/trainer')} className="btn-ghost flex items-center gap-2">
          <ArrowRight className="w-4 h-4" />
          <span>חזרה</span>
        </button>
        <h1 className="text-xl font-bold text-text-primary">
          {isEditMode ? 'עריכת תוכנית' : 'תוכנית חדשה'}
        </h1>
        <div className="w-20" />
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 justify-center">
        {[1, 2, 3, 4].map((s) => (
          <div
            key={s}
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
              s === step
                ? 'bg-primary-main text-white'
                : s < step
                ? 'bg-primary-main/20 text-primary-main'
                : 'bg-dark-card text-text-muted'
            }`}
          >
            {s}
          </div>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-status-error/10 border border-status-error/30 text-status-error rounded-xl p-3 text-sm">
          {error}
        </div>
      )}

      {/* Step 1: Program Details */}
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-text-primary">פרטי תוכנית</h2>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              שם התוכנית *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-primary"
              placeholder="למשל: תוכנית חיזוק 3 ימים"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              מתאמן *
            </label>
            <select
              value={traineeId}
              onChange={(e) => setTraineeId(e.target.value)}
              className="input-primary"
            >
              <option value="">בחר מתאמן</option>
              {trainees.map((t) => (
                <option key={t.traineeId} value={t.traineeId}>
                  {t.traineeName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              תיאור
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-primary min-h-[60px] resize-none"
              placeholder="תיאור קצר של התוכנית..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                תאריך התחלה
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="input-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                משך (שבועות)
              </label>
              <input
                type="number"
                min={1}
                max={52}
                value={durationWeeks || ''}
                onChange={(e) =>
                  setDurationWeeks(e.target.value ? parseInt(e.target.value) : null)
                }
                className="input-primary"
                placeholder="ללא הגבלה"
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Week Structure */}
      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-text-primary">מבנה שבועי</h2>
          <p className="text-sm text-text-muted">
            הוסף ימי אימון ומנוחה. עד 7 ימים בשבוע.
          </p>

          <div className="space-y-3">
            {days.map((day, index) => (
              <ProgramDayCard
                key={index}
                day={day}
                index={index}
                onEdit={() => {
                  setStep(3)
                  setEditingDayIndex(index)
                }}
                onRemove={removeDay}
              />
            ))}
          </div>

          {days.length < 7 && (
            <button onClick={addDay} className="add-set-btn">
              <Plus className="w-4 h-4" />
              <span>הוסף יום</span>
            </button>
          )}
        </div>
      )}

      {/* Step 3: Exercises per day */}
      {step === 3 && editingDayIndex === null && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-text-primary">תרגילים ליום</h2>
          <p className="text-sm text-text-muted">
            לחץ על עריכה כדי להוסיף תרגילים לכל יום.
          </p>

          <div className="space-y-3">
            {days.map((day, index) => (
              <ProgramDayCard
                key={index}
                day={day}
                index={index}
                onEdit={() => setEditingDayIndex(index)}
                onRemove={removeDay}
              />
            ))}
          </div>
        </div>
      )}

      {/* Step 4: Review */}
      {step === 4 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-text-primary">סיכום ואישור</h2>
          <ProgramReview
            name={name}
            traineeName={getTraineeName()}
            description={description}
            durationWeeks={durationWeeks}
            startDate={startDate}
            days={days}
          />
        </div>
      )}

      {/* Navigation buttons */}
      <div className="flex items-center gap-3 pt-4 border-t border-dark-border">
        {step > 1 && (
          <button
            onClick={() => setStep((step - 1) as Step)}
            className="btn-secondary flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>הקודם</span>
          </button>
        )}

        <div className="flex-1" />

        {step < 4 && (
          <button
            onClick={() => setStep((step + 1) as Step)}
            disabled={!canProceed(step)}
            className="btn-primary flex items-center gap-2"
          >
            <span>הבא</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}

        {step === 4 && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => handleSave(false)}
              disabled={isSaving}
              className="btn-secondary flex items-center gap-2"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>שמור כטיוטה</span>
            </button>
            <button
              onClick={() => handleSave(true)}
              disabled={isSaving}
              className="btn-primary flex items-center gap-2"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              <span>הפעל תוכנית</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
