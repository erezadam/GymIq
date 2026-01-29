/**
 * ReportTypeManager
 * Admin UI for managing dynamic report types
 */

import { useState, useEffect } from 'react'
import { Plus, Trash2, Edit2, Save, X, AlertCircle, RefreshCw, ToggleLeft, ToggleRight } from 'lucide-react'
import {
  getReportTypes,
  saveReportType,
  addReportType,
  deleteReportType,
  toggleReportTypeActive,
  initializeReportTypes,
  syncMissingReportTypes,
  isReportTypeInUse,
} from '@/lib/firebase/reportTypes'
import type { ReportType, ReportField, ReportFieldType } from '@/domains/exercises/types/reportTypes'
import { getDefaultFieldLabel } from '@/domains/exercises/types/reportTypes'

// Available field types for selection
const fieldTypeOptions: { value: ReportFieldType; label: string }[] = [
  { value: 'weight', label: 'משקל' },
  { value: 'reps', label: 'חזרות' },
  { value: 'time', label: 'זמן' },
  { value: 'intensity', label: 'עצימות (1-100)' },
  { value: 'speed', label: 'מהירות' },
  { value: 'distance', label: 'מרחק' },
  { value: 'incline', label: 'שיפוע (1-20)' },
]

export default function ReportTypeManager() {
  const [reportTypes, setReportTypes] = useState<ReportType[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Form states
  const [newReportType, setNewReportType] = useState({
    id: '',
    nameHe: '',
    nameEn: '',
    fields: [{ type: 'weight' as ReportFieldType, label: '', required: true }],
    sortOrder: 1,
  })
  const [editForm, setEditForm] = useState<ReportType | null>(null)

  useEffect(() => {
    loadReportTypes()
  }, [])

  const loadReportTypes = async () => {
    setLoading(true)
    try {
      const data = await getReportTypes()
      setReportTypes(data)
    } catch (error) {
      console.error('Error loading report types:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInitialize = async () => {
    if (confirm('האם לאתחל את רשימת סוגי הדיווח עם ברירות מחדל?')) {
      try {
        setLoading(true)
        await initializeReportTypes()
        await loadReportTypes()
      } catch (error) {
        console.error('Error initializing:', error)
      } finally {
        setLoading(false)
      }
    }
  }

  const handleSyncMissing = async () => {
    try {
      setLoading(true)
      const addedCount = await syncMissingReportTypes()
      if (addedCount > 0) {
        alert(`נוספו ${addedCount} סוגי דיווח חסרים`)
      } else {
        alert('כל סוגי הדיווח כבר קיימים')
      }
      await loadReportTypes()
    } catch (error) {
      console.error('Error syncing:', error)
      alert('שגיאה בסנכרון')
    } finally {
      setLoading(false)
    }
  }

  const handleAddReportType = async () => {
    if (!newReportType.id || !newReportType.nameHe) {
      alert('נא למלא מזהה ושם בעברית')
      return
    }

    if (newReportType.fields.length === 0) {
      alert('נא להוסיף לפחות שדה אחד')
      return
    }

    // Check for duplicate ID
    if (reportTypes.some(rt => rt.id === newReportType.id)) {
      alert('מזהה זה כבר קיים במערכת')
      return
    }

    try {
      await addReportType({
        id: newReportType.id,
        nameHe: newReportType.nameHe,
        nameEn: newReportType.nameEn || newReportType.id,
        fields: newReportType.fields.map(f => ({
          type: f.type,
          required: f.required,
          ...(f.label ? { label: f.label } : {}),
        })),
        isActive: true,
        sortOrder: newReportType.sortOrder || reportTypes.length + 1,
      })
      setNewReportType({
        id: '',
        nameHe: '',
        nameEn: '',
        fields: [{ type: 'weight', label: '', required: true }],
        sortOrder: reportTypes.length + 2,
      })
      setShowAddForm(false)
      await loadReportTypes()
    } catch (error) {
      console.error('Error adding report type:', error)
      alert('שגיאה בהוספת סוג דיווח')
    }
  }

  const handleDeleteReportType = async (reportTypeId: string) => {
    setDeleteError(null)

    // Check if in use
    const { inUse, count } = await isReportTypeInUse(reportTypeId)

    if (inUse) {
      setDeleteError(`לא ניתן למחוק סוג דיווח זה - הוא משמש ${count} תרגילים`)
      return
    }

    if (!confirm('האם למחוק את סוג הדיווח?')) return

    try {
      await deleteReportType(reportTypeId)
      await loadReportTypes()
    } catch (error) {
      console.error('Error deleting report type:', error)
    }
  }

  const handleToggleActive = async (reportType: ReportType) => {
    try {
      await toggleReportTypeActive(reportType.id, !reportType.isActive)
      await loadReportTypes()
    } catch (error) {
      console.error('Error toggling active:', error)
    }
  }

  const handleSaveEdit = async () => {
    if (!editForm) return

    if (!editForm.nameHe || !editForm.nameEn) {
      alert('נא למלא את כל השדות')
      return
    }

    try {
      await saveReportType(editForm)
      setEditingId(null)
      setEditForm(null)
      await loadReportTypes()
    } catch (error) {
      console.error('Error saving report type:', error)
    }
  }

  const startEditing = (reportType: ReportType) => {
    setEditingId(reportType.id)
    setEditForm({ ...reportType })
    setDeleteError(null)
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditForm(null)
  }

  // Field management for new report type
  const addFieldToNew = () => {
    setNewReportType({
      ...newReportType,
      fields: [...newReportType.fields, { type: 'reps', label: '', required: true }],
    })
  }

  const removeFieldFromNew = (index: number) => {
    if (newReportType.fields.length <= 1) return
    setNewReportType({
      ...newReportType,
      fields: newReportType.fields.filter((_, i) => i !== index),
    })
  }

  const updateFieldInNew = (index: number, updates: Partial<ReportField & { label: string }>) => {
    const updatedFields = [...newReportType.fields]
    updatedFields[index] = { ...updatedFields[index], ...updates }
    setNewReportType({ ...newReportType, fields: updatedFields })
  }

  // Field management for edit form
  const addFieldToEdit = () => {
    if (!editForm) return
    setEditForm({
      ...editForm,
      fields: [...editForm.fields, { type: 'reps', required: true }],
    })
  }

  const removeFieldFromEdit = (index: number) => {
    if (!editForm || editForm.fields.length <= 1) return
    setEditForm({
      ...editForm,
      fields: editForm.fields.filter((_, i) => i !== index),
    })
  }

  const updateFieldInEdit = (index: number, updates: Partial<ReportField>) => {
    if (!editForm) return
    const updatedFields = [...editForm.fields]
    updatedFields[index] = { ...updatedFields[index], ...updates }
    setEditForm({ ...editForm, fields: updatedFields })
  }

  // Render field editor (reused for both new and edit)
  const renderFieldEditor = (
    fields: (ReportField & { label?: string })[],
    onUpdate: (index: number, updates: Partial<ReportField & { label: string }>) => void,
    onRemove: (index: number) => void,
    onAdd: () => void
  ) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm text-neon-gray-400">שדות</label>
        <button
          type="button"
          onClick={onAdd}
          className="text-primary-400 text-sm flex items-center gap-1 hover:text-primary-300"
        >
          <Plus className="w-3 h-3" />
          הוסף שדה
        </button>
      </div>
      {fields.map((field, index) => (
        <div key={index} className="flex items-center gap-2 bg-dark-bg/50 p-2 rounded-lg">
          <select
            value={field.type}
            onChange={(e) => onUpdate(index, { type: e.target.value as ReportFieldType })}
            className="input-primary text-sm flex-1"
          >
            {fieldTypeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder={`תווית (ברירת מחדל: ${getDefaultFieldLabel(field.type)})`}
            value={field.label || ''}
            onChange={(e) => onUpdate(index, { label: e.target.value })}
            className="input-primary text-sm flex-1"
          />
          {fields.length > 1 && (
            <button
              type="button"
              onClick={() => onRemove(index)}
              className="p-1 text-red-400 hover:text-red-300"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      ))}
    </div>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="spinner"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">ניהול סוגי דיווח</h1>
          <p className="text-neon-gray-400 text-sm">הגדר סוגי דיווח לתרגילים (משקל+חזרות, זמן, וכו׳)</p>
        </div>
        <div className="flex gap-2">
          {reportTypes.length === 0 && (
            <button onClick={handleInitialize} className="btn-secondary text-sm">
              אתחל ברירות מחדל
            </button>
          )}
          <button onClick={handleSyncMissing} className="btn-secondary text-sm flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            סנכרן חסרים
          </button>
          <button onClick={() => setShowAddForm(true)} className="btn-primary text-sm flex items-center gap-2">
            <Plus className="w-4 h-4" />
            הוסף סוג דיווח
          </button>
        </div>
      </div>

      {/* Error Message */}
      {deleteError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-red-400">{deleteError}</p>
          <button onClick={() => setDeleteError(null)} className="mr-auto text-red-400 hover:text-red-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Add Form */}
      {showAddForm && (
        <div className="card p-4 space-y-4">
          <h3 className="font-semibold text-white">הוסף סוג דיווח חדש</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              placeholder="מזהה (אנגלית) *"
              value={newReportType.id}
              onChange={(e) => setNewReportType({ ...newReportType, id: e.target.value.toLowerCase().replace(/\s/g, '_') })}
              className="input-primary text-sm"
            />
            <input
              type="text"
              placeholder="שם בעברית *"
              value={newReportType.nameHe}
              onChange={(e) => setNewReportType({ ...newReportType, nameHe: e.target.value })}
              className="input-primary text-sm"
            />
            <input
              type="text"
              placeholder="שם באנגלית"
              value={newReportType.nameEn}
              onChange={(e) => setNewReportType({ ...newReportType, nameEn: e.target.value })}
              className="input-primary text-sm"
            />
          </div>

          {/* Fields editor */}
          {renderFieldEditor(
            newReportType.fields,
            updateFieldInNew,
            removeFieldFromNew,
            addFieldToNew
          )}

          <div className="flex gap-2">
            <button onClick={handleAddReportType} className="btn-primary text-sm">שמור</button>
            <button
              onClick={() => {
                setShowAddForm(false)
                setNewReportType({
                  id: '',
                  nameHe: '',
                  nameEn: '',
                  fields: [{ type: 'weight', label: '', required: true }],
                  sortOrder: reportTypes.length + 1,
                })
              }}
              className="btn-ghost text-sm"
            >
              ביטול
            </button>
          </div>
        </div>
      )}

      {/* Report Types List */}
      <div className="space-y-3">
        {reportTypes.map((reportType) => (
          <div key={reportType.id} className={`card p-4 ${!reportType.isActive ? 'opacity-60' : ''}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-neon-gray-500 text-sm w-8">#{reportType.sortOrder}</span>
                {editingId === reportType.id && editForm ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <input
                        type="text"
                        value={editForm.nameHe}
                        onChange={(e) => setEditForm({ ...editForm, nameHe: e.target.value })}
                        className="input-primary text-sm w-32"
                        placeholder="שם בעברית"
                      />
                      <input
                        type="text"
                        value={editForm.nameEn}
                        onChange={(e) => setEditForm({ ...editForm, nameEn: e.target.value })}
                        className="input-primary text-sm w-32"
                        placeholder="שם באנגלית"
                      />
                      <input
                        type="number"
                        value={editForm.sortOrder}
                        onChange={(e) => setEditForm({ ...editForm, sortOrder: parseInt(e.target.value) || 1 })}
                        className="input-primary text-sm w-20"
                        placeholder="סדר"
                        min="1"
                      />
                    </div>
                    {renderFieldEditor(
                      editForm.fields,
                      updateFieldInEdit,
                      removeFieldFromEdit,
                      addFieldToEdit
                    )}
                  </div>
                ) : (
                  <div>
                    <h3 className="font-semibold text-white">{reportType.nameHe}</h3>
                    <p className="text-neon-gray-500 text-sm">
                      {reportType.nameEn} • {reportType.id} •{' '}
                      {reportType.fields.map(f => f.label || getDefaultFieldLabel(f.type)).join(' + ')}
                    </p>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {editingId === reportType.id ? (
                  <>
                    <button
                      onClick={handleSaveEdit}
                      className="btn-icon text-green-400"
                      title="שמור"
                    >
                      <Save className="w-4 h-4" />
                    </button>
                    <button
                      onClick={cancelEditing}
                      className="btn-icon text-red-400"
                      title="ביטול"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleToggleActive(reportType)}
                      className={`btn-icon ${reportType.isActive ? 'text-green-400' : 'text-neon-gray-500'}`}
                      title={reportType.isActive ? 'פעיל - לחץ להשבתה' : 'מושבת - לחץ להפעלה'}
                    >
                      {reportType.isActive ? (
                        <ToggleRight className="w-5 h-5" />
                      ) : (
                        <ToggleLeft className="w-5 h-5" />
                      )}
                    </button>
                    <button
                      onClick={() => startEditing(reportType)}
                      className="btn-icon"
                      title="ערוך"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteReportType(reportType.id)}
                      className="btn-icon text-red-400"
                      title="מחק"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}

        {reportTypes.length === 0 && (
          <div className="empty-state">
            <span className="empty-state-icon">📋</span>
            <h3 className="empty-state-title">אין סוגי דיווח מוגדרים</h3>
            <p className="empty-state-text">לחץ על "אתחל ברירות מחדל" או הוסף סוגי דיווח באופן ידני</p>
          </div>
        )}
      </div>
    </div>
  )
}
