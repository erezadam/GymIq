import { useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, Edit2, Save, X, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react'
import type { PrimaryMuscle, BodyRegion } from '@/domains/exercises/types/muscles'
import { getMuscles, saveMuscle, addPrimaryMuscle, deletePrimaryMuscle, initializeMuscles, syncMissingMuscles, forceUpdateAllMuscles } from '@/lib/firebase/muscles'
import { MuscleIcon } from '@/shared/components/MuscleIcon'

export default function MuscleManager() {
  const queryClient = useQueryClient()
  const [muscles, setMuscles] = useState<PrimaryMuscle[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedMuscle, setExpandedMuscle] = useState<string | null>(null)
  const [editingMuscle, setEditingMuscle] = useState<string | null>(null)
  const [showAddMuscle, setShowAddMuscle] = useState(false)
  const [showAddSubMuscle, setShowAddSubMuscle] = useState<string | null>(null)
  const [editingSubMuscle, setEditingSubMuscle] = useState<{ primaryId: string; subId: string } | null>(null)

  // Form states
  const [newMuscle, setNewMuscle] = useState({ id: '', nameHe: '', nameEn: '', icon: '', bodyRegion: '' as BodyRegion | '' })
  const [newSubMuscle, setNewSubMuscle] = useState({ id: '', nameHe: '', nameEn: '' })
  const [editSubMuscleForm, setEditSubMuscleForm] = useState({ nameHe: '', nameEn: '' })
  const [editForm, setEditForm] = useState<PrimaryMuscle | null>(null)

  useEffect(() => {
    loadMuscles()
  }, [])

  const loadMuscles = async () => {
    setLoading(true)
    try {
      const data = await getMuscles()
      setMuscles(data)
      queryClient.invalidateQueries({ queryKey: ['muscles'] })
    } catch (error) {
      console.error('Error loading muscles:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInitialize = async () => {
    if (confirm('האם לאתחל את רשימת השרירים עם ברירות מחדל?')) {
      try {
        await initializeMuscles()
        await loadMuscles()
      } catch (error) {
        console.error('Error initializing:', error)
      }
    }
  }

  const handleSyncMissing = async () => {
    try {
      setLoading(true)
      const addedCount = await syncMissingMuscles()
      if (addedCount > 0) {
        alert(`נוספו ${addedCount} שרירים חסרים`)
      } else {
        alert('כל השרירים כבר קיימים')
      }
      await loadMuscles()
    } catch (error) {
      console.error('Error syncing:', error)
      alert('שגיאה בסנכרון שרירים')
    } finally {
      setLoading(false)
    }
  }

  const handleForceUpdate = async () => {
    if (confirm('האם לעדכן את כל השרירים ותתי השרירים מברירת המחדל? זה ידרוס שינויים קיימים!')) {
      try {
        setLoading(true)
        const updatedCount = await forceUpdateAllMuscles()
        alert(`עודכנו ${updatedCount} שרירים כולל תתי שרירים`)
        await loadMuscles()
      } catch (error) {
        console.error('Error force updating:', error)
        alert('שגיאה בעדכון שרירים')
      } finally {
        setLoading(false)
      }
    }
  }

  const handleAddMuscle = async () => {
    if (!newMuscle.id || !newMuscle.nameHe) return

    try {
      await addPrimaryMuscle({
        id: newMuscle.id,
        nameHe: newMuscle.nameHe,
        nameEn: newMuscle.nameEn || newMuscle.id,
        icon: newMuscle.icon,
        ...(newMuscle.bodyRegion && { bodyRegion: newMuscle.bodyRegion }),
        subMuscles: [],
      })
      setNewMuscle({ id: '', nameHe: '', nameEn: '', icon: '', bodyRegion: '' })
      setShowAddMuscle(false)
      await loadMuscles()
    } catch (error) {
      console.error('Error adding muscle:', error)
    }
  }

  const handleDeleteMuscle = async (muscleId: string) => {
    if (!confirm('האם למחוק את השריר?')) return

    try {
      await deletePrimaryMuscle(muscleId)
      await loadMuscles()
    } catch (error) {
      console.error('Error deleting muscle:', error)
    }
  }

  const handleAddSubMuscle = async (primaryMuscleId: string) => {
    if (!newSubMuscle.id || !newSubMuscle.nameHe) return

    const muscle = muscles.find(m => m.id === primaryMuscleId)
    if (!muscle) return

    try {
      const updatedMuscle: PrimaryMuscle = {
        ...muscle,
        subMuscles: [
          ...muscle.subMuscles,
          { id: newSubMuscle.id, nameHe: newSubMuscle.nameHe, nameEn: newSubMuscle.nameEn || newSubMuscle.id },
        ],
      }
      await saveMuscle(updatedMuscle)
      setNewSubMuscle({ id: '', nameHe: '', nameEn: '' })
      setShowAddSubMuscle(null)
      await loadMuscles()
    } catch (error) {
      console.error('Error adding sub-muscle:', error)
    }
  }

  const startEditingSubMuscle = (primaryId: string, sub: { id: string; nameHe: string; nameEn: string }) => {
    setEditingSubMuscle({ primaryId, subId: sub.id })
    setEditSubMuscleForm({ nameHe: sub.nameHe, nameEn: sub.nameEn })
  }

  const handleSaveSubMuscleEdit = async () => {
    if (!editingSubMuscle || !editSubMuscleForm.nameHe) return

    const muscle = muscles.find(m => m.id === editingSubMuscle.primaryId)
    if (!muscle) return

    try {
      const updatedMuscle: PrimaryMuscle = {
        ...muscle,
        subMuscles: muscle.subMuscles.map(sm =>
          sm.id === editingSubMuscle.subId
            ? { ...sm, nameHe: editSubMuscleForm.nameHe, nameEn: editSubMuscleForm.nameEn || sm.nameEn }
            : sm
        ),
      }
      await saveMuscle(updatedMuscle)
      setEditingSubMuscle(null)
      setEditSubMuscleForm({ nameHe: '', nameEn: '' })
      await loadMuscles()
    } catch (error) {
      console.error('Error editing sub-muscle:', error)
    }
  }

  const handleDeleteSubMuscle = async (primaryMuscleId: string, subMuscleId: string) => {
    const muscle = muscles.find(m => m.id === primaryMuscleId)
    if (!muscle) return

    try {
      const updatedMuscle: PrimaryMuscle = {
        ...muscle,
        subMuscles: muscle.subMuscles.filter(sm => sm.id !== subMuscleId),
      }
      await saveMuscle(updatedMuscle)
      await loadMuscles()
    } catch (error) {
      console.error('Error deleting sub-muscle:', error)
    }
  }

  const handleSaveEdit = async () => {
    if (!editForm) return

    try {
      await saveMuscle(editForm)
      setEditingMuscle(null)
      setEditForm(null)
      await loadMuscles()
    } catch (error) {
      console.error('Error saving muscle:', error)
    }
  }

  const startEditing = (muscle: PrimaryMuscle) => {
    setEditingMuscle(muscle.id)
    setEditForm({ ...muscle })
  }

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
          <h1 className="text-2xl font-bold text-white">ניהול שרירים</h1>
          <p className="text-neon-gray-400 text-sm">הגדר שרירים ראשיים ותתי שרירים</p>
        </div>
        <div className="flex gap-2">
          {muscles.length === 0 && (
            <button onClick={handleInitialize} className="btn-secondary text-sm">
              אתחל ברירות מחדל
            </button>
          )}
          <button onClick={handleSyncMissing} className="btn-secondary text-sm flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            סנכרן חסרים
          </button>
          <button onClick={handleForceUpdate} className="btn-secondary text-sm flex items-center gap-2 text-orange-400 border-orange-400/30">
            <RefreshCw className="w-4 h-4" />
            עדכן הכל
          </button>
          <button onClick={() => setShowAddMuscle(true)} className="btn-primary text-sm flex items-center gap-2">
            <Plus className="w-4 h-4" />
            הוסף שריר
          </button>
        </div>
      </div>

      {/* Add Muscle Form */}
      {showAddMuscle && (
        <div className="card p-4 space-y-4">
          <h3 className="font-semibold text-white">הוסף שריר מרכזי חדש</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="מזהה (אנגלית)"
              value={newMuscle.id}
              onChange={(e) => setNewMuscle({ ...newMuscle, id: e.target.value.toLowerCase().replace(/\s/g, '_') })}
              className="input-primary text-sm"
            />
            <input
              type="text"
              placeholder="שם בעברית"
              value={newMuscle.nameHe}
              onChange={(e) => setNewMuscle({ ...newMuscle, nameHe: e.target.value })}
              className="input-primary text-sm"
            />
            <input
              type="text"
              placeholder="שם באנגלית"
              value={newMuscle.nameEn}
              onChange={(e) => setNewMuscle({ ...newMuscle, nameEn: e.target.value })}
              className="input-primary text-sm"
            />
            {/* Icon URL with Preview */}
            <div className="flex items-center gap-3">
              <MuscleIcon icon={newMuscle.icon} size={48} />
              <input
                type="text"
                placeholder="קישור לתמונה (URL)"
                value={newMuscle.icon}
                onChange={(e) => setNewMuscle({ ...newMuscle, icon: e.target.value })}
                className="input-primary text-sm flex-1"
              />
            </div>
            <select
              value={newMuscle.bodyRegion}
              onChange={(e) => setNewMuscle({ ...newMuscle, bodyRegion: e.target.value as BodyRegion | '' })}
              className="input-primary text-sm"
            >
              <option value="">אזור גוף (לא נבחר)</option>
              <option value="upper">גוף עליון</option>
              <option value="lower">גוף תחתון</option>
              <option value="neutral">ניטרלי</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={handleAddMuscle} className="btn-primary text-sm">שמור</button>
            <button onClick={() => setShowAddMuscle(false)} className="btn-ghost text-sm">ביטול</button>
          </div>
        </div>
      )}

      {/* Muscles List */}
      <div className="space-y-3">
        {muscles.map((muscle) => (
          <div key={muscle.id} className="card overflow-hidden">
            {/* Muscle Header */}
            <div
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-dark-card/50"
              onClick={() => setExpandedMuscle(expandedMuscle === muscle.id ? null : muscle.id)}
            >
              <div className="flex items-center gap-3">
                <MuscleIcon icon={editingMuscle === muscle.id && editForm ? editForm.icon : muscle.icon} size={48} />
                {editingMuscle === muscle.id && editForm ? (
                  <div className="flex items-center gap-2 flex-1 flex-wrap">
                    <input
                      type="text"
                      value={editForm.nameHe}
                      onChange={(e) => setEditForm({ ...editForm, nameHe: e.target.value })}
                      className="input-primary text-sm w-24"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <input
                      type="text"
                      placeholder="קישור לתמונה"
                      value={editForm.icon}
                      onChange={(e) => setEditForm({ ...editForm, icon: e.target.value })}
                      className="input-primary text-sm flex-1"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <select
                      value={editForm.bodyRegion || ''}
                      onChange={(e) => setEditForm({ ...editForm, bodyRegion: (e.target.value || undefined) as BodyRegion | undefined })}
                      className="input-primary text-sm w-28"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <option value="">אזור גוף</option>
                      <option value="upper">גוף עליון</option>
                      <option value="lower">גוף תחתון</option>
                      <option value="neutral">ניטרלי</option>
                    </select>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-white">{muscle.nameHe}</h3>
                      {muscle.bodyRegion && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                          muscle.bodyRegion === 'upper' ? 'bg-blue-500/20 text-blue-400' :
                          muscle.bodyRegion === 'lower' ? 'bg-green-500/20 text-green-400' :
                          'bg-gray-500/20 text-gray-400'
                        }`}>
                          {muscle.bodyRegion === 'upper' ? 'עליון' : muscle.bodyRegion === 'lower' ? 'תחתון' : 'ניטרלי'}
                        </span>
                      )}
                    </div>
                    <p className="text-neon-gray-500 text-sm">{muscle.nameEn} • {muscle.subMuscles.length} תתי שרירים</p>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {editingMuscle === muscle.id ? (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleSaveEdit() }}
                      className="btn-icon text-green-400"
                    >
                      <Save className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingMuscle(null); setEditForm(null) }}
                      className="btn-icon text-red-400"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={(e) => { e.stopPropagation(); startEditing(muscle) }}
                      className="btn-icon"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteMuscle(muscle.id) }}
                      className="btn-icon text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
                {expandedMuscle === muscle.id ? (
                  <ChevronUp className="w-5 h-5 text-neon-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-neon-gray-400" />
                )}
              </div>
            </div>

            {/* Sub-muscles */}
            {expandedMuscle === muscle.id && (
              <div className="border-t border-dark-border p-4 bg-dark-bg/50">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-neon-gray-400">תתי שרירים</h4>
                  <button
                    onClick={() => setShowAddSubMuscle(muscle.id)}
                    className="text-primary-400 text-sm flex items-center gap-1 hover:text-primary-300"
                  >
                    <Plus className="w-4 h-4" />
                    הוסף
                  </button>
                </div>

                {/* Add Sub-muscle Form */}
                {showAddSubMuscle === muscle.id && (
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      placeholder="מזהה"
                      value={newSubMuscle.id}
                      onChange={(e) => setNewSubMuscle({ ...newSubMuscle, id: e.target.value.toLowerCase().replace(/\s/g, '_') })}
                      className="input-primary text-sm flex-1"
                    />
                    <input
                      type="text"
                      placeholder="שם בעברית"
                      value={newSubMuscle.nameHe}
                      onChange={(e) => setNewSubMuscle({ ...newSubMuscle, nameHe: e.target.value })}
                      className="input-primary text-sm flex-1"
                    />
                    <button onClick={() => handleAddSubMuscle(muscle.id)} className="btn-primary text-sm px-3">
                      <Plus className="w-4 h-4" />
                    </button>
                    <button onClick={() => { setShowAddSubMuscle(null); setNewSubMuscle({ id: '', nameHe: '', nameEn: '' }) }} className="btn-ghost text-sm px-3">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Sub-muscles List */}
                {muscle.subMuscles.length === 0 ? (
                  <p className="text-neon-gray-500 text-sm">אין תתי שרירים</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {muscle.subMuscles.map((sub) => (
                      editingSubMuscle?.primaryId === muscle.id && editingSubMuscle?.subId === sub.id ? (
                        <div
                          key={sub.id}
                          className="flex items-center gap-2 px-3 py-1.5 bg-dark-surface rounded-lg border border-primary-400/50"
                        >
                          <span className="text-neon-gray-500 text-xs">({sub.id})</span>
                          <input
                            type="text"
                            placeholder="שם בעברית"
                            value={editSubMuscleForm.nameHe}
                            onChange={(e) => setEditSubMuscleForm({ ...editSubMuscleForm, nameHe: e.target.value })}
                            className="input-primary text-sm w-28 py-0.5 px-2"
                            autoFocus
                          />
                          <input
                            type="text"
                            placeholder="שם באנגלית"
                            value={editSubMuscleForm.nameEn}
                            onChange={(e) => setEditSubMuscleForm({ ...editSubMuscleForm, nameEn: e.target.value })}
                            className="input-primary text-sm w-28 py-0.5 px-2"
                          />
                          <button
                            onClick={handleSaveSubMuscleEdit}
                            className="text-green-400 hover:text-green-300 p-0.5"
                          >
                            <Save className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => { setEditingSubMuscle(null); setEditSubMuscleForm({ nameHe: '', nameEn: '' }) }}
                            className="text-red-400 hover:text-red-300 p-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div
                          key={sub.id}
                          className="flex items-center gap-2 px-3 py-1.5 bg-dark-surface rounded-lg border border-dark-border"
                        >
                          <span className="text-white text-sm">{sub.nameHe}</span>
                          <span className="text-neon-gray-500 text-xs">({sub.id})</span>
                          <button
                            onClick={() => startEditingSubMuscle(muscle.id, sub)}
                            className="text-neon-gray-400 hover:text-primary-400 p-0.5"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteSubMuscle(muscle.id, sub.id)}
                            className="text-red-400 hover:text-red-300 p-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      )
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {muscles.length === 0 && (
          <div className="empty-state">
            <span className="empty-state-icon">💪</span>
            <h3 className="empty-state-title">אין שרירים מוגדרים</h3>
            <p className="empty-state-text">לחץ על "אתחל ברירות מחדל" או הוסף שרירים באופן ידני</p>
          </div>
        )}
      </div>
    </div>
  )
}
