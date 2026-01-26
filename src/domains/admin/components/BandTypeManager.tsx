/**
 * BandTypeManager
 * Admin UI for managing global band types for assistance exercises
 */

import { useState, useEffect } from 'react'
import { Plus, Trash2, Edit2, Save, X, AlertCircle, ToggleLeft, ToggleRight } from 'lucide-react'
import {
  getBandTypes,
  addBandType,
  updateBandType,
  deleteBandType,
  toggleBandTypeActive,
} from '@/lib/firebase/bandTypes'
import type { BandType } from '@/domains/exercises/types/bands'

export default function BandTypeManager() {
  const [bandTypes, setBandTypes] = useState<BandType[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Form states
  const [newBandType, setNewBandType] = useState({
    name: '',
    description: '',
  })
  const [editForm, setEditForm] = useState<BandType | null>(null)

  useEffect(() => {
    loadBandTypes()
  }, [])

  const loadBandTypes = async () => {
    setLoading(true)
    try {
      const data = await getBandTypes()
      setBandTypes(data)
    } catch (error) {
      console.error('Error loading band types:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddBandType = async () => {
    if (!newBandType.name.trim()) {
      alert('נא למלא את שם הגומיה')
      return
    }

    try {
      await addBandType({
        name: newBandType.name,
        description: newBandType.description,
        isActive: true,
        sortOrder: bandTypes.length + 1,
      })
      setNewBandType({ name: '', description: '' })
      setShowAddForm(false)
      await loadBandTypes()
    } catch (error) {
      console.error('Error adding band type:', error)
      alert('שגיאה בהוספת גומיה')
    }
  }

  const handleDeleteBandType = async (bandTypeId: string) => {
    setDeleteError(null)

    if (!confirm('האם למחוק את סוג הגומיה?')) return

    try {
      await deleteBandType(bandTypeId)
      await loadBandTypes()
    } catch (error) {
      console.error('Error deleting band type:', error)
      setDeleteError('שגיאה במחיקת הגומיה')
    }
  }

  const handleToggleActive = async (bandType: BandType) => {
    try {
      await toggleBandTypeActive(bandType.id, !bandType.isActive)
      await loadBandTypes()
    } catch (error) {
      console.error('Error toggling active:', error)
    }
  }

  const handleSaveEdit = async () => {
    if (!editForm) return

    if (!editForm.name.trim()) {
      alert('נא למלא את שם הגומיה')
      return
    }

    try {
      await updateBandType(editForm.id, {
        name: editForm.name,
        description: editForm.description,
        sortOrder: editForm.sortOrder,
      })
      setEditingId(null)
      setEditForm(null)
      await loadBandTypes()
    } catch (error) {
      console.error('Error saving band type:', error)
      alert('שגיאה בשמירת הגומיה')
    }
  }

  const startEditing = (bandType: BandType) => {
    setEditingId(bandType.id)
    setEditForm({ ...bandType })
    setDeleteError(null)
  }

  const cancelEditing = () => {
    setEditingId(null)
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
          <h1 className="text-2xl font-bold text-white">ניהול גומיות</h1>
          <p className="text-neon-gray-400 text-sm">הגדר סוגי גומיות עזרה לתרגילים</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="btn-primary text-sm flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          הוסף גומיה
        </button>
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
          <h3 className="font-semibold text-white">הוסף גומיה חדשה</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="שם הגומיה *"
              value={newBandType.name}
              onChange={(e) => setNewBandType({ ...newBandType, name: e.target.value })}
              className="input-primary text-sm"
            />
            <input
              type="text"
              placeholder="תיאור (אופציונלי)"
              value={newBandType.description}
              onChange={(e) => setNewBandType({ ...newBandType, description: e.target.value })}
              className="input-primary text-sm"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={handleAddBandType} className="btn-primary text-sm">שמור</button>
            <button
              onClick={() => {
                setShowAddForm(false)
                setNewBandType({ name: '', description: '' })
              }}
              className="btn-ghost text-sm"
            >
              ביטול
            </button>
          </div>
        </div>
      )}

      {/* Band Types List */}
      <div className="space-y-3">
        {bandTypes.map((bandType) => (
          <div key={bandType.id} className={`card p-4 ${!bandType.isActive ? 'opacity-60' : ''}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="text-neon-gray-500 text-sm w-8">#{bandType.sortOrder}</span>
                {editingId === bandType.id && editForm ? (
                  <div className="flex items-center gap-2 flex-wrap">
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="input-primary text-sm w-40"
                      placeholder="שם הגומיה"
                    />
                    <input
                      type="text"
                      value={editForm.description || ''}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      className="input-primary text-sm w-48"
                      placeholder="תיאור"
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
                ) : (
                  <div>
                    <h3 className="font-semibold text-white">{bandType.name}</h3>
                    {bandType.description && (
                      <p className="text-neon-gray-500 text-sm">{bandType.description}</p>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {editingId === bandType.id ? (
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
                      onClick={() => handleToggleActive(bandType)}
                      className={`btn-icon ${bandType.isActive ? 'text-green-400' : 'text-neon-gray-500'}`}
                      title={bandType.isActive ? 'פעיל - לחץ להשבתה' : 'מושבת - לחץ להפעלה'}
                    >
                      {bandType.isActive ? (
                        <ToggleRight className="w-5 h-5" />
                      ) : (
                        <ToggleLeft className="w-5 h-5" />
                      )}
                    </button>
                    <button
                      onClick={() => startEditing(bandType)}
                      className="btn-icon"
                      title="ערוך"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteBandType(bandType.id)}
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

        {bandTypes.length === 0 && (
          <div className="empty-state">
            <span className="empty-state-icon">🎗️</span>
            <h3 className="empty-state-title">אין גומיות מוגדרות</h3>
            <p className="empty-state-text">לחץ על "הוסף גומיה" להוספת סוג גומיה חדש</p>
          </div>
        )}
      </div>
    </div>
  )
}
