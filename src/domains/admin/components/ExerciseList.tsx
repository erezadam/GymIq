import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Upload,
  Download,
  FileSpreadsheet,
  ChevronDown,
  X,
  Dumbbell,
  ImageOff,
  Wrench,
  AlertTriangle,
  ArrowUpDown,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { exerciseService } from '@/domains/exercises/services'
import { ExerciseMedia } from '@/shared/components/ExerciseMedia'
import { fixInvalidCategories, VALID_EXERCISE_CATEGORIES } from '@/lib/firebase/exercises'
import type { ExerciseFilters, ExerciseDifficulty } from '@/domains/exercises/types'
import { difficultyOptions } from '@/domains/exercises/data/mockExercises'
import { getMuscleIdToNameHeMap, getMuscles } from '@/lib/firebase/muscles'
import { getEquipment, type Equipment } from '@/lib/firebase/equipment'
import type { PrimaryMuscle } from '@/domains/exercises/types/muscles'
import { LoadingSpinner } from '@/shared/components/LoadingSpinner'

// Session storage key for persisting filter state
const FILTER_STORAGE_KEY = 'gymiq-exercise-list-filters'

// Interface for persisted filter state
interface PersistedFilterState {
  filters: ExerciseFilters
  showFilters: boolean
  showOnlyMissingImages: boolean
  showOnlyNoEquipment: boolean
  dataIssueFilter: string
}

// Load filters from sessionStorage
function loadPersistedFilters(): PersistedFilterState | null {
  try {
    const stored = sessionStorage.getItem(FILTER_STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (e) {
    console.error('Failed to load persisted filters:', e)
  }
  return null
}

// Save filters to sessionStorage
function savePersistedFilters(state: PersistedFilterState): void {
  try {
    sessionStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(state))
  } catch (e) {
    console.error('Failed to save persisted filters:', e)
  }
}

// Category translations for display
// IMPORTANT: All valid categories MUST have Hebrew translations!
// If a category appears in English, add it here.
// See regressions.md B12, B17 for related bugs.
const categoryTranslations: Record<string, string> = {
  // Standard categories
  chest: 'חזה',
  back: 'גב',
  legs: 'רגליים',
  shoulders: 'כתפיים',
  arms: 'זרועות',
  core: 'ליבה',
  cardio: 'אירובי',
  functional: 'פונקציונלי',
  stretching: 'מתיחות',
  warmup: 'חימום',
  // Muscle names that might be used as categories (fallback)
  gluteus_maximus: 'ישבן',
  glutes: 'ישבן',
  quadriceps: 'ארבע ראשי',
  hamstrings: 'ירך אחורי',
  biceps: 'דו ראשי',
  triceps: 'תלת ראשי',
  lats: 'גב רחב',
  calves: 'שוקיים',
  forearms: 'אמות',
  traps: 'טרפז',
  abs: 'בטן',
}

// Valid category IDs (from Firebase exercises service)
const validCategoryIds = new Set(VALID_EXERCISE_CATEGORIES)

export default function ExerciseList() {
  const queryClient = useQueryClient()

  // Load persisted state on mount
  const persistedState = useMemo(() => loadPersistedFilters(), [])

  const [filters, setFilters] = useState<ExerciseFilters>(persistedState?.filters || {})
  const [showFilters, setShowFilters] = useState(persistedState?.showFilters || false)
  const [showOnlyMissingImages, setShowOnlyMissingImages] = useState(persistedState?.showOnlyMissingImages || false)
  const [showOnlyNoEquipment, setShowOnlyNoEquipment] = useState(persistedState?.showOnlyNoEquipment || false)
  // Data issues filter: 'none' | 'no_primary' | 'invalid_primary' | 'all_valid'
  const [dataIssueFilter, setDataIssueFilter] = useState<string>(persistedState?.dataIssueFilter || 'none')
  // Secondary muscle filter
  const [secondaryMuscleFilter, setSecondaryMuscleFilter] = useState<string>('')
  // Sort mode: 'name' (default A-Z) or 'updatedAt' (newest first)
  const [sortMode, setSortMode] = useState<'name' | 'updatedAt'>('name')
  // Filter by updatedAt: 'all' | 'updated' | 'no_update'
  const [updateFilter, setUpdateFilter] = useState<'all' | 'updated' | 'no_update'>('all')

  // Persist filter state whenever it changes
  useEffect(() => {
    savePersistedFilters({
      filters,
      showFilters,
      showOnlyMissingImages,
      showOnlyNoEquipment,
      dataIssueFilter,
    })
  }, [filters, showFilters, showOnlyMissingImages, showOnlyNoEquipment, dataIssueFilter])

  // Dynamic muscle/category name mapping from Firebase
  const [dynamicCategoryNames, setDynamicCategoryNames] = useState<Record<string, string>>({})

  // Equipment from Firebase
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([])

  // Muscles list from Firebase (for filter dropdown)
  const [musclesList, setMusclesList] = useState<PrimaryMuscle[]>([])

  // Load dynamic data from Firebase on mount
  useEffect(() => {
    const loadDynamicData = async () => {
      try {
        // Load muscle mapping (for category display)
        const mapping = await getMuscleIdToNameHeMap()
        console.log('🔥 ExerciseList: Loaded muscle mapping from Firebase:', mapping)
        setDynamicCategoryNames(mapping)

        // Load equipment from Firebase
        const eqData = await getEquipment()
        console.log('🔥 ExerciseList: Loaded equipment from Firebase:', eqData)
        setEquipmentList(eqData)

        // Load muscles list from Firebase (for filter dropdown)
        const musclesData = await getMuscles()
        console.log('🔥 ExerciseList: Loaded muscles from Firebase:', musclesData)
        setMusclesList(musclesData)
      } catch (error) {
        console.error('Failed to load dynamic data from Firebase:', error)
      }
    }
    loadDynamicData()
  }, [])

  // Fetch exercises
  const { data: allExercises = [], isLoading } = useQuery({
    queryKey: ['exercises', filters],
    queryFn: () => exerciseService.getExercises(filters),
  })

  // Filter exercises without images
  const exercisesWithoutImages = useMemo(() => {
    return allExercises.filter(ex => !ex.imageUrl || ex.imageUrl.trim() === '')
  }, [allExercises])

  // Filter exercises without equipment (empty, null, undefined)
  const exercisesWithoutEquipment = useMemo(() => {
    return allExercises.filter(ex => !ex.equipment || ex.equipment.trim() === '')
  }, [allExercises])

  // Filter exercises with invalid categories
  const exercisesWithInvalidCategory = useMemo(() => {
    return allExercises.filter(ex => !ex.category || !validCategoryIds.has(ex.category))
  }, [allExercises])

  // Valid primary muscle IDs (main muscle groups from Firebase)
  const validPrimaryMuscleIds = useMemo(() => {
    return new Set(musclesList.map(m => m.id))
  }, [musclesList])

  // Unique secondary muscle values from actual exercise data
  const secondaryMuscleOptions = useMemo(() => {
    const unique = new Set<string>()
    for (const ex of allExercises) {
      if (Array.isArray(ex.secondaryMuscles)) {
        for (const m of ex.secondaryMuscles as string[]) {
          if (m) unique.add(m)
        }
      }
    }
    // Map to Hebrew names using dynamic mapping
    return Array.from(unique)
      .map(id => ({ id, nameHe: dynamicCategoryNames[id] || categoryTranslations[id] || id }))
      .sort((a, b) => a.nameHe.localeCompare(b.nameHe, 'he'))
  }, [allExercises, dynamicCategoryNames])

  // Exercises with no primaryMuscle
  const exercisesWithNoPrimaryMuscle = useMemo(() => {
    return allExercises.filter(ex => !ex.primaryMuscle || ex.primaryMuscle.trim() === '')
  }, [allExercises])

  // Exercises with invalid primaryMuscle (not in valid muscles list)
  const exercisesWithInvalidPrimaryMuscle = useMemo(() => {
    if (musclesList.length === 0) return [] // Wait for muscles to load
    return allExercises.filter(ex => {
      if (!ex.primaryMuscle || ex.primaryMuscle.trim() === '') return false // Already caught by "no primary"
      // Check if primaryMuscle is a valid main muscle
      if (validPrimaryMuscleIds.has(ex.primaryMuscle)) return false
      // Check if primaryMuscle is a valid sub-muscle
      for (const muscle of musclesList) {
        if (muscle.subMuscles?.some(sub => sub.id === ex.primaryMuscle)) {
          return false // Valid sub-muscle
        }
      }
      return true // Invalid - not found anywhere
    })
  }, [allExercises, musclesList, validPrimaryMuscleIds])

  // Check if an exercise has data issues (for warning icon)
  const getExerciseIssues = (exercise: typeof allExercises[0]) => {
    const issues: string[] = []
    if (!exercise.primaryMuscle || exercise.primaryMuscle.trim() === '') {
      issues.push('ללא שריר ראשי')
    } else if (musclesList.length > 0) {
      const isValidMain = validPrimaryMuscleIds.has(exercise.primaryMuscle)
      const isValidSub = musclesList.some(m => m.subMuscles?.some(sub => sub.id === exercise.primaryMuscle))
      if (!isValidMain && !isValidSub) {
        issues.push('שריר לא תקין')
      }
    }
    if (!exercise.category || !validCategoryIds.has(exercise.category)) {
      issues.push('קטגוריה לא תקינה')
    }
    return issues
  }

  // Count exercises without lastEditedAt (never manually edited)
  const exercisesWithoutUpdate = useMemo(() => {
    return allExercises.filter(ex => !ex.lastEditedAt)
  }, [allExercises])

  // Display exercises based on active filters
  const exercises = useMemo(() => {
    let result = allExercises
    if (showOnlyMissingImages) {
      result = result.filter(ex => !ex.imageUrl || ex.imageUrl.trim() === '')
    }
    if (showOnlyNoEquipment) {
      result = result.filter(ex => !ex.equipment || ex.equipment.trim() === '')
    }
    if (updateFilter === 'no_update') {
      result = result.filter(ex => !ex.lastEditedAt)
    } else if (updateFilter === 'updated') {
      result = result.filter(ex => !!ex.lastEditedAt)
    }
    // Data issues filter
    // Secondary muscle filter
    if (secondaryMuscleFilter) {
      result = result.filter(ex =>
        Array.isArray(ex.secondaryMuscles) && (ex.secondaryMuscles as string[]).includes(secondaryMuscleFilter)
      )
    }
    if (dataIssueFilter === 'no_primary') {
      result = result.filter(ex => !ex.primaryMuscle || ex.primaryMuscle.trim() === '')
    } else if (dataIssueFilter === 'invalid_primary') {
      result = result.filter(ex => {
        if (!ex.primaryMuscle || ex.primaryMuscle.trim() === '') return false
        if (musclesList.length === 0) return false
        const isValidMain = validPrimaryMuscleIds.has(ex.primaryMuscle)
        const isValidSub = musclesList.some(m => m.subMuscles?.some(sub => sub.id === ex.primaryMuscle))
        return !isValidMain && !isValidSub
      })
    } else if (dataIssueFilter === 'invalid_category') {
      result = result.filter(ex => !ex.category || !validCategoryIds.has(ex.category))
    } else if (dataIssueFilter === 'all_valid') {
      result = result.filter(ex => {
        const issues = getExerciseIssues(ex)
        return issues.length === 0
      })
    }
    if (sortMode === 'updatedAt') {
      result.sort((a, b) => {
        const getTime = (d: unknown): number => {
          if (!d) return 0
          const ts = d as { seconds?: number }
          if (ts?.seconds) return ts.seconds * 1000
          const date = new Date(d as string | number)
          return isNaN(date.getTime()) ? 0 : date.getTime()
        }
        return getTime(b.lastEditedAt) - getTime(a.lastEditedAt) // newest first
      })
    } else {
      result.sort((a, b) => (a.nameHe || '').trim().localeCompare((b.nameHe || '').trim(), 'he'))
    }
    return result
  }, [allExercises, showOnlyMissingImages, showOnlyNoEquipment, updateFilter, secondaryMuscleFilter, dataIssueFilter, musclesList, validPrimaryMuscleIds, sortMode])

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => exerciseService.deleteExercise(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] })
      toast.success('התרגיל נמחק בהצלחה')
    },
    onError: () => {
      toast.error('שגיאה במחיקת התרגיל')
    },
  })

  // Delete all mutation
  const deleteAllMutation = useMutation({
    mutationFn: () => exerciseService.deleteAllExercises(),
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] })
      toast.success(`${count} תרגילים נמחקו בהצלחה`)
    },
    onError: () => {
      toast.error('שגיאה במחיקת התרגילים')
    },
  })

  // Fix invalid categories mutation
  const fixCategoriesMutation = useMutation({
    mutationFn: fixInvalidCategories,
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ['exercises'] })
      toast.success(`תוקנו ${results.length} תרגילים`)
      console.log('Fixed categories:', results)
    },
    onError: (error) => {
      toast.error('שגיאה בתיקון קטגוריות')
      console.error('Fix categories error:', error)
    },
  })

  // Handle fix categories
  const handleFixCategories = () => {
    if (exercisesWithInvalidCategory.length === 0) {
      toast.success('אין תרגילים לתיקון')
      return
    }
    if (window.confirm(`האם לתקן ${exercisesWithInvalidCategory.length} תרגילים עם קטגוריה לא תקינה?`)) {
      fixCategoriesMutation.mutate()
    }
  }

  // Handle delete
  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`האם אתה בטוח שברצונך למחוק את "${name}"?`)) {
      deleteMutation.mutate(id)
    }
  }

  // Handle delete all
  const handleDeleteAll = () => {
    if (exercises.length === 0) {
      toast.error('אין תרגילים למחיקה')
      return
    }
    if (window.confirm(`האם אתה בטוח שברצונך למחוק את כל ${exercises.length} התרגילים? פעולה זו בלתי הפיכה!`)) {
      deleteAllMutation.mutate()
    }
  }

  // Format Firestore timestamp to ISO string
  const formatTimestamp = (ts: any): string => {
    if (!ts) return ''
    if (ts.toDate) return ts.toDate().toISOString()
    if (ts instanceof Date) return ts.toISOString()
    if (typeof ts === 'string') return ts
    return ''
  }

  // Handle export
  // Shared helper: build enriched export data with all fields
  const buildExportData = async () => {
    const data = await exerciseService.exportExercises()
    const joinArr = (arr: any[] | undefined) => (arr || []).join('|')
    return data.map(ex => ({
      id: ex.id,
      name: ex.name,
      nameHe: ex.nameHe,
      category: ex.category,
      categoryHe: dynamicCategoryNames[ex.category] || ex.category,
      primaryMuscle: ex.primaryMuscle,
      primaryMuscleHe: dynamicCategoryNames[ex.primaryMuscle] || ex.primaryMuscle,
      secondaryMuscles: joinArr(ex.secondaryMuscles),
      secondaryMuscleCredits: joinArr((ex as any).secondaryMuscleCredits),
      secondaryMuscleCreditsHe: ((ex as any).secondaryMuscleCredits || []).map((id: string) => dynamicCategoryNames[id] || id).join('|'),
      equipment: ex.equipment,
      difficulty: ex.difficulty,
      complexity: (ex as any).complexity || '',
      reportType: ex.reportType || 'weight_reps',
      assistanceTypes: joinArr(ex.assistanceTypes),
      availableBands: joinArr(ex.availableBands),
      instructions: joinArr(ex.instructions),
      instructionsHe: joinArr(ex.instructionsHe),
      targetMuscles: joinArr(ex.targetMuscles),
      imageUrl: ex.imageUrl || '',
      tips: joinArr(ex.tips),
      tipsHe: joinArr(ex.tipsHe),
      createdAt: formatTimestamp((ex as any).createdAt),
      updatedAt: formatTimestamp((ex as any).updatedAt),
      lastEditedAt: formatTimestamp((ex as any).lastEditedAt),
    }))
  }

  const handleExport = async () => {
    try {
      const enrichedData = await buildExportData()
      const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), totalExercises: enrichedData.length, exercises: enrichedData }, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'exercises_export.json'
      a.click()
      URL.revokeObjectURL(url)
      toast.success('הייצוא הושלם בהצלחה')
    } catch {
      toast.error('שגיאה בייצוא')
    }
  }

  // CSV/Excel shared headers
  const exportHeaders = [
    'מזהה', 'שם באנגלית', 'שם בעברית',
    'קטגוריה', 'קטגוריה בעברית',
    'תת שריר', 'תת שריר בעברית',
    'שרירים משניים', 'קרדיט 50%', 'קרדיט 50% בעברית',
    'ציוד', 'רמת קושי', 'מורכבות', 'סוג דיווח',
    'סוגי עזרה', 'גומיות זמינות',
    'הוראות אנגלית', 'הוראות עברית',
    'שרירי מטרה', 'כתובת תמונה',
    'טיפים אנגלית', 'טיפים עברית',
    'נוצר', 'עודכן', 'נערך לאחרונה',
  ]

  const exportRowValues = (ex: Awaited<ReturnType<typeof buildExportData>>[number]) => [
    ex.id, ex.name, ex.nameHe,
    ex.category, ex.categoryHe,
    ex.primaryMuscle, ex.primaryMuscleHe,
    ex.secondaryMuscles, ex.secondaryMuscleCredits, ex.secondaryMuscleCreditsHe,
    ex.equipment, ex.difficulty, ex.complexity, ex.reportType,
    ex.assistanceTypes, ex.availableBands,
    ex.instructions, ex.instructionsHe,
    ex.targetMuscles, ex.imageUrl,
    ex.tips, ex.tipsHe,
    ex.createdAt, ex.updatedAt, ex.lastEditedAt,
  ]

  // Handle CSV export
  const handleExportCSV = async () => {
    try {
      const enrichedData = await buildExportData()
      const escapeCSV = (val: string) => {
        if (val.includes(',') || val.includes('"') || val.includes('\n')) {
          return `"${val.replace(/"/g, '""')}"`
        }
        return val
      }
      const rows = enrichedData.map(ex =>
        exportRowValues(ex).map(v => escapeCSV(String(v || '')))
      )

      const dateStr = new Date().toISOString().slice(0, 10)
      const csvContent = '\uFEFF' + [exportHeaders.join(','), ...rows.map(r => r.join(','))].join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `exercises_export_${dateStr}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success('ייצוא CSV הושלם בהצלחה')
    } catch {
      toast.error('שגיאה בייצוא CSV')
    }
  }

  // Handle Excel export
  const handleExportExcel = async () => {
    try {
      const XLSX = await import('xlsx')
      const enrichedData = await buildExportData()
      const rows = enrichedData.map(ex => exportRowValues(ex).map(v => String(v || '')))
      const wsData = [exportHeaders, ...rows]
      const ws = XLSX.utils.aoa_to_sheet(wsData)

      // Set RTL and column widths
      ws['!cols'] = exportHeaders.map((h) => ({ wch: Math.max(h.length, 12) }))

      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'תרגילים')
      const dateStr = new Date().toISOString().slice(0, 10)
      XLSX.writeFile(wb, `exercises_export_${dateStr}.xlsx`)
      toast.success('ייצוא Excel הושלם בהצלחה')
    } catch {
      toast.error('שגיאה בייצוא Excel')
    }
  }

  // Handle import
  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      try {
        const text = await file.text()
        const data = JSON.parse(text)
        const exercisesToImport = data.exercises || data

        if (!Array.isArray(exercisesToImport)) {
          throw new Error('Invalid format')
        }

        const result = await exerciseService.bulkImport(exercisesToImport)
        queryClient.invalidateQueries({ queryKey: ['exercises'] })
        toast.success(`יובאו ${result.success} תרגילים בהצלחה`)

        if (result.failed > 0) {
          toast.error(`${result.failed} תרגילים נכשלו`)
        }
      } catch {
        toast.error('שגיאה בייבוא הקובץ')
      }
    }
    input.click()
  }

  // Clear filters
  const clearFilters = () => {
    setFilters({})
    setShowOnlyMissingImages(false)
    setShowOnlyNoEquipment(false)
    setSecondaryMuscleFilter('')
    setDataIssueFilter('none')
  }

  const hasActiveFilters = useMemo(() => {
    const hasBasicFilters = Object.values(filters).some((v) => v !== undefined && v !== '')
    return hasBasicFilters || showOnlyMissingImages || showOnlyNoEquipment || dataIssueFilter !== 'none' || !!secondaryMuscleFilter
  }, [filters, showOnlyMissingImages, showOnlyNoEquipment, dataIssueFilter, secondaryMuscleFilter])

  // Get category label - use categoryTranslations or muscle mapping
  const getCategoryLabel = (categoryId: string) => {
    // First try categoryTranslations
    if (categoryTranslations[categoryId]) {
      return categoryTranslations[categoryId]
    }
    // Then try dynamic muscle mapping
    if (dynamicCategoryNames[categoryId]) {
      return dynamicCategoryNames[categoryId]
    }
    // Normalize and try again
    const underscoreVersion = categoryId.replace(/-/g, '_')
    if (dynamicCategoryNames[underscoreVersion]) {
      return dynamicCategoryNames[underscoreVersion]
    }
    // Fall back to raw ID
    return categoryId
  }

  // Get equipment label - use Firebase data
  const getEquipmentLabel = (equipmentId: string) => {
    const eq = equipmentList.find((e) => e.id === equipmentId)
    return eq?.nameHe || equipmentId
  }

  // Get difficulty label
  const getDifficultyLabel = (difficulty: string) => {
    return difficultyOptions.find((d) => d.value === difficulty)?.labelHe || difficulty
  }

  // Difficulty color
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-500/20 text-green-400'
      case 'intermediate':
        return 'bg-yellow-500/20 text-yellow-400'
      case 'advanced':
        return 'bg-red-500/20 text-red-400'
      default:
        return 'bg-gray-500/20 text-gray-400'
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">ניהול תרגילים</h1>
          <p className="text-text-muted mt-1">
            {showOnlyMissingImages && showOnlyNoEquipment
              ? `${exercises.length} תרגילים ללא תמונה וללא ציוד`
              : showOnlyMissingImages
              ? `${exercisesWithoutImages.length} תרגילים ללא תמונה`
              : showOnlyNoEquipment
              ? `${exercisesWithoutEquipment.length} תרגילים ללא ציוד`
              : `${allExercises.length} תרגילים במערכת`
            }
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Missing images filter button */}
          <button
            onClick={() => setShowOnlyMissingImages(!showOnlyMissingImages)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-colors ${
              showOnlyMissingImages
                ? 'bg-orange-500/20 border-orange-500 text-orange-400'
                : 'bg-dark-card hover:bg-dark-border border-dark-border text-text-secondary hover:text-text-primary'
            }`}
          >
            <ImageOff className="w-4 h-4" />
            <span className="hidden sm:inline">ללא תמונה</span>
            {exercisesWithoutImages.length > 0 && (
              <span className={`px-2 py-0.5 text-xs rounded-full ${
                showOnlyMissingImages
                  ? 'bg-orange-500/30 text-orange-300'
                  : 'bg-dark-border text-text-muted'
              }`}>
                {exercisesWithoutImages.length}
              </span>
            )}
          </button>
          {/* No equipment filter button */}
          <button
            onClick={() => setShowOnlyNoEquipment(!showOnlyNoEquipment)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-colors ${
              showOnlyNoEquipment
                ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400'
                : 'bg-dark-card hover:bg-dark-border border-dark-border text-text-secondary hover:text-text-primary'
            }`}
          >
            <Dumbbell className="w-4 h-4" />
            <span className="hidden sm:inline">ללא ציוד</span>
            {exercisesWithoutEquipment.length > 0 && (
              <span className={`px-2 py-0.5 text-xs rounded-full ${
                showOnlyNoEquipment
                  ? 'bg-cyan-500/30 text-cyan-300'
                  : 'bg-dark-border text-text-muted'
              }`}>
                {exercisesWithoutEquipment.length}
              </span>
            )}
          </button>
          {/* Sort toggle button */}
          <button
            onClick={() => setSortMode(sortMode === 'name' ? 'updatedAt' : 'name')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-colors ${
              sortMode === 'updatedAt'
                ? 'bg-primary-400/20 border-primary-400 text-primary-400'
                : 'bg-dark-card hover:bg-dark-border border-dark-border text-text-secondary hover:text-text-primary'
            }`}
          >
            <ArrowUpDown className="w-4 h-4" />
            <span className="hidden sm:inline">{sortMode === 'name' ? 'מיון: א-ב' : 'מיון: עדכון'}</span>
          </button>
          {/* Fix invalid categories button - only show when there are issues */}
          {exercisesWithInvalidCategory.length > 0 && (
            <button
              onClick={handleFixCategories}
              disabled={fixCategoriesMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/50 rounded-xl text-purple-400 hover:text-purple-300 transition-colors disabled:opacity-50"
            >
              <Wrench className="w-4 h-4" />
              <span className="hidden sm:inline">תקן קטגוריות</span>
              <span className="px-2 py-0.5 text-xs rounded-full bg-purple-500/30 text-purple-300">
                {exercisesWithInvalidCategory.length}
              </span>
            </button>
          )}
          <button
            onClick={handleDeleteAll}
            disabled={deleteAllMutation.isPending || exercises.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-xl text-red-400 hover:text-red-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">מחק הכל</span>
          </button>
          <button
            onClick={handleImport}
            className="flex items-center gap-2 px-4 py-2 bg-dark-card hover:bg-dark-border rounded-xl text-text-secondary hover:text-text-primary transition-colors"
          >
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">ייבוא</span>
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-dark-card hover:bg-dark-border rounded-xl text-text-secondary hover:text-text-primary transition-colors"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">ייצוא</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-dark-card hover:bg-dark-border rounded-xl text-text-secondary hover:text-text-primary transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span className="hidden sm:inline">CSV</span>
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-4 py-2 bg-dark-card hover:bg-dark-border rounded-xl text-text-secondary hover:text-text-primary transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span className="hidden sm:inline">Excel</span>
          </button>
          <Link
            to="/admin/exercises/new"
            className="btn-neon flex items-center gap-2 !px-4 !py-2"
          >
            <Plus className="w-4 h-4" />
            <span>תרגיל חדש</span>
          </Link>
        </div>
      </div>

      {/* Search and filters */}
      <div className="space-y-4">
        <div className="flex gap-3">
          {/* Search input */}
          <div className="flex-1 relative">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
            <input
              type="text"
              placeholder="חיפוש תרגיל..."
              value={filters.search || ''}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="input-neon w-full pr-12"
            />
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all ${
              showFilters || hasActiveFilters
                ? 'bg-primary-400/20 border-primary-400 text-primary-400'
                : 'bg-dark-surface border-dark-border text-text-secondary hover:border-dark-card'
            }`}
          >
            <Filter className="w-5 h-5" />
            <span className="hidden sm:inline">סינון</span>
            <ChevronDown
              className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`}
            />
          </button>
        </div>

        {/* Filter dropdowns */}
        {showFilters && (
          <div className="flex flex-wrap gap-3 p-4 bg-dark-surface rounded-xl border border-dark-border animate-slide-up">
            {/* Category/Muscle - dynamic from Firebase */}
            <select
              value={filters.category || ''}
              onChange={(e) =>
                setFilters({ ...filters, category: e.target.value || undefined })
              }
              className="input-neon min-w-[150px]"
            >
              <option value="">כל הקטגוריות</option>
              {musclesList.map((muscle) => (
                <option key={muscle.id} value={muscle.id}>
                  {muscle.nameHe}
                </option>
              ))}
            </select>

            {/* Difficulty */}
            <select
              value={filters.difficulty || ''}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  difficulty: (e.target.value as ExerciseDifficulty) || undefined,
                })
              }
              className="input-neon min-w-[150px]"
            >
              <option value="">כל הרמות</option>
              {difficultyOptions.map((diff) => (
                <option key={diff.value} value={diff.value}>
                  {diff.labelHe}
                </option>
              ))}
            </select>

            {/* Equipment - from Firebase */}
            <select
              value={filters.equipment || ''}
              onChange={(e) =>
                setFilters({ ...filters, equipment: e.target.value || undefined })
              }
              className="input-neon min-w-[150px]"
            >
              <option value="">כל הציוד</option>
              {equipmentList.map((eq) => (
                <option key={eq.id} value={eq.id}>
                  {eq.nameHe}
                </option>
              ))}
            </select>

            {/* Secondary Muscle Filter */}
            <select
              value={secondaryMuscleFilter}
              onChange={(e) => setSecondaryMuscleFilter(e.target.value)}
              className={`input-neon min-w-[160px] ${secondaryMuscleFilter ? 'border-accent-purple bg-accent-purple/10' : ''}`}
            >
              <option value="">שרירים משניים</option>
              {secondaryMuscleOptions.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nameHe}
                </option>
              ))}
            </select>

            {/* Update Filter */}
            <select
              value={updateFilter}
              onChange={(e) => setUpdateFilter(e.target.value as 'all' | 'updated' | 'no_update')}
              className={`input-neon min-w-[150px] ${updateFilter !== 'all' ? 'border-yellow-500 bg-yellow-500/10' : ''}`}
            >
              <option value="all">עדכון אחרון: הכל</option>
              <option value="updated">עם עדכון ({allExercises.filter(ex => !!ex.lastEditedAt).length})</option>
              <option value="no_update">ללא עדכון ({exercisesWithoutUpdate.length})</option>
            </select>

            {/* Data Issues Filter */}
            <select
              value={dataIssueFilter}
              onChange={(e) => setDataIssueFilter(e.target.value)}
              className={`input-neon min-w-[180px] ${dataIssueFilter !== 'none' ? 'border-amber-500 bg-amber-500/10' : ''}`}
            >
              <option value="none">🔍 בעיות נתונים</option>
              <option value="no_primary">⚠️ ללא שריר ראשי ({exercisesWithNoPrimaryMuscle.length})</option>
              <option value="invalid_primary">⚠️ שריר לא תקין ({exercisesWithInvalidPrimaryMuscle.length})</option>
              <option value="invalid_category">⚠️ קטגוריה לא תקינה ({exercisesWithInvalidCategory.length})</option>
              <option value="all_valid">✅ הכל תקין</option>
            </select>

            {/* Clear filters */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-2 px-4 py-3 text-red-400 hover:bg-red-400/10 rounded-xl transition-colors"
              >
                <X className="w-4 h-4" />
                נקה סינון
              </button>
            )}
          </div>
        )}
      </div>

      {/* Exercise table */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : exercises.length === 0 ? (
        <div className="text-center py-12 bg-dark-surface rounded-xl border border-dark-border">
          <Dumbbell className="w-12 h-12 text-text-muted mx-auto mb-4" />
          <h3 className="text-lg font-medium text-text-primary mb-2">לא נמצאו תרגילים</h3>
          <p className="text-text-muted mb-6">
            {hasActiveFilters ? 'נסה לשנות את הסינון' : 'התחל להוסיף תרגילים למערכת'}
          </p>
          {!hasActiveFilters && (
            <Link to="/admin/exercises/new" className="btn-neon inline-flex items-center gap-2">
              <Plus className="w-4 h-4" />
              הוסף תרגיל ראשון
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-dark-surface rounded-xl border border-dark-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table-admin">
              <thead>
                <tr>
                  <th className="w-16"></th>
                  <th>שם התרגיל</th>
                  <th>עדכון אחרון</th>
                  <th>קטגוריה</th>
                  <th>רמת קושי</th>
                  <th>ציוד</th>
                  <th className="w-24">פעולות</th>
                </tr>
              </thead>
              <tbody>
                {exercises.map((exercise) => (
                  <tr key={exercise.id} className="group">
                    <td>
                      <div className="w-12 h-12 rounded-lg bg-dark-card overflow-hidden">
                        {/* #21 — side fix: removes external via.placeholder.com dependency */}
                        <ExerciseMedia
                          imageUrl={exercise.imageUrl}
                          videoWebpUrl={exercise.videoWebpUrl}
                          alt={exercise.nameHe}
                          className="w-full h-full object-cover"
                          variant="thumbnail"
                        />
                      </div>
                    </td>
                    <td>
                      <div className="flex items-start gap-2">
                        {/* Warning icon for exercises with issues */}
                        {(() => {
                          const issues = getExerciseIssues(exercise)
                          if (issues.length > 0) {
                            return (
                              <div className="relative group/warning">
                                <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-1" />
                                <div className="absolute right-0 top-6 z-10 hidden group-hover/warning:block bg-dark-card border border-amber-500/50 rounded-lg p-2 text-xs text-amber-300 whitespace-nowrap shadow-lg">
                                  {issues.map((issue, i) => (
                                    <div key={i}>⚠️ {issue}</div>
                                  ))}
                                </div>
                              </div>
                            )
                          }
                          return null
                        })()}
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-text-primary">{exercise.nameHe}</p>
                            {exercise.assistanceTypes && exercise.assistanceTypes.length > 0 && (
                              <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                                גמיש
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-text-muted">{exercise.name}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      {exercise.lastEditedAt ? (
                        <span className="text-xs text-text-muted">
                          {(() => {
                            const ts = exercise.lastEditedAt as unknown as { seconds?: number }
                            const date = ts?.seconds ? new Date(ts.seconds * 1000) : new Date(exercise.lastEditedAt)
                            return isNaN(date.getTime()) ? '—' : date.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: '2-digit' })
                          })()}
                        </span>
                      ) : (
                        <span className="text-xs text-yellow-500/70">—</span>
                      )}
                    </td>
                    <td>
                      <span className="px-3 py-1 bg-primary-400/20 text-primary-400 rounded-lg text-sm">
                        {getCategoryLabel(exercise.category)}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`px-3 py-1 rounded-lg text-sm ${getDifficultyColor(
                          exercise.difficulty
                        )}`}
                      >
                        {getDifficultyLabel(exercise.difficulty)}
                      </span>
                    </td>
                    <td className="text-text-secondary">{getEquipmentLabel(exercise.equipment)}</td>
                    <td>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link
                          to={`/admin/exercises/${exercise.id}/edit`}
                          className="p-2 text-text-muted hover:text-primary-400 hover:bg-primary-400/10 rounded-lg transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(exercise.id, exercise.nameHe)}
                          disabled={deleteMutation.isPending}
                          className="p-2 text-text-muted hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
