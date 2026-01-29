import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowRight, Save, Plus, Trash2, Image } from 'lucide-react'
import toast from 'react-hot-toast'
import { exerciseService } from '@/domains/exercises/services'
import type { ExerciseCategory, MuscleGroup, EquipmentType, AssistanceType } from '@/domains/exercises/types'
import { equipment, difficultyOptions } from '@/domains/exercises/data/mockExercises'
import { LoadingSpinner } from '@/shared/components/LoadingSpinner'
import { getMuscles } from '@/lib/firebase/muscles'
import { getActiveReportTypes } from '@/lib/firebase/reportTypes'
import { getActiveBandTypes } from '@/lib/firebase/bandTypes'
import { VALID_EXERCISE_CATEGORIES_SET, SUB_MUSCLE_TO_CATEGORY } from '@/lib/firebase/exercises'
import type { PrimaryMuscle } from '@/domains/exercises/types/muscles'
import type { ReportType } from '@/domains/exercises/types/reportTypes'
import type { BandType } from '@/domains/exercises/types/bands'

// Assistance type options (empty = regular exercise using reportType)
const assistanceTypeEnum = z.enum(['graviton', 'bands'])

// Validation schema
const exerciseSchema = z.object({
  name: z.string().min(2, 'שם התרגיל באנגלית נדרש'),
  nameHe: z.string().min(2, 'שם התרגיל בעברית נדרש'),
  category: z.string().min(1, 'קטגוריה נדרשת'),
  primaryMuscle: z.string().min(1, 'שריר ראשי נדרש'),
  secondaryMuscles: z.array(z.string()),
  equipment: z.string().min(1, 'ציוד נדרש'),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  reportType: z.string().min(1, 'סוג דיווח נדרש'), // Dynamic - loaded from Firebase
  assistanceTypes: z.array(assistanceTypeEnum), // Empty = regular exercise
  availableBands: z.array(z.string()),
  instructions: z.array(z.object({ value: z.string() })).min(1, 'נדרשת לפחות הוראה אחת'),
  instructionsHe: z.array(z.object({ value: z.string() })).min(1, 'נדרשת לפחות הוראה אחת בעברית'),
  targetMuscles: z.array(z.string()),
  imageUrl: z.string().url('כתובת תמונה לא תקינה').or(z.literal('')),
  tips: z.array(z.object({ value: z.string() })),
  tipsHe: z.array(z.object({ value: z.string() })),
}).refine((data) => {
  // If 'bands' is in assistanceTypes, at least one band must be selected
  if (data.assistanceTypes.includes('bands')) {
    return data.availableBands.length > 0
  }
  return true
}, {
  message: 'יש לבחור לפחות גומיה אחת',
  path: ['availableBands'],
})

type ExerciseFormData = z.infer<typeof exerciseSchema>

export default function ExerciseForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isEditing = Boolean(id)

  // Fetch existing exercise if editing
  const { data: existingExercise, isLoading: isLoadingExercise } = useQuery({
    queryKey: ['exercise', id],
    queryFn: () => exerciseService.getExerciseById(id!),
    enabled: isEditing,
  })

  // Fetch muscles from Firebase
  const { data: musclesData = [] } = useQuery<PrimaryMuscle[]>({
    queryKey: ['muscles'],
    queryFn: getMuscles,
  })

  // Fetch report types from Firebase
  const { data: reportTypesData = [] } = useQuery<ReportType[]>({
    queryKey: ['reportTypes'],
    queryFn: getActiveReportTypes,
  })

  // Fetch band types from Firebase
  const { data: bandTypesData = [] } = useQuery<BandType[]>({
    queryKey: ['bandTypes'],
    queryFn: getActiveBandTypes,
  })

  // Form setup
  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ExerciseFormData>({
    resolver: zodResolver(exerciseSchema),
    defaultValues: {
      name: '',
      nameHe: '',
      category: '',
      primaryMuscle: '',
      secondaryMuscles: [],
      equipment: '',
      difficulty: 'beginner',
      reportType: 'weight_reps',
      assistanceTypes: [],
      availableBands: [],
      instructions: [{ value: '' }],
      instructionsHe: [{ value: '' }],
      targetMuscles: [],
      imageUrl: '',
      tips: [{ value: '' }],
      tipsHe: [{ value: '' }],
    },
  })

  // Field arrays for dynamic lists
  const {
    fields: instructionFields,
    append: appendInstruction,
    remove: removeInstruction,
  } = useFieldArray({ control, name: 'instructions' })

  const {
    fields: instructionHeFields,
    append: appendInstructionHe,
    remove: removeInstructionHe,
  } = useFieldArray({ control, name: 'instructionsHe' })

  const {
    fields: tipFields,
    append: appendTip,
    remove: removeTip,
  } = useFieldArray({ control, name: 'tips' })

  const {
    fields: tipHeFields,
    append: appendTipHe,
    remove: removeTipHe,
  } = useFieldArray({ control, name: 'tipsHe' })

  // Populate form when editing
  // IMPORTANT: Wait for both existingExercise AND musclesData to load
  // Otherwise subMuscles dropdown will be empty and values will be lost
  useEffect(() => {
    if (existingExercise && musclesData.length > 0) {
      // Find the correct category (main muscle) and primaryMuscle (sub-muscle)
      //
      // Database values:
      // - category: exercise category (might be muscle ID like 'chest' or category like 'cardio')
      // - primaryMuscle: specific muscle (might be main muscle like 'chest' or sub-muscle like 'pectoralis_major')
      //
      // Form fields:
      // - category: main muscle selector (from musclesData)
      // - primaryMuscle: sub-muscle selector (from selectedPrimaryMuscle.subMuscles)

      let categoryToSet = ''
      let primaryMuscleToSet = existingExercise.primaryMuscle || ''
      const originalCategory = existingExercise.category || ''

      // Step 1: Determine the main muscle (category)
      // Check if originalCategory is a valid main muscle ID
      const categoryIsMainMuscle = musclesData.some(m => m.id === originalCategory)
      if (categoryIsMainMuscle) {
        categoryToSet = originalCategory
      }

      // If category is not a main muscle, check if primaryMuscle is a main muscle
      if (!categoryToSet) {
        const primaryIsMainMuscle = musclesData.some(m => m.id === primaryMuscleToSet)
        if (primaryIsMainMuscle) {
          categoryToSet = primaryMuscleToSet
        }
      }

      // If still no category, try to find the parent muscle of primaryMuscle
      if (!categoryToSet && primaryMuscleToSet) {
        for (const muscle of musclesData) {
          if (muscle.subMuscles?.some(sub => sub.id === primaryMuscleToSet)) {
            categoryToSet = muscle.id
            break
          }
        }
      }

      // Last resort: use originalCategory if it exists (even if not a muscle ID)
      if (!categoryToSet && originalCategory) {
        categoryToSet = originalCategory
      }

      // VALIDATION FIX: If the category is not valid, try to map it to a valid category
      // This handles cases where exercises were saved with sub-muscle IDs as category
      if (categoryToSet && !VALID_EXERCISE_CATEGORIES_SET.has(categoryToSet)) {
        const mappedCategory = SUB_MUSCLE_TO_CATEGORY[categoryToSet]
        if (mappedCategory && VALID_EXERCISE_CATEGORIES_SET.has(mappedCategory)) {
          console.log('🔥 ExerciseForm: Mapping invalid category to valid one:', {
            original: categoryToSet,
            mapped: mappedCategory,
          })
          categoryToSet = mappedCategory
        }
      }

      console.log('🔥 ExerciseForm: Loading existing exercise', {
        originalCategory,
        originalPrimaryMuscle: existingExercise.primaryMuscle,
        categoryToSet,
        primaryMuscleToSet,
        musclesCount: musclesData.length,
        assistanceTypes: existingExercise.assistanceTypes,
        availableBands: existingExercise.availableBands,
      })

      reset({
        name: existingExercise.name || '',
        nameHe: existingExercise.nameHe || '',
        category: categoryToSet,
        primaryMuscle: primaryMuscleToSet,
        secondaryMuscles: existingExercise.secondaryMuscles || [],
        equipment: existingExercise.equipment || '',
        difficulty: existingExercise.difficulty || 'beginner',
        reportType: existingExercise.reportType || 'weight_reps',
        assistanceTypes: existingExercise.assistanceTypes || [],
        availableBands: existingExercise.availableBands || [],
        instructions: (existingExercise.instructions || []).length > 0
          ? existingExercise.instructions.map((v) => ({ value: v }))
          : [{ value: '' }],
        instructionsHe: (existingExercise.instructionsHe || []).length > 0
          ? existingExercise.instructionsHe.map((v) => ({ value: v }))
          : [{ value: '' }],
        targetMuscles: existingExercise.targetMuscles || [],
        imageUrl: existingExercise.imageUrl || '',
        tips: (existingExercise.tips || []).length > 0
          ? existingExercise.tips.map((v) => ({ value: v }))
          : [{ value: '' }],
        tipsHe: (existingExercise.tipsHe || []).length > 0
          ? existingExercise.tipsHe.map((v) => ({ value: v }))
          : [{ value: '' }],
      })
    }
  }, [existingExercise, musclesData, reset])

  // Create/Update mutations
  const createMutation = useMutation({
    mutationFn: exerciseService.createExercise,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] })
      toast.success('התרגיל נוצר בהצלחה')
      navigate('/admin/exercises')
    },
    onError: () => {
      toast.error('שגיאה ביצירת התרגיל')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof exerciseService.updateExercise>[1] }) => {
      console.log('🔥 ExerciseForm: updateMutation calling service with:', { id, data })
      return exerciseService.updateExercise(id, data)
    },
    onSuccess: () => {
      console.log('🔥 ExerciseForm: Update SUCCESS!')
      // Invalidate both the exercises list and the specific exercise cache
      queryClient.invalidateQueries({ queryKey: ['exercises'] })
      queryClient.invalidateQueries({ queryKey: ['exercise', id] })
      toast.success('התרגיל עודכן בהצלחה')
      navigate('/admin/exercises')
    },
    onError: (error) => {
      console.error('🔥 ExerciseForm: Update FAILED!', error)
      toast.error('שגיאה בעדכון התרגיל')
    },
  })

  // Form submit
  const onSubmit = (data: ExerciseFormData) => {
    console.log('🔥 ExerciseForm: onSubmit called with data:', data)
    console.log('🔥 ExerciseForm: reportType selected:', data.reportType)

    // VALIDATION: Ensure category is a valid primary category (not a sub-muscle)
    if (!VALID_EXERCISE_CATEGORIES_SET.has(data.category)) {
      console.error('🔥 ExerciseForm: Invalid category:', data.category)
      toast.error(`קטגוריה לא תקינה: ${data.category}. יש לבחור קטגוריה ראשית (רגליים, חזה, גב וכו')`)
      return
    }

    const formattedData = {
      ...data,
      category: data.category as ExerciseCategory,
      primaryMuscle: data.primaryMuscle as MuscleGroup,
      secondaryMuscles: data.secondaryMuscles as MuscleGroup[],
      equipment: data.equipment as EquipmentType,
      reportType: data.reportType, // Dynamic - stored as string
      assistanceTypes: data.assistanceTypes as AssistanceType[],
      // Only include availableBands if 'bands' is in assistanceTypes
      availableBands: data.assistanceTypes.includes('bands') ? data.availableBands : [],
      targetMuscles: data.targetMuscles as MuscleGroup[],
      instructions: data.instructions.map((i) => i.value).filter(Boolean),
      instructionsHe: data.instructionsHe.map((i) => i.value).filter(Boolean),
      tips: data.tips.map((t) => t.value).filter(Boolean),
      tipsHe: data.tipsHe.map((t) => t.value).filter(Boolean),
    }

    console.log('🔥 ExerciseForm: Submitting formatted data:', formattedData)

    if (isEditing && id) {
      console.log('🔥 ExerciseForm: Updating exercise with id:', id)
      updateMutation.mutate({ id, data: formattedData })
    } else {
      console.log('🔥 ExerciseForm: Creating new exercise')
      createMutation.mutate(formattedData)
    }
  }

  const imageUrl = watch('imageUrl')
  const selectedCategory = watch('category')
  const selectedAssistanceTypes = watch('assistanceTypes')
  const selectedBands = watch('availableBands')

  // Handle band checkbox toggle
  const handleBandToggle = (bandId: string) => {
    const currentBands = selectedBands || []
    const newBands = currentBands.includes(bandId)
      ? currentBands.filter(id => id !== bandId)
      : [...currentBands, bandId]
    setValue('availableBands', newBands)
  }

  // Handle assistance type checkbox toggle
  const handleAssistanceTypeToggle = (type: 'graviton' | 'bands') => {
    const currentTypes = selectedAssistanceTypes || []
    const isSelected = currentTypes.includes(type)

    let newTypes: typeof currentTypes
    if (isSelected) {
      // Remove the type (empty array is allowed)
      newTypes = currentTypes.filter(t => t !== type)
    } else {
      // Add the type
      newTypes = [...currentTypes, type]
    }

    setValue('assistanceTypes', newTypes)

    // Clear bands if 'bands' is no longer selected
    if (!newTypes.includes('bands')) {
      setValue('availableBands', [])
    }
  }

  // Get selected primary muscle and its sub-muscles
  const selectedPrimaryMuscle = musclesData.find((m) => m.id === selectedCategory)
  const subMuscles = selectedPrimaryMuscle?.subMuscles || []

  // Get current primaryMuscle value from the form
  const currentPrimaryMuscle = watch('primaryMuscle')

  // Check if current primaryMuscle is in the subMuscles list or is a valid main muscle
  // If not, we need to show it as a fallback option (for exercises with invalid data)
  const isCurrentValueInSubMuscles = subMuscles.some(sub => sub.id === currentPrimaryMuscle)
  const isCurrentValueMainMuscle = musclesData.some(m => m.id === currentPrimaryMuscle)
  const showFallbackOption = currentPrimaryMuscle && !isCurrentValueInSubMuscles && !isCurrentValueMainMuscle && selectedCategory

  // Reset sub-muscle when main muscle changes (only when user manually changes)
  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCategory = e.target.value
    console.log('🔥 ExerciseForm: handleCategoryChange called:', { newCategory, wasTriggeredByUser: true })
    setValue('category', newCategory)
    setValue('primaryMuscle', '') // Reset sub-muscle selection
  }

  if (isEditing && isLoadingExercise) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate('/admin/exercises')}
          className="p-2 text-text-muted hover:text-text-primary hover:bg-dark-card rounded-lg transition-colors"
        >
          <ArrowRight className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            {isEditing ? 'עריכת תרגיל' : 'תרגיל חדש'}
          </h1>
          <p className="text-text-muted mt-1">
            {isEditing ? 'עדכן את פרטי התרגיל' : 'הוסף תרגיל חדש למערכת'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit, (errors) => {
        console.error('🔥 ExerciseForm: Validation errors:', errors)
        toast.error('יש שגיאות בטופס - בדוק את השדות')
      })} className="space-y-8">
        {/* Basic Info */}
        <section className="card-neon">
          <h2 className="text-lg font-semibold text-text-primary mb-6">מידע בסיסי</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Name English */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                שם באנגלית *
              </label>
              <input
                {...register('name')}
                dir="ltr"
                placeholder="Bench Press"
                className={`input-neon w-full ${errors.name ? 'border-red-500' : ''}`}
              />
              {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name.message}</p>}
            </div>

            {/* Name Hebrew */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                שם בעברית *
              </label>
              <input
                {...register('nameHe')}
                placeholder="לחיצת חזה"
                className={`input-neon w-full ${errors.nameHe ? 'border-red-500' : ''}`}
              />
              {errors.nameHe && <p className="text-red-400 text-sm mt-1">{errors.nameHe.message}</p>}
            </div>

            {/* Report Type - moved up to ensure dropdown has space */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">סוג דיווח *</label>
              <select
                {...register('reportType')}
                className={`input-neon w-full ${errors.reportType ? 'border-red-500' : ''}`}
              >
                <option value="">בחר סוג דיווח</option>
                {reportTypesData.map((rt) => (
                  <option key={rt.id} value={rt.id}>
                    {rt.nameHe}
                  </option>
                ))}
              </select>
              {errors.reportType && (
                <p className="text-red-400 text-sm mt-1">{errors.reportType.message}</p>
              )}
              <p className="text-text-muted text-xs mt-1">
                קובע אילו שדות יוצגו בדיווח סטים
              </p>
            </div>

            {/* Category - Main Muscle */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">שריר ראשי *</label>
              <select
                {...register('category')}
                onChange={handleCategoryChange}
                className={`input-neon w-full ${errors.category ? 'border-red-500' : ''}`}
              >
                <option value="">בחר שריר ראשי</option>
                {/* Filter to only show muscles with valid category IDs */}
                {musclesData
                  .filter(muscle => VALID_EXERCISE_CATEGORIES_SET.has(muscle.id))
                  .map((muscle) => (
                  <option key={muscle.id} value={muscle.id}>
                    {muscle.nameHe}
                  </option>
                ))}
              </select>
              {errors.category && (
                <p className="text-red-400 text-sm mt-1">{errors.category.message}</p>
              )}
            </div>

            {/* Difficulty */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">רמת קושי *</label>
              <select
                {...register('difficulty')}
                className={`input-neon w-full ${errors.difficulty ? 'border-red-500' : ''}`}
              >
                {difficultyOptions.map((diff) => (
                  <option key={diff.value} value={diff.value}>
                    {diff.labelHe}
                  </option>
                ))}
              </select>
            </div>

            {/* Equipment */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">ציוד *</label>
              <select
                {...register('equipment')}
                className={`input-neon w-full ${errors.equipment ? 'border-red-500' : ''}`}
              >
                <option value="">בחר ציוד</option>
                {equipment.map((eq) => (
                  <option key={eq.id} value={eq.id}>
                    {eq.nameHe}
                  </option>
                ))}
              </select>
              {errors.equipment && (
                <p className="text-red-400 text-sm mt-1">{errors.equipment.message}</p>
              )}
            </div>

            {/* Primary Muscle - Sub Muscle */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">תת שריר *</label>
              <select
                {...register('primaryMuscle')}
                disabled={!selectedCategory || subMuscles.length === 0}
                className={`input-neon w-full ${errors.primaryMuscle ? 'border-red-500' : ''} ${showFallbackOption ? 'border-amber-500' : ''} ${!selectedCategory ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <option value="">{selectedCategory ? 'בחר תת שריר' : 'בחר קודם שריר ראשי'}</option>
                {/* Show fallback option for exercises with invalid/old primaryMuscle values */}
                {showFallbackOption && (
                  <option value={currentPrimaryMuscle} className="text-amber-400">
                    ⚠️ {currentPrimaryMuscle} (ערך נוכחי - לא תקני)
                  </option>
                )}
                {subMuscles.map((subMuscle) => (
                  <option key={subMuscle.id} value={subMuscle.id}>
                    {subMuscle.nameHe}
                  </option>
                ))}
              </select>
              {errors.primaryMuscle && (
                <p className="text-red-400 text-sm mt-1">{errors.primaryMuscle.message}</p>
              )}
              {showFallbackOption && (
                <p className="text-amber-400 text-xs mt-1">
                  ⚠️ הערך הנוכחי לא תקני. מומלץ לבחור תת-שריר מהרשימה.
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Assistance Types */}
        <section className="card-neon">
          <h2 className="text-lg font-semibold text-text-primary mb-6">אפשרויות עזרה לתרגיל</h2>
          <div className="space-y-4">
            <p className="text-text-muted text-sm mb-4">
              שדה ריק = תרגיל רגיל לפי סוג הדיווח. אם תבחר אפשרויות כאן, המתאמן יבחר באימון.
            </p>

            {/* Checkboxes for assistance types */}
            <div className="flex flex-wrap gap-3">
              <label
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors ${
                  selectedAssistanceTypes?.includes('graviton')
                    ? 'bg-primary-500/20 border-primary-500 text-primary-400'
                    : 'bg-dark-card border-dark-border text-text-secondary hover:border-primary-500/50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedAssistanceTypes?.includes('graviton') || false}
                  onChange={() => handleAssistanceTypeToggle('graviton')}
                  className="w-4 h-4 text-primary-500 border-dark-border bg-dark-card focus:ring-primary-500 rounded"
                />
                <span>מכונת גרביטון</span>
              </label>
              <label
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors ${
                  selectedAssistanceTypes?.includes('bands')
                    ? 'bg-primary-500/20 border-primary-500 text-primary-400'
                    : 'bg-dark-card border-dark-border text-text-secondary hover:border-primary-500/50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedAssistanceTypes?.includes('bands') || false}
                  onChange={() => handleAssistanceTypeToggle('bands')}
                  className="w-4 h-4 text-primary-500 border-dark-border bg-dark-card focus:ring-primary-500 rounded"
                />
                <span>גומיות</span>
              </label>
            </div>

            {/* Conditional band selection - only shown when 'bands' is selected */}
            {selectedAssistanceTypes?.includes('bands') && (
              <div className="mt-4 p-4 bg-dark-card/50 rounded-lg border border-dark-border">
                <label className="block text-sm font-medium text-text-secondary mb-3">
                  גומיות זמינות לתרגיל זה:
                </label>
                {bandTypesData.length === 0 ? (
                  <p className="text-text-muted text-sm">
                    אין גומיות מוגדרות. <a href="/admin/band-types" className="text-primary-400 hover:underline">הוסף גומיות</a>
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    {bandTypesData.map((band) => (
                      <label
                        key={band.id}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                          selectedBands?.includes(band.id)
                            ? 'bg-primary-500/20 border-primary-500 text-primary-400'
                            : 'bg-dark-card border-dark-border text-text-secondary hover:border-primary-500/50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedBands?.includes(band.id) || false}
                          onChange={() => handleBandToggle(band.id)}
                          className="w-4 h-4 text-primary-500 border-dark-border bg-dark-card focus:ring-primary-500 rounded"
                        />
                        <span>{band.name}</span>
                      </label>
                    ))}
                  </div>
                )}
                {errors.availableBands && (
                  <p className="text-red-400 text-sm mt-2">{errors.availableBands.message}</p>
                )}
              </div>
            )}

            <p className="text-text-muted text-xs">
              הוסף אפשרויות עזרה מיוחדות לתרגיל זה
            </p>
          </div>
        </section>

        {/* Image */}
        <section className="card-neon">
          <h2 className="text-lg font-semibold text-text-primary mb-6">תמונה</h2>
          <div className="flex gap-6">
            <div className="flex-1">
              <label className="block text-sm font-medium text-text-secondary mb-2">
                כתובת תמונה (URL)
              </label>
              <input
                {...register('imageUrl')}
                dir="ltr"
                placeholder="https://example.com/image.jpg"
                className={`input-neon w-full ${errors.imageUrl ? 'border-red-500' : ''}`}
              />
              {errors.imageUrl && (
                <p className="text-red-400 text-sm mt-1">{errors.imageUrl.message}</p>
              )}
              <p className="text-text-muted text-sm mt-2">
                דוגמה: https://raw.githubusercontent.com/erezadam/exercise-images-en/main/bench_press.jpg
              </p>
            </div>
            <div className="w-32 h-32 rounded-xl bg-dark-card border-2 border-dashed border-dark-border flex items-center justify-center overflow-hidden">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt="Preview"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    ;(e.target as HTMLImageElement).style.display = 'none'
                  }}
                />
              ) : (
                <Image className="w-8 h-8 text-text-muted" />
              )}
            </div>
          </div>
        </section>

        {/* Instructions English */}
        <section className="card-neon">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-text-primary">הוראות ביצוע (אנגלית)</h2>
            <button
              type="button"
              onClick={() => appendInstruction({ value: '' })}
              className="flex items-center gap-2 text-primary-400 hover:text-primary-300 text-sm"
            >
              <Plus className="w-4 h-4" />
              הוסף הוראה
            </button>
          </div>
          <div className="space-y-3">
            {instructionFields.map((field, index) => (
              <div key={field.id} className="flex gap-3">
                <span className="w-8 h-12 flex items-center justify-center text-text-muted">
                  {index + 1}.
                </span>
                <input
                  {...register(`instructions.${index}.value`)}
                  dir="ltr"
                  placeholder="Enter instruction step..."
                  className="input-neon flex-1"
                />
                {instructionFields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeInstruction(index)}
                    className="p-3 text-text-muted hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Instructions Hebrew */}
        <section className="card-neon">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-text-primary">הוראות ביצוע (עברית)</h2>
            <button
              type="button"
              onClick={() => appendInstructionHe({ value: '' })}
              className="flex items-center gap-2 text-primary-400 hover:text-primary-300 text-sm"
            >
              <Plus className="w-4 h-4" />
              הוסף הוראה
            </button>
          </div>
          <div className="space-y-3">
            {instructionHeFields.map((field, index) => (
              <div key={field.id} className="flex gap-3">
                <span className="w-8 h-12 flex items-center justify-center text-text-muted">
                  {index + 1}.
                </span>
                <input
                  {...register(`instructionsHe.${index}.value`)}
                  placeholder="הזן שלב בהוראות..."
                  className="input-neon flex-1"
                />
                {instructionHeFields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeInstructionHe(index)}
                    className="p-3 text-text-muted hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Tips */}
        <section className="card-neon">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Tips English */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-text-primary">טיפים (אנגלית)</h3>
                <button
                  type="button"
                  onClick={() => appendTip({ value: '' })}
                  className="text-primary-400 hover:text-primary-300"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-2">
                {tipFields.map((field, index) => (
                  <div key={field.id} className="flex gap-2">
                    <input
                      {...register(`tips.${index}.value`)}
                      dir="ltr"
                      placeholder="Add a tip..."
                      className="input-neon flex-1 !py-2"
                    />
                    <button
                      type="button"
                      onClick={() => removeTip(index)}
                      className="p-2 text-text-muted hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Tips Hebrew */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-text-primary">טיפים (עברית)</h3>
                <button
                  type="button"
                  onClick={() => appendTipHe({ value: '' })}
                  className="text-primary-400 hover:text-primary-300"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-2">
                {tipHeFields.map((field, index) => (
                  <div key={field.id} className="flex gap-2">
                    <input
                      {...register(`tipsHe.${index}.value`)}
                      placeholder="הוסף טיפ..."
                      className="input-neon flex-1 !py-2"
                    />
                    <button
                      type="button"
                      onClick={() => removeTipHe(index)}
                      className="p-2 text-text-muted hover:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate('/admin/exercises')}
            className="px-6 py-3 text-text-secondary hover:text-text-primary transition-colors"
          >
            ביטול
          </button>
          <button
            type="submit"
            disabled={isSubmitting || createMutation.isPending || updateMutation.isPending}
            className="btn-neon flex items-center gap-2"
          >
            {(isSubmitting || createMutation.isPending || updateMutation.isPending) ? (
              <LoadingSpinner size="sm" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {isEditing ? 'עדכן תרגיל' : 'צור תרגיל'}
          </button>
        </div>
      </form>
    </div>
  )
}
