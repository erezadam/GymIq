import { useState, useEffect } from 'react'
import { Plus, Trash2, Edit2, Save, X, AlertCircle, RefreshCw } from 'lucide-react'
import {
  getEquipment,
  saveEquipment,
  addEquipment,
  deleteEquipment,
  initializeEquipment,
  isEquipmentInUse,
  syncMissingEquipment,
  type Equipment,
} from '@/lib/firebase/equipment'

export default function EquipmentManager() {
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([])
  const [loading, setLoading] = useState(true)
  const [editingEquipment, setEditingEquipment] = useState<string | null>(null)
  const [showAddEquipment, setShowAddEquipment] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Form states
  const [newEquipment, setNewEquipment] = useState({ id: '', nameHe: '', nameEn: '', order: 1 })
  const [editForm, setEditForm] = useState<Equipment | null>(null)

  useEffect(() => {
    loadEquipment()
  }, [])

  const loadEquipment = async () => {
    setLoading(true)
    try {
      const data = await getEquipment()
      setEquipmentList(data)
    } catch (error) {
      console.error('Error loading equipment:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInitialize = async () => {
    if (confirm('האם לאתחל את רשימת הציוד עם ברירות מחדל?')) {
      try {
        await initializeEquipment()
        await loadEquipment()
      } catch (error) {
        console.error('Error initializing:', error)
      }
    }
  }

  const handleSyncMissing = async () => {
    try {
      setLoading(true)
      const addedCount = await syncMissingEquipment()
      if (addedCount > 0) {
        alert(`נוספו ${addedCount} פריטי ציוד חסרים`)
      } else {
        alert('כל הציוד כבר קיים')
      }
      await loadEquipment()
    } catch (error) {
      console.error('Error syncing:', error)
      alert('שגיאה בסנכרון ציוד')
    } finally {
      setLoading(false)
    }
  }

  const handleAddEquipment = async () => {
    if (!newEquipment.id || !newEquipment.nameHe) {
      alert('נא למלא מזהה ושם בעברית')
      return
    }

    // Check for duplicate ID
    if (equipmentList.some(eq => eq.id === newEquipment.id)) {
      alert('מזהה זה כבר קיים במערכת')
      return
    }

    try {
      await addEquipment({
        id: newEquipment.id,
        nameHe: newEquipment.nameHe,
        nameEn: newEquipment.nameEn || newEquipment.id,
        order: newEquipment.order || equipmentList.length + 1,
      })
      setNewEquipment({ id: '', nameHe: '', nameEn: '', order: equipmentList.length + 2 })
      setShowAddEquipment(false)
      await loadEquipment()
    } catch (error) {
      console.error('Error adding equipment:', error)
    }
  }

  const handleDeleteEquipment = async (equipmentId: string) => {
    setDeleteError(null)

    // Check if equipment is in use
    const { inUse, count } = await isEquipmentInUse(equipmentId)

    if (inUse) {
      setDeleteError(`לא ניתן למחוק ציוד זה - הוא משמש ${count} תרגילים`)
      return
    }

    if (!confirm('האם למחוק את הציוד?')) return

    try {
      await deleteEquipment(equipmentId)
      await loadEquipment()
    } catch (error) {
      console.error('Error deleting equipment:', error)
    }
  }

  const handleSaveEdit = async () => {
    if (!editForm) return

    if (!editForm.nameHe || !editForm.nameEn) {
      alert('נא למלא את כל השדות')
      return
    }

    try {
      await saveEquipment(editForm)
      setEditingEquipment(null)
      setEditForm(null)
      await loadEquipment()
    } catch (error) {
      console.error('Error saving equipment:', error)
    }
  }

  const startEditing = (equipment: Equipment) => {
    setEditingEquipment(equipment.id)
    setEditForm({ ...equipment })
    setDeleteError(null)
  }

  const cancelEditing = () => {
    setEditingEquipment(null)
    setEditForm(null)
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
          <h1 className="text-2xl font-bold text-white">ניהול ציוד</h1>
          <p className="text-neon-gray-400 text-sm">הגדר סוגי ציוד לאימונים</p>
        </div>
        <div className="flex gap-2">
          {equipmentList.length === 0 && (
            <button onClick={handleInitialize} className="btn-secondary text-sm">
              אתחל ברירות מחדל
            </button>
          )}
          <button onClick={handleSyncMissing} className="btn-secondary text-sm flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            סנכרן ציוד חסר
          </button>
          <button onClick={() => setShowAddEquipment(true)} className="btn-primary text-sm flex items-center gap-2">
            <Plus className="w-4 h-4" />
            הוסף ציוד
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

      {/* Add Equipment Form */}
      {showAddEquipment && (
        <div className="card p-4 space-y-4">
          <h3 className="font-semibold text-white">הוסף ציוד חדש</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <input
              type="text"
              placeholder="מזהה (אנגלית)"
              value={newEquipment.id}
              onChange={(e) => setNewEquipment({ ...newEquipment, id: e.target.value.toLowerCase().replace(/\s/g, '_') })}
              className="input-primary text-sm"
            />
            <input
              type="text"
              placeholder="שם בעברית *"
              value={newEquipment.nameHe}
              onChange={(e) => setNewEquipment({ ...newEquipment, nameHe: e.target.value })}
              className="input-primary text-sm"
            />
            <input
              type="text"
              placeholder="שם באנגלית"
              value={newEquipment.nameEn}
              onChange={(e) => setNewEquipment({ ...newEquipment, nameEn: e.target.value })}
              className="input-primary text-sm"
            />
            <input
              type="number"
              placeholder="סדר תצוגה"
              value={newEquipment.order}
              onChange={(e) => setNewEquipment({ ...newEquipment, order: parseInt(e.target.value) || 1 })}
              className="input-primary text-sm"
              min="1"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={handleAddEquipment} className="btn-primary text-sm">שמור</button>
            <button onClick={() => { setShowAddEquipment(false); setNewEquipment({ id: '', nameHe: '', nameEn: '', order: equipmentList.length + 1 }) }} className="btn-ghost text-sm">ביטול</button>
          </div>
        </div>
      )}

      {/* Equipment List */}
      <div className="space-y-3">
        {equipmentList.map((equipment) => (
          <div key={equipment.id} className="card p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-neon-gray-500 text-sm w-8">#{equipment.order}</span>
                {editingEquipment === equipment.id && editForm ? (
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
                      value={editForm.order}
                      onChange={(e) => setEditForm({ ...editForm, order: parseInt(e.target.value) || 1 })}
                      className="input-primary text-sm w-20"
                      placeholder="סדר"
                      min="1"
                    />
                  </div>
                ) : (
                  <div>
                    <h3 className="font-semibold text-white">{equipment.nameHe}</h3>
                    <p className="text-neon-gray-500 text-sm">{equipment.nameEn} • {equipment.id}</p>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {editingEquipment === equipment.id ? (
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
                      onClick={() => startEditing(equipment)}
                      className="btn-icon"
                      title="ערוך"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteEquipment(equipment.id)}
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

        {equipmentList.length === 0 && (
          <div className="empty-state">
            <span className="empty-state-icon">🏋️</span>
            <h3 className="empty-state-title">אין ציוד מוגדר</h3>
            <p className="empty-state-text">לחץ על "אתחל ברירות מחדל" או הוסף ציוד באופן ידני</p>
          </div>
        )}
      </div>
    </div>
  )
}
