import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowRight, Save, Plus, Trash2, Image } from 'lucide-react'
import toast from 'react-hot-toast'
import { exerciseService } from '@/domains/exercises/services'
import type { ExerciseCategory, MuscleGroup, EquipmentType, ExerciseReportType } from '@/domains/exercises/types'
import { equipment, difficultyOptions } from '@/domains/exercises/data/mockExercises'
import { LoadingSpinner } from '@/shared/components/LoadingSpinner'
import { getMuscles } from '@/lib/firebase/muscles'
import type { PrimaryMuscle } from '@/domains/exercises/types/muscles'

// Report type options
const reportTypeOptions = [
  { value: 'weight_reps', labelHe: 'משקל + חזרות' },
  { value: 'reps_only', labelHe: 'חזרות בלבד' },
  { value: 'time_only', labelHe: 'זמן בלבד' },
  { value: 'reps_time', labelHe: 'חזרות + זמן' },
] as const

// Validation schema
const exerciseSchema = z.object({
  name: z.string().min(2, 'שם התרגיל באנגלית נדרש'),
  nameHe: z.string().min(2, 'שם התרגיל בעברית נדרש'),
  category: z.string().min(1, 'קטגוריה נדרשת'),
  primaryMuscle: z.string().min(1, 'שריר ראשי נדרש'),
  secondaryMuscles: z.array(z.string()),
  equipment: z.string().min(1, 'ציוד נדרש'),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  reportType: z.enum(['weight_reps', 'reps_only', 'time_only', 'reps_time']),
  instructions: z.array(z.object({ value: z.string() })).min(1, 'נדרשת לפחות הוראה אחת'),
  instructionsHe: z.array(z.object({ value: z.string() })).min(1, 'נדרשת לפחות הוראה אחת בעברית'),
  targetMuscles: z.array(z.string()),
  imageUrl: z.string().url('כתובת תמונה לא תקינה').or(z.literal('')),
  tips: z.array(z.object({ value: z.string() })),
  tipsHe: z.array(z.object({ value: z.string() })),
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
  useEffect(() => {
    if (existingExercise) {
      reset({
        name: existingExercise.name || '',
        nameHe: existingExercise.nameHe || '',
        category: existingExercise.category || '',
        primaryMuscle: existingExercise.primaryMuscle || '',
        secondaryMuscles: existingExercise.secondaryMuscles || [],
        equipment: existingExercise.equipment || '',
        difficulty: existingExercise.difficulty || 'beginner',
        reportType: existingExercise.reportType || 'weight_reps',
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
  }, [existingExercise, reset])

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
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof exerciseService.updateExercise>[1] }) =>
      exerciseService.updateExercise(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] })
      toast.success('התרגיל עודכן בהצלחה')
      navigate('/admin/exercises')
    },
    onError: () => {
      toast.error('שגיאה בעדכון התרגיל')
    },
  })

  // Form submit
  const onSubmit = (data: ExerciseFormData) => {
    const formattedData = {
      ...data,
      category: data.category as ExerciseCategory,
      primaryMuscle: data.primaryMuscle as MuscleGroup,
      secondaryMuscles: data.secondaryMuscles as MuscleGroup[],
      equipment: data.equipment as EquipmentType,
      reportType: data.reportType as ExerciseReportType,
      targetMuscles: data.targetMuscles as MuscleGroup[],
      instructions: data.instructions.map((i) => i.value).filter(Boolean),
      instructionsHe: data.instructionsHe.map((i) => i.value).filter(Boolean),
      tips: data.tips.map((t) => t.value).filter(Boolean),
      tipsHe: data.tipsHe.map((t) => t.value).filter(Boolean),
    }

    if (isEditing && id) {
      updateMutation.mutate({ id, data: formattedData })
    } else {
      createMutation.mutate(formattedData)
    }
  }

  const imageUrl = watch('imageUrl')
  const selectedCategory = watch('category')

  // Get selected primary muscle and its sub-muscles
  const selectedPrimaryMuscle = musclesData.find((m) => m.id === selectedCategory)
  const subMuscles = selectedPrimaryMuscle?.subMuscles || []

  // Reset sub-muscle when main muscle changes
  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCategory = e.target.value
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

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
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

            {/* Category - Main Muscle */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">שריר ראשי *</label>
              <select
                {...register('category')}
                onChange={handleCategoryChange}
                className={`input-neon w-full ${errors.category ? 'border-red-500' : ''}`}
              >
                <option value="">בחר שריר ראשי</option>
                {musclesData.map((muscle) => (
                  <option key={muscle.id} value={muscle.id}>
                    {muscle.icon} {muscle.nameHe}
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

            {/* Report Type */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">סוג דיווח</label>
              <select
                {...register('reportType')}
                className="input-neon w-full"
              >
                {reportTypeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.labelHe}
                  </option>
                ))}
              </select>
              <p className="text-text-muted text-xs mt-1">
                קובע אילו שדות יוצגו בדיווח סטים
              </p>
            </div>

            {/* Primary Muscle - Sub Muscle */}
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">תת שריר *</label>
              <select
                {...register('primaryMuscle')}
                disabled={!selectedCategory || subMuscles.length === 0}
                className={`input-neon w-full ${errors.primaryMuscle ? 'border-red-500' : ''} ${!selectedCategory ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <option value="">{selectedCategory ? 'בחר תת שריר' : 'בחר קודם שריר ראשי'}</option>
                {subMuscles.map((subMuscle) => (
                  <option key={subMuscle.id} value={subMuscle.id}>
                    {subMuscle.nameHe}
                  </option>
                ))}
              </select>
              {errors.primaryMuscle && (
                <p className="text-red-400 text-sm mt-1">{errors.primaryMuscle.message}</p>
              )}
            </div>
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
