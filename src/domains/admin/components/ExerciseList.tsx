import { useState, useMemo } from 'react'
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
  ChevronDown,
  X,
  Dumbbell,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { exerciseService } from '@/domains/exercises/services'
import type { ExerciseFilters, ExerciseCategory, ExerciseDifficulty, EquipmentType } from '@/domains/exercises/types'
import { categories, equipment, difficultyOptions } from '@/domains/exercises/data/mockExercises'
import { LoadingSpinner } from '@/shared/components/LoadingSpinner'

export default function ExerciseList() {
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState<ExerciseFilters>({})
  const [showFilters, setShowFilters] = useState(false)

  // Fetch exercises
  const { data: exercises = [], isLoading } = useQuery({
    queryKey: ['exercises', filters],
    queryFn: () => exerciseService.getExercises(filters),
  })

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

  // Handle export
  const handleExport = async () => {
    try {
      const data = await exerciseService.exportExercises()
      const blob = new Blob([JSON.stringify({ exercises: data }, null, 2)], {
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
  }

  const hasActiveFilters = useMemo(() => {
    return Object.values(filters).some((v) => v !== undefined && v !== '')
  }, [filters])

  // Get category label
  const getCategoryLabel = (categoryId: string) => {
    return categories.find((c) => c.id === categoryId)?.nameHe || categoryId
  }

  // Get equipment label
  const getEquipmentLabel = (equipmentId: string) => {
    return equipment.find((e) => e.id === equipmentId)?.nameHe || equipmentId
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
          <p className="text-text-muted mt-1">{exercises.length} תרגילים במערכת</p>
        </div>
        <div className="flex items-center gap-3">
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
            {/* Category */}
            <select
              value={filters.category || ''}
              onChange={(e) =>
                setFilters({ ...filters, category: (e.target.value as ExerciseCategory) || undefined })
              }
              className="input-neon min-w-[150px]"
            >
              <option value="">כל הקטגוריות</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.nameHe}
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

            {/* Equipment */}
            <select
              value={filters.equipment || ''}
              onChange={(e) =>
                setFilters({ ...filters, equipment: (e.target.value as EquipmentType) || undefined })
              }
              className="input-neon min-w-[150px]"
            >
              <option value="">כל הציוד</option>
              {equipment.map((eq) => (
                <option key={eq.id} value={eq.id}>
                  {eq.nameHe}
                </option>
              ))}
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
                        <img
                          src={exercise.imageUrl}
                          alt={exercise.nameHe}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            ;(e.target as HTMLImageElement).src =
                              'https://via.placeholder.com/48?text=🏋️'
                          }}
                        />
                      </div>
                    </td>
                    <td>
                      <div>
                        <p className="font-medium text-text-primary">{exercise.nameHe}</p>
                        <p className="text-sm text-text-muted">{exercise.name}</p>
                      </div>
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
