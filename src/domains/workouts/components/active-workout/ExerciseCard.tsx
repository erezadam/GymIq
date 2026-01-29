/**
 * ExerciseCard
 * Collapsible card showing exercise details and set reporting
 */

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, ChevronUp, Trash2, Check, Plus, MessageSquare } from 'lucide-react'
import type { ActiveWorkoutExercise, ReportedSet } from '../../types/active-workout.types'
import { SetReportRow } from './SetReportRow'
import { NotesModal } from './NotesModal'
import { getExerciseImageUrl, EXERCISE_PLACEHOLDER_IMAGE } from '@/domains/exercises/utils'
import { workoutLabels } from '@/styles/design-tokens'
import { getActiveBandTypes } from '@/lib/firebase/bandTypes'
import type { BandType } from '@/domains/exercises/types/bands'

interface ExerciseCardProps {
  exercise: ActiveWorkoutExercise
  onToggle: () => void
  onAddSet: () => void
  onUpdateSet: (setId: string, updates: Partial<ReportedSet>) => void
  onDeleteSet: (setId: string) => void
  onFinish: () => void
  onDelete: () => void
  onUpdateNotes: (notes: string) => void
  onSetAssistanceType?: (assistanceType: 'graviton' | 'bands' | undefined) => void
}

export function ExerciseCard({
  exercise,
  onToggle,
  onAddSet,
  onUpdateSet,
  onDeleteSet,
  onFinish,
  onDelete,
  onUpdateNotes,
  onSetAssistanceType,
}: ExerciseCardProps) {
  const [showNotesModal, setShowNotesModal] = useState(false)

  // Check if this is a flexible exercise (has assistance options)
  const isFlexibleExercise = exercise.assistanceTypes && exercise.assistanceTypes.length > 0

  // Fetch band types from Firebase for displaying names (only if needed)
  const { data: allBandTypes = [] } = useQuery({
    queryKey: ['bandTypes', 'active'],
    queryFn: getActiveBandTypes,
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
    enabled: exercise.assistanceType === 'bands', // Only fetch if bands are selected
  })

  // Create a map of bandId -> bandName for quick lookup
  const bandNameMap = useMemo(() => {
    const map: Record<string, string> = {}
    allBandTypes.forEach((band: BandType) => {
      map[band.id] = band.name
    })
    return map
  }, [allBandTypes])

  // Check if there are historical notes
  const hasHistoricalNotes = exercise.historicalNotes && exercise.historicalNotes.length > 0
  const hasCurrentNotes = exercise.notes && exercise.notes.trim().length > 0

  // Get notes to display in modal - prefer current, fall back to historical
  const getInitialNotes = () => {
    if (hasCurrentNotes) return exercise.notes || ''
    if (hasHistoricalNotes) {
      // Format historical notes with dates
      return exercise.historicalNotes!
        .map(n => `[${n.date?.toLocaleDateString?.('he-IL') || 'תאריך לא זמין'}] ${n.note}`)
        .join('\n\n')
    }
    return ''
  }

  const cardClassName = `exercise-card ${
    exercise.isCompleted ? 'exercise-card--completed' : ''
  } ${exercise.isExpanded ? 'exercise-card--expanded' : ''}`

  return (
    <div className={cardClassName} dir="rtl">
      {/* Card Header (always visible) */}
      <div className="exercise-card-header" onClick={onToggle}>
        {/* Expand/Collapse button */}
        <button className="expand-btn" onClick={(e) => { e.stopPropagation(); onToggle() }}>
          {exercise.isExpanded ? (
            <ChevronUp className="w-5 h-5" />
          ) : (
            <ChevronDown className="w-5 h-5" />
          )}
        </button>

        {/* Delete button */}
        <button
          className="delete-exercise-btn"
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
        >
          <Trash2 className="w-4 h-4" />
        </button>

        {/* Exercise info */}
        <div className="exercise-card-info">
          <h3 className="exercise-card-name">{exercise.exerciseNameHe}</h3>
        </div>

        {/* Exercise image */}
        <img
          src={getExerciseImageUrl({ imageUrl: exercise.imageUrl, name: exercise.exerciseName })}
          alt={exercise.exerciseNameHe}
          className="exercise-card-image"
          onError={(e) => {
            const target = e.target as HTMLImageElement
            target.onerror = null
            target.src = EXERCISE_PLACEHOLDER_IMAGE
          }}
        />
      </div>

      {/* Card Content (expanded only) */}
      {exercise.isExpanded && (
        <div className="exercise-card-content">
          {/* Large Exercise Image */}
          <div className="relative rounded-xl overflow-hidden bg-neon-gray-700 aspect-video mb-2">
            <img
              src={getExerciseImageUrl({ imageUrl: exercise.imageUrl, name: exercise.exerciseName })}
              alt={exercise.exerciseNameHe}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.onerror = null
                target.src = EXERCISE_PLACEHOLDER_IMAGE
              }}
            />
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
          </div>

          {/* Assistance Type Selector - only for flexible exercises */}
          {isFlexibleExercise && onSetAssistanceType && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                padding: '12px',
                marginBottom: '12px',
                background: 'rgba(45, 212, 191, 0.1)',
                borderRadius: '8px',
                border: '1px solid rgba(45, 212, 191, 0.3)',
              }}
            >
              <span style={{ color: '#9CA3AF', fontSize: '13px', marginBottom: '4px' }}>
                איך אתה עושה את התרגיל היום?
              </span>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {/* Default option - use reportType */}
                <button
                  onClick={() => onSetAssistanceType(undefined)}
                  style={{
                    flex: 1,
                    minWidth: '80px',
                    padding: '10px 16px',
                    background: !exercise.assistanceType
                      ? 'rgba(45, 212, 191, 0.2)'
                      : 'rgba(75, 85, 99, 0.3)',
                    border: `2px solid ${
                      !exercise.assistanceType ? '#2DD4BF' : '#4B5563'
                    }`,
                    borderRadius: '8px',
                    color: !exercise.assistanceType ? '#2DD4BF' : '#9CA3AF',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  ברירת מחדל
                </button>
                {exercise.assistanceTypes?.includes('graviton') && (
                  <button
                    onClick={() => onSetAssistanceType('graviton')}
                    style={{
                      flex: 1,
                      minWidth: '80px',
                      padding: '10px 16px',
                      background: exercise.assistanceType === 'graviton'
                        ? 'rgba(45, 212, 191, 0.2)'
                        : 'rgba(75, 85, 99, 0.3)',
                      border: `2px solid ${
                        exercise.assistanceType === 'graviton' ? '#2DD4BF' : '#4B5563'
                      }`,
                      borderRadius: '8px',
                      color: exercise.assistanceType === 'graviton' ? '#2DD4BF' : '#9CA3AF',
                      fontSize: '14px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    גרביטון
                  </button>
                )}
                {exercise.assistanceTypes?.includes('bands') && (
                  <button
                    onClick={() => onSetAssistanceType('bands')}
                    style={{
                      flex: 1,
                      minWidth: '80px',
                      padding: '10px 16px',
                      background: exercise.assistanceType === 'bands'
                        ? 'rgba(45, 212, 191, 0.2)'
                        : 'rgba(75, 85, 99, 0.3)',
                      border: `2px solid ${
                        exercise.assistanceType === 'bands' ? '#2DD4BF' : '#4B5563'
                      }`,
                      borderRadius: '8px',
                      color: exercise.assistanceType === 'bands' ? '#2DD4BF' : '#9CA3AF',
                      fontSize: '14px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    גומיות
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Last workout data - shown in red below image */}
          {exercise.lastWorkoutData && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '8px 12px',
                marginBottom: exercise.aiRecommendation ? '4px' : '12px',
                background: 'rgba(239, 68, 68, 0.1)',
                borderRadius: '8px',
                border: '1px solid rgba(239, 68, 68, 0.3)',
              }}
            >
              <span style={{ color: '#EF4444', fontSize: '14px', fontWeight: 600 }}>
                {workoutLabels.lastWorkout} {exercise.lastWorkoutData.reps} חזרות @ {exercise.lastWorkoutData.weight}kg
              </span>
            </div>
          )}

          {/* AI Recommendation - shown in purple below last workout data */}
          {exercise.aiRecommendation && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '8px 12px',
                marginBottom: '12px',
                background: 'rgba(168, 85, 247, 0.1)',
                borderRadius: '8px',
                border: '1px solid rgba(168, 85, 247, 0.3)',
              }}
            >
              <span style={{ color: '#A855F7', fontSize: '14px', fontWeight: 600 }}>
                {'\u{1F4A1}'} המלצה: {exercise.aiRecommendation.weight > 0
                  ? `${exercise.aiRecommendation.weight}kg \u00D7 `
                  : ''}{exercise.aiRecommendation.repRange} ({exercise.aiRecommendation.sets} סטים)
              </span>
            </div>
          )}

          {/* Set rows */}
          <div className="exercise-sets-list">
            {exercise.reportedSets.map((set: ReportedSet) => (
              <SetReportRow
                key={set.id}
                set={set}
                reportType={exercise.reportType}
                assistanceType={exercise.assistanceType}
                availableBands={exercise.availableBands}
                bandNameMap={bandNameMap}
                onUpdate={(updates) => onUpdateSet(set.id, updates)}
                onDelete={() => onDeleteSet(set.id)}
                canDelete={exercise.reportedSets.length > 1}
              />
            ))}
          </div>

          {/* Add set button */}
          <button className="add-set-btn" onClick={onAddSet}>
            <Plus className="w-4 h-4" />
            <span>{workoutLabels.addSet}</span>
          </button>

          {/* Bottom action buttons row */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
            {/* Notes button - red if historical notes, green if current notes */}
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowNotesModal(true)
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '10px 16px',
                minHeight: '44px',
                background: hasHistoricalNotes && !hasCurrentNotes
                  ? 'rgba(239, 68, 68, 0.15)'  // Red for historical
                  : hasCurrentNotes
                    ? 'rgba(45, 212, 191, 0.15)'  // Green for current
                    : 'transparent',
                border: `1px solid ${
                  hasHistoricalNotes && !hasCurrentNotes
                    ? '#EF4444'  // Red border for historical
                    : hasCurrentNotes
                      ? '#2DD4BF'  // Green border for current
                      : '#4B5563'
                }`,
                borderRadius: '8px',
                color: hasHistoricalNotes && !hasCurrentNotes
                  ? '#EF4444'  // Red text for historical
                  : hasCurrentNotes
                    ? '#2DD4BF'  // Green text for current
                    : '#9CA3AF',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <MessageSquare className="w-4 h-4" />
              <span>{hasHistoricalNotes && !hasCurrentNotes ? 'הערות קודמות' : 'הערות'}</span>
            </button>

            {/* Finish exercise button */}
            <button className="finish-exercise-btn" onClick={onFinish} style={{ flex: 1 }}>
              <Check className="w-4 h-4" />
              <span>{workoutLabels.finishExercise}</span>
            </button>
          </div>
        </div>
      )}

      {/* Notes Modal */}
      <NotesModal
        isOpen={showNotesModal}
        exerciseName={exercise.exerciseNameHe}
        initialNotes={getInitialNotes()}
        onClose={() => setShowNotesModal(false)}
        onSave={onUpdateNotes}
      />
    </div>
  )
}
