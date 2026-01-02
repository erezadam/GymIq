import { useState, useEffect } from 'react'
import { Users, Dumbbell, User, Trash2, Crown, RefreshCw, X, Mail, Lock, UserPlus } from 'lucide-react'
import toast from 'react-hot-toast'
import { getAllUsers, updateUserRole, deleteUserFromFirestore, getUserStats } from '@/lib/firebase'
import { createUserWithEmailAndPassword, getAuth } from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/lib/firebase/config'
import type { AppUser } from '@/lib/firebase/auth'

export default function UsersList() {
  const [users, setUsers] = useState<AppUser[]>([])
  const [stats, setStats] = useState({ total: 0, admins: 0, trainers: 0, users: 0 })
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Create user modal
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    role: 'user' as 'user' | 'trainer' | 'admin',
  })
  const [creating, setCreating] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const [usersData, statsData] = await Promise.all([
        getAllUsers(),
        getUserStats(),
      ])
      setUsers(usersData)
      setStats(statsData)
    } catch (error) {
      console.error('Error loading users:', error)
      toast.error('שגיאה בטעינת משתמשים')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleRoleChange = async (userId: string, newRole: 'user' | 'trainer' | 'admin') => {
    setActionLoading(userId)
    try {
      await updateUserRole(userId, newRole)
      setUsers((prev) =>
        prev.map((u) => (u.uid === userId ? { ...u, role: newRole } : u))
      )
      // Update stats
      loadData()
      toast.success('התפקיד עודכן בהצלחה')
    } catch (error) {
      console.error('Error updating role:', error)
      toast.error('שגיאה בעדכון התפקיד')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async (user: AppUser) => {
    if (!confirm(`האם למחוק את המשתמש ${user.displayName || user.email}?\n\nשים לב: המשתמש יימחק מ-Firestore אך יישאר ב-Firebase Auth.`)) return

    setActionLoading(user.uid)
    try {
      await deleteUserFromFirestore(user.uid)
      setUsers((prev) => prev.filter((u) => u.uid !== user.uid))
      loadData()
      toast.success('המשתמש נמחק מהמערכת')
    } catch (error) {
      console.error('Error deleting user:', error)
      toast.error('שגיאה במחיקת המשתמש')
    } finally {
      setActionLoading(null)
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newUser.email || !newUser.password || !newUser.firstName) {
      toast.error('נא למלא את כל השדות')
      return
    }

    if (newUser.password.length < 6) {
      toast.error('הסיסמה חייבת להכיל לפחות 6 תווים')
      return
    }

    setCreating(true)
    try {
      // Create user in Firebase Auth
      const auth = getAuth()
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        newUser.email,
        newUser.password
      )

      // Create user document in Firestore
      const userRef = doc(db, 'users', userCredential.user.uid)
      await setDoc(userRef, {
        uid: userCredential.user.uid,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        displayName: `${newUser.firstName} ${newUser.lastName}`.trim(),
        role: newUser.role,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      toast.success(`משתמש ${newUser.email} נוצר בהצלחה!`)
      setShowCreateModal(false)
      setNewUser({ email: '', password: '', firstName: '', lastName: '', role: 'user' })
      loadData()
    } catch (error: any) {
      console.error('Error creating user:', error)
      if (error.code === 'auth/email-already-in-use') {
        toast.error('כתובת האימייל כבר בשימוש')
      } else if (error.code === 'auth/weak-password') {
        toast.error('הסיסמה חלשה מדי')
      } else {
        toast.error('שגיאה ביצירת המשתמש')
      }
    } finally {
      setCreating(false)
    }
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'trainer':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('he-IL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">ניהול משתמשים</h1>
          <p className="text-text-muted mt-1">צפייה וניהול משתמשי המערכת</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-dark-card hover:bg-dark-border rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            רענן
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-primary text-white rounded-lg hover:shadow-neon transition-all"
          >
            <UserPlus className="w-4 h-4" />
            משתמש חדש
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-neon !p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-400/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">{stats.total}</p>
              <p className="text-text-muted text-sm">סה"כ משתמשים</p>
            </div>
          </div>
        </div>

        <div className="card-neon !p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-yellow-400/20 flex items-center justify-center">
              <Crown className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">{stats.admins}</p>
              <p className="text-text-muted text-sm">מנהלים</p>
            </div>
          </div>
        </div>

        <div className="card-neon !p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-400/20 flex items-center justify-center">
              <Dumbbell className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">{stats.trainers}</p>
              <p className="text-text-muted text-sm">מאמנים</p>
            </div>
          </div>
        </div>

        <div className="card-neon !p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-400/20 flex items-center justify-center">
              <User className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">{stats.users}</p>
              <p className="text-text-muted text-sm">משתמשים רגילים</p>
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="card-neon !p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-400"></div>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-text-muted mx-auto mb-4" />
            <p className="text-text-muted mb-4">אין משתמשים רשומים</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="text-primary-400 hover:underline"
            >
              צור משתמש ראשון
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-admin">
              <thead>
                <tr>
                  <th>משתמש</th>
                  <th>אימייל</th>
                  <th>תפקיד</th>
                  <th>הצטרף</th>
                  <th>פעולות</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.uid}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center flex-shrink-0">
                          <span className="text-white font-medium">
                            {user.firstName?.charAt(0) || user.email?.charAt(0)?.toUpperCase() || '?'}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-text-primary truncate">
                            {user.displayName || `${user.firstName} ${user.lastName}`.trim() || 'ללא שם'}
                          </p>
                          <p className="text-xs text-text-muted font-mono">{user.uid.slice(0, 12)}...</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="text-text-secondary">{user.email}</span>
                    </td>
                    <td>
                      <select
                        value={user.role}
                        onChange={(e) =>
                          handleRoleChange(user.uid, e.target.value as 'user' | 'trainer' | 'admin')
                        }
                        disabled={actionLoading === user.uid}
                        className={`px-3 py-1.5 rounded-lg border text-sm font-medium cursor-pointer transition-colors ${getRoleBadge(user.role)}`}
                      >
                        <option value="user">👤 משתמש</option>
                        <option value="trainer">🏋️ מאמן</option>
                        <option value="admin">👑 מנהל</option>
                      </select>
                    </td>
                    <td className="text-text-muted text-sm whitespace-nowrap">
                      {formatDate(user.createdAt)}
                    </td>
                    <td>
                      <button
                        onClick={() => handleDelete(user)}
                        disabled={actionLoading === user.uid}
                        className="p-2 text-text-muted hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors disabled:opacity-50"
                        title="מחק משתמש"
                      >
                        {actionLoading === user.uid ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="bg-dark-surface border border-dark-border rounded-2xl w-full max-w-md shadow-xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-dark-border">
              <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-primary-400" />
                יצירת משתמש חדש
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 text-text-muted hover:text-text-primary hover:bg-dark-card rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              {/* Name Fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    שם פרטי *
                  </label>
                  <input
                    type="text"
                    value={newUser.firstName}
                    onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
                    placeholder="ישראל"
                    className="input-neon w-full !py-3"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-2">
                    שם משפחה
                  </label>
                  <input
                    type="text"
                    value={newUser.lastName}
                    onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
                    placeholder="ישראלי"
                    className="input-neon w-full !py-3"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  אימייל *
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    placeholder="user@example.com"
                    dir="ltr"
                    className="input-neon w-full !py-3 !pl-12 text-left"
                    required
                  />
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  סיסמה * (לפחות 6 תווים)
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    placeholder="••••••"
                    dir="ltr"
                    className="input-neon w-full !py-3 !pl-12 text-left"
                    required
                    minLength={6}
                  />
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                </div>
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-2">
                  תפקיד
                </label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value as 'user' | 'trainer' | 'admin' })}
                  className="input-neon w-full !py-3 cursor-pointer"
                >
                  <option value="user">👤 משתמש רגיל</option>
                  <option value="trainer">🏋️ מאמן</option>
                  <option value="admin">👑 מנהל מערכת</option>
                </select>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={creating}
                className="btn-neon w-full !py-3 flex items-center justify-center gap-2"
              >
                {creating ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    יוצר משתמש...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-5 h-5" />
                    צור משתמש
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
